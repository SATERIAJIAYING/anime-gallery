#!/usr/bin/env python3
"""Generate js/data.js from js-gallery.tmp.json + seeds.json."""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
m = json.load(open(os.path.join(ROOT, "js-gallery.tmp.json"), encoding="utf-8"))
seeds = json.load(open(os.path.join(ROOT, "seeds.json"), encoding="utf-8"))

hexish = re.compile(r"^[0-9a-f]{16,}$")
extra_tags = {
    "01_sayo_hina.jpg": ["动漫少女", "姐妹", "电吉他", "贝斯", "背靠背", "乐队", "梦幻背景", "舞台演出"],
}
for i, item in enumerate(m, 1):
    orig = item["original"]
    if hexish.match(item["title"].lower()):
        item["title"] = f"收藏 #{i:02d}"
    else:
        item["title"] = item["title"].replace("resized_", "").strip() or f"收藏 #{i:02d}"
    if orig in extra_tags:
        item["tags"] = sorted(set(item["tags"] + extra_tags[orig]))
    item.pop("original", None)
    item.pop("bytes", None)

out = os.path.join(ROOT, "js", "data.js")
with open(out, "w", encoding="utf-8") as fp:
    fp.write("// 画廊清单(自动生成)与推荐种子数据(由 scripts/gen_data.py 生成)\n")
    fp.write("window.GALLERY = " + json.dumps(m, ensure_ascii=False) + ";\n")
    fp.write("window.SEED_RECS = " + json.dumps(seeds, ensure_ascii=False) + ";\n")
print("data.js written:", len(m), "gallery items,", len(seeds), "seeds")
os.remove(os.path.join(ROOT, "js-gallery.tmp.json"))
