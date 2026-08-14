#!/usr/bin/env python3
"""Regenerate js/data.js: gallery list from the existing js/data.js, seeds from seeds.json.

Idempotent — safe to re-run any time after you edit seeds.json.
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "js", "data.js")

# 1) keep the current gallery manifest from js/data.js
text = open(DATA, encoding="utf-8").read()
m = re.search(r"window\.GALLERY\s*=\s*(\[.*?\]);", text, re.S)
if not m:
    raise SystemExit("js/data.js does not contain window.GALLERY; cannot regenerate")
gallery = json.loads(m.group(1))

# 2) read seeds
with open(os.path.join(ROOT, "seeds.json"), encoding="utf-8") as fp:
    seeds = json.load(fp)

with open(DATA, "w", encoding="utf-8") as fp:
    fp.write("// 画廊清单与推荐种子数据(由 scripts/gen_data.py 生成,请勿手改;种子请改 seeds.json)\n")
    fp.write("window.GALLERY = " + json.dumps(gallery, ensure_ascii=False) + ";\n")
    fp.write("window.SEED_RECS = " + json.dumps(seeds, ensure_ascii=False) + ";\n")
print(f"data.js written: {len(gallery)} gallery items, {len(seeds)} seeds")
