#!/usr/bin/env python3
"""管理推荐种子(seeds.json):按 bgm.tv 条目 ID 增删动画,并自动重新生成 js/data.js。

用法:
  python3 scripts/manage_seeds.py list
  python3 scripts/manage_seeds.py add 400602 328609          # 按 bangumi.tv 条目 ID 添加
  python3 scripts/manage_seeds.py remove 400602              # 按 ID 移除

ID 怎么找:在 https://bgm.tv 搜索动画,打开条目页,网址中的数字就是 ID
(https://bgm.tv/subject/<ID>)。也可以用本脚本 add 前先 list 看现有条目。

网络:需要能访问 api.bgm.tv(国内需开代理;本脚本自动使用系统代理)。
"""
import json, os, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEEDS = os.path.join(ROOT, "seeds.json")

def api_get(path):
    req = urllib.request.Request(
        "https://api.bgm.tv" + path,
        headers={"User-Agent": "anime-gallery/1.0 (seeds manager)"},
    )
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.load(r)

def load():
    with open(SEEDS, encoding="utf-8") as f:
        return json.load(f)

def save(seeds):
    with open(SEEDS, "w", encoding="utf-8") as f:
        json.dump(seeds, f, ensure_ascii=False, indent=2)
    import subprocess
    subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "gen_data.py")], check=True)

def to_seed(d):
    return {
        "id": d["id"],
        "name": d.get("name") or "",
        "name_cn": d.get("name_cn") or "",
        "date": d.get("date") or "",
        "score": (d.get("rating") or {}).get("score"),
        "rank": (d.get("rating") or {}).get("rank"),
        "type": d.get("type"),
        "platform": d.get("platform"),
        "summary": (d.get("summary") or "")[:400],
        "cover": (d.get("images") or {}).get("large") or "",
        "tags": [t["name"] for t in (d.get("tags") or [])[:5]],
    }

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return
    cmd = sys.argv[1]
    ids = [int(x) for x in sys.argv[2:]]
    seeds = load()

    if cmd == "list":
        for s in seeds:
            print(f"{s['id']:>7}  {s.get('name_cn') or s.get('name')}  [{s.get('date','')}]  ★{s.get('score')}")
        print(f"\n共 {len(seeds)} 部")
        return

    if cmd == "add":
        for sid in ids:
            if any(s["id"] == sid for s in seeds):
                print(f"跳过 {sid}:已在清单中")
                continue
            try:
                d = api_get(f"/v0/subjects/{sid}")
            except Exception as e:
                print(f"添加 {sid} 失败(检查网络/代理):{e}")
                continue
            if d.get("type") != 2:
                print(f"跳过 {sid}:不是动画条目(type={d.get('type')})")
                continue
            seeds.append(to_seed(d))
            print(f"已添加 {sid} {d.get('name_cn') or d.get('name')} [{d.get('date','')}] ★{d.get('rating',{}).get('score')}")
        save(seeds)
        return

    if cmd == "remove":
        kept = []
        for s in seeds:
            if s["id"] in ids:
                print(f"已移除 {s['id']} {s.get('name_cn') or s.get('name')}")
            else:
                kept.append(s)
        if len(kept) < len(seeds):
            save(kept)
        else:
            print("未找到对应 ID,清单未变")
        return

    print(__doc__)

if __name__ == "__main__":
    main()
