import json
from pathlib import Path
P = Path("n8n/workflows/disasterai.json")
wf = json.loads(P.read_text(encoding="utf-8"))
for n in wf["nodes"]:
    if n["name"] == "Gaps to fill?":
        n["parameters"]["conditions"]["conditions"][0]["leftValue"] = "={{ !$json._failed }}"
    if n["name"] == "Gap search":
        c = n["parameters"]["jsCode"]
        old = "const gaps = (prev.knowledge.gaps || []).slice(0, 3);"
        new = ("const facts = ($('Incident ready').first().json.reported_facts || []).map(String);\n"
               "const gaps = [...facts, ...(prev.knowledge.gaps || [])].slice(0, 4);")
        assert old in c
        n["parameters"]["jsCode"] = c.replace(old, new)
        print("patched Gap search")
P.write_text(json.dumps(wf, indent=2, ensure_ascii=False), encoding="utf-8")