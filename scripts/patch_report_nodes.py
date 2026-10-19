import json
from pathlib import Path

P = Path("n8n/workflows/disasterai.json")
wf = json.loads(P.read_text(encoding="utf-8"))

FINALIZE = r"""
function finalizeReport(r, ctx, rk) {
  const fr = ctx.output_language === 'fr';
  const DIS = fr
    ? "Ce rapport est une aide à la décision produite par un prototype d'IA. Il ne remplace pas les services d'urgence et ne constitue pas une décision officielle. L'échelle de gravité est une échelle de travail de ce prototype."
    : "This report is a decision-support output from an AI prototype. It does not replace emergency services and is not an official emergency decision. The severity scale is a working scale of this prototype.";
  r.language = fr ? 'fr' : 'en';
  r.image_status = ctx.image_status;
  r.location = (ctx.incident.location && ctx.incident.location.text) || null;
  r.severity = rk.severity || r.severity || 'undetermined';
  r.summary = r.summary || '';
  r.reported = r.reported || [];
  r.observed = r.observed || [];
  r.knowledge = r.knowledge || { coverage: 'none', guidance: [], no_guidance_statement: null };
  r.knowledge.guidance = r.knowledge.guidance || [];
  r.assessment = r.assessment || {};
  for (const k of ['basis', 'risks', 'possibly_affected', 'conflicts']) r.assessment[k] = r.assessment[k] || [];
  r.recommendations = r.recommendations || [];
  r.uncertainties = r.uncertainties || [];
  r.information_needed = r.information_needed || [];
  r.disclaimer = DIS;
  const T = fr
    ? { h: "Évaluation préliminaire de l'incident", s: 'Résumé', a: '1. Ce qui a été signalé', b: "2. Ce qui a été observé dans l'image", c: '3. Informations de la base de connaissances', d: '4. Évaluation du système', e: '5. Informations manquantes et incertitudes', ab: 'À propos de ce rapport', loc: 'Lieu', none: 'Non précisé', noimg: "Aucune image n'a été analysée.", risks: 'Risques', aff: 'Éléments possiblement touchés', conf: 'Conflits' }
    : { h: 'Preliminary incident assessment', s: 'Summary', a: '1. What was reported', b: '2. What was observed in the image', c: '3. Relevant information from the knowledge base', d: '4. System assessment', e: '5. Missing information and uncertainties', ab: 'About this report', loc: 'Location', none: 'Not stated', noimg: 'No image was analysed.', risks: 'Risks', aff: 'Possibly affected', conf: 'Conflicts' };
  const li = (arr, f) => (arr && arr.length ? arr.map(x => '- ' + f(x)).join('\n') : '- -');
  const k = r.knowledge, a = r.assessment;
  r.report_markdown = [
    '# ' + T.h,
    'Generated: ' + (ctx.generated_at || new Date().toISOString()),
    'Incident type: ' + (ctx.incident.incident_type || '-') + ' | ' + T.loc + ': ' + (r.location || T.none) + ' | Severity (system assessment): ' + r.severity,
    '\n## ' + T.s + '\n' + r.summary,
    '\n## ' + T.a + '\n' + li(r.reported, x => x.text + ' (reported)'),
    '\n## ' + T.b + '\n' + (r.observed.length ? li(r.observed, x => x.text + ' [' + x.confidence + ']') : T.noimg),
    '\n## ' + T.c + '\n' + li(k.guidance, x => x.text + ' [' + x.entry_id + ']') + (k.no_guidance_statement ? '\n\n' + k.no_guidance_statement : ''),
    '\n## ' + T.d + '\n**' + T.risks + '**\n' + li(a.risks, x => x.text) + '\n\n**' + T.aff + '**\n' + li(a.possibly_affected, x => x.text) + '\n\n**' + T.conf + '**\n' + li(a.conflicts, x => x),
    '\n## ' + T.e + '\n' + li([...r.uncertainties, ...r.information_needed], x => x),
    '\n## ' + T.ab + '\n' + DIS
  ].join('\n');
  return r;
}
"""

OLD = "return [{ json: { report: r.value, degraded_d: [], _failed: false } }];"
NEW = ("const ctx = $('Assemble context').first().json;\n"
       "const rk = $('Risk ready').first().json.risk;\n"
       "const fixed = finalizeReport(r.value, ctx, rk);\n"
       "return [{ json: { report: fixed, degraded_d: [], _failed: false } }];")

TARGETS = {"Parse report", "Parse report (retry)", "Parse repaired report", "Parse repaired report (retry)"}
done = 0
for n in wf["nodes"]:
    if n["name"] in TARGETS:
        code = n["parameters"]["jsCode"]
        assert OLD in code, n["name"]
        n["parameters"]["jsCode"] = FINALIZE + "\n" + code.replace(OLD, NEW)
        done += 1
assert done == 4, done
P.write_text(json.dumps(wf, indent=2, ensure_ascii=False), encoding="utf-8")
print("patched", done, "nodes")