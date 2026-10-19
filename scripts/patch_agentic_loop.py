import json, copy, uuid
from pathlib import Path

P = Path("n8n/workflows/disasterai.json")
wf = json.loads(P.read_text(encoding="utf-8"))
nodes = {n["name"]: n for n in wf["nodes"]}
conns = wf["connections"]
uid = lambda: str(uuid.uuid4())

if "Gaps to fill?" in nodes:
    raise SystemExit("already patched")

READ = r"""
function readModel(j) {
  if (j.error) return { err: 'request failed: ' + String(j.error.message || JSON.stringify(j.error)).slice(0, 200) };
  let t;
  try { t = j.candidates[0].content.parts[0].text; } catch (e) { return { err: 'no text in the answer' }; }
  t = String(t).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return { value: JSON.parse(t) }; } catch (e) { return { err: 'invalid JSON from the model' }; }
}
"""

def code(name, js, pos):
    return {"parameters": {"jsCode": js}, "id": uid(), "name": name, "type": "n8n-nodes-base.code", "typeVersion": 2, "position": pos}

# 1. condition node (cloned from an existing IF)
gaps_if = copy.deepcopy(nodes["Any passages?"])
gaps_if.update(id=uid(), name="Gaps to fill?", position=[7540, 900])
gaps_if["parameters"]["conditions"]["conditions"][0]["leftValue"] = \
    "={{ !$json._failed && $json.knowledge.coverage !== 'good' && ($json.knowledge.gaps || []).length > 0 }}"

# 2. gap search: one query per gap, merged with the first-pass passages
gap_search = code("Gap search", r"""
const prev = $('Knowledge ready').first().json;
const base = $('Merge passages').first().json;
const topic = $('Incident ready').first().json.rag_topic;
const url = $('Config').first().json.rag_url + '/search';
const gaps = (prev.knowledge.gaps || []).slice(0, 3);
const have = new Set(base.passages.map(p => p.chunk_id));
const fresh = {};
for (const g of gaps) {
  try {
    const res = await this.helpers.httpRequest({ method: 'POST', url, json: true, timeout: 30000, body: { query: String(g).slice(0, 200), k: 4, topic, strategy: 'section' } });
    for (const r of (res.results || [])) if (!have.has(r.chunk_id) && (!fresh[r.chunk_id] || r.score > fresh[r.chunk_id].score)) fresh[r.chunk_id] = r;
  } catch (e) { /* a failed search just adds nothing */ }
}
const added = Object.values(fresh).sort((a, b) => b.score - a.score).slice(0, 4);
const passages = [...base.passages, ...added];
return [{ json: { passages, new_count: added.length, gaps, retrieval: { topic, results: passages } } }];
""", [7800, 900])

new_if = copy.deepcopy(nodes["Any passages?"])
new_if.update(id=uid(), name="New passages found?", position=[8060, 900])
new_if["parameters"]["conditions"]["conditions"][0]["leftValue"] = "={{ $json.new_count > 0 }}"

# 3. second-pass knowledge prompt (same agent, same prompt, plus the gaps and the merged passages)
p2 = copy.deepcopy(nodes["Prompt knowledge v2"])
p2.update(id=uid(), name="Prompt knowledge pass 2", position=[8320, 840])
for a in p2["parameters"]["assignments"]["assignments"]:
    if a["name"] == "system":
        a["value"] += "\n\nSecond pass: some passages were retrieved specifically to fill the gaps listed in <first_pass_gaps>. Use them where they apply. The same rules hold."
    if a["name"] == "user":
        a["value"] = (r'={{ "<incident_json>\n" + (JSON.stringify((({_degraded, ...r}) => r)($(\'Incident ready\').first().json))) + "\n</incident_json>\n\n'
                      r'<first_pass_gaps>\n" + JSON.stringify($(\'Knowledge ready\').first().json.knowledge.gaps) + "\n</first_pass_gaps>\n\n'
                      r'<retrieved_passages>\n" + JSON.stringify($(\'Gap search\').first().json.passages) + "\n</retrieved_passages>" }}')
    if a["name"] == "prompt_file":
        a["value"] = "prompts/rag_query/v2_synthesis.md (+ second pass)"

llm2 = copy.deepcopy(nodes["LLM: knowledge"])
llm2.update(id=uid(), name="LLM: knowledge pass 2", position=[8580, 840])

parse2 = code("Parse knowledge pass 2", READ + r"""
const g = $('Gap search').first().json;
const prev = $('Knowledge ready').first().json;
const keep = (why) => [{ json: { ...prev, degraded_b: [...(prev.degraded_b || []), { step: 'agentic re-query', reason: why }] } }];
const entries = {};
for (const p of g.passages) entries[p.chunk_id] = p.entry_ids || [];
const r = readModel($input.first().json);
let k = r.value;
const RANK = { none: 0, partial: 1, good: 2 };
if (r.err || !k || !Array.isArray(k.relevant_guidance) || !Array.isArray(k.gaps) || !(k.coverage in RANK)) return keep(r.err || 'second pass did not match the contract, first pass kept');
k.relevant_guidance = k.relevant_guidance.filter(x => x && x.citation && (entries[x.citation.chunk_id] || []).includes(x.citation.entry_id));
if (!k.relevant_guidance.length || RANK[k.coverage] < RANK[prev.knowledge.coverage]) return keep('second pass was not better, first pass kept');
k.requery = { first_pass_gaps: prev.knowledge.gaps, new_chunks: g.new_count, coverage_before: prev.knowledge.coverage };
const x = $('LLM: knowledge pass 2').first().json.x_llm || {};
const llm = { step: 'knowledge (re-query)', provider: x.provider, model: x.model, seconds: x.seconds, failed_attempts: [] };
return [{ json: { knowledge: k, retrieval: g.retrieval, degraded_b: prev.degraded_b || [], _llm: llm } }];
""", [8840, 840])

keep1 = code("Keep first pass", "return [{ json: $('Knowledge ready').first().json }];", [8320, 1000])

for n in (gaps_if, gap_search, new_if, p2, llm2, parse2, keep1):
    wf["nodes"].append(n)

def link(a, targets):
    conns[a] = {"main": [[{"node": t, "type": "main", "index": i} for t, i in branch] for branch in targets]}

link("Knowledge ready", [[("Gaps to fill?", 0)]])
link("Gaps to fill?", [[("Gap search", 0)], [("Keep first pass", 0)]])
link("Gap search", [[("New passages found?", 0)]])
link("New passages found?", [[("Prompt knowledge pass 2", 0)], [("Keep first pass", 0)]])
link("Prompt knowledge pass 2", [[("LLM: knowledge pass 2", 0)]])
link("LLM: knowledge pass 2", [[("Parse knowledge pass 2", 0)]])
link("Parse knowledge pass 2", [[("Wait for both branches", 1)]])
link("Keep first pass", [[("Wait for both branches", 1)]])

# the models table must list the second-pass model too
for n in wf["nodes"]:
    if n["name"] in ("Build response", "Build response (after repair)", "Degraded response"):
        c = n["parameters"]["jsCode"]
        if "'Knowledge re-query'" not in c:
            n["parameters"]["jsCode"] = c.replace(
                "const models = [];",
                "const models = [];\ntry { const kp = $('Wait for both branches').first().json._llm; if (kp && kp.step === 'knowledge (re-query)') models.push(kp); } catch (e) {} // 'Knowledge re-query'")

P.write_text(json.dumps(wf, indent=2, ensure_ascii=False), encoding="utf-8")
print("agentic loop added, nodes:", len(wf["nodes"]))