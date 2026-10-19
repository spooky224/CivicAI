import json
from pathlib import Path
P = Path("n8n/workflows/disasterai.json")
wf = json.loads(P.read_text(encoding="utf-8"))

EXPR = r"""={{ "<incident_json>\n" + (JSON.stringify((({_degraded, ...r}) => r)($('Incident ready').first().json))) + "\n</incident_json>\n\n<first_pass_gaps>\n" + JSON.stringify($('Knowledge ready').first().json.knowledge.gaps) + "\n</first_pass_gaps>\n\n<retrieved_passages>\n" + JSON.stringify($('Gap search').first().json.passages) + "\n</retrieved_passages>" }}"""

for n in wf["nodes"]:
    if n["name"] == "Prompt knowledge pass 2":
        for a in n["parameters"]["assignments"]["assignments"]:
            if a["name"] == "user":
                a["value"] = EXPR
                print("fixed")
P.write_text(json.dumps(wf, indent=2, ensure_ascii=False), encoding="utf-8")