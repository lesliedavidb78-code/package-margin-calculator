# -*- coding: utf-8 -*-
"""从《萍姐锅底成本卡（新）2025.07.12》生成 4 个锅型 × 全部清汤组合 → pot-data.js
成本口径：单份成本 = Σ单份成本 + Σ单份运费（38cm鸳鸯红汤 27.6129 ≈ 官网 27.61，校验通过）
售价口径：上蔡店菜单_20260925确定版 —— 鸳鸯=鸳鸯牛油红锅39+清汤加料；奔驰(三味)=三味牛油红锅34+两款清汤加料
"""
import openpyxl, json, itertools

SRC = r"D:/Agent/WorkBuddy/06-Downloads/pot-sop/pot_cost.xlsx"
OUT = "pot-data.js"
SIDES = ["酸汤", "鸡汤", "番茄", "菌汤", "三鲜"]
KEY = [("红汤", "重庆牛油红汤"), ("酸汤", "酸汤"), ("鸡汤", "鸡汤"),
       ("番茄", "番茄"), ("菌汤", "野生菌"), ("三鲜", "三鲜")]

wb = openpyxl.load_workbook(SRC, data_only=True)

def parse_sheet(ws):
    """逐成本卡块累加：单份成本 + 单份运费"""
    blocks, cur, hdr = {}, None, None
    for r in ws.iter_rows(values_only=True):
        vals = [("" if c is None else str(c).strip()) for c in r]
        joined = " | ".join(v for v in vals if v)
        if not joined:
            continue
        # 块标题：该行含任一关键物料名，且不含表头/物料数据
        if "物料编码" not in joined and any(tok in joined for _, tok in KEY) and len(joined) < 60:
            tag = next(t for t, tok in KEY if tok in joined)
            # 标题可能连续出现两个（如红汤块内提到别的名字）→ 用未占用的 tag
            if tag not in blocks:
                cur = tag
                blocks[cur] = {"cost": 0.0, "freight": 0.0}
                hdr = None
                continue
        if cur is None:
            continue
        if "物料编码" in joined:
            hdr = vals
            continue
        if hdr is None:
            continue
        def col(*names):
            for nm in names:
                if nm in hdr:
                    return hdr.index(nm)
            return None
        i_cost, i_free = col("单份成本（元）"), col("单份运费（元）")
        if i_cost is None:
            continue
        try:
            blocks[cur]["cost"] += float(vals[i_cost]) if vals[i_cost] else 0.0
        except ValueError:
            continue
        if i_free is not None:
            try:
                blocks[cur]["freight"] += float(vals[i_free]) if vals[i_free] else 0.0
            except ValueError:
                pass
    return blocks

C = {}
for key, sh in [("38yy","38cm鸳鸯锅"), ("42yy","42cm鸳鸯锅"),
                ("38benz","38cm奔驰锅"), ("42benz","42奔驰锅")]:
    raw = parse_sheet(wb[sh])
    C[key] = {k: round(v["cost"] + v["freight"], 6) for k, v in raw.items()}
    print(f"{key:8s} {C[key]}")

# ---- 售价口径（上蔡店菜单_20260925确定版，灵魂锅底区）----
# 鸳鸯锅 = 鸳鸯牛油红锅 39 + 清汤加料（酸汤19 / 鸡汤·菌汤·番茄·三鲜各10）
# 奔驰锅（三味三格）= 三味牛油红锅 34 + 两格清汤加料（酸汤15 / 其余各9）
YY_RED, BEN_RED = 39, 34
YY_SIDE  = {"酸汤": 19, "鸡汤": 10, "番茄": 10, "菌汤": 10, "三鲜": 10}
BEN_SIDE = {"酸汤": 15, "鸡汤": 9,  "番茄": 9,  "菌汤": 9,  "三鲜": 9}
# 成本卡"建议售价"（用于对照，反映红汤已低于建议零售价）
YY_CARD = {"红汤": {"38": 30, "42": 42}, "酸汤": {"38": 16, "42": 26},
           "鸡汤": {"38": 12, "42": 16}, "番茄": {"38": 12, "42": 16},
           "菌汤": {"38": 12, "42": 16}, "三鲜": {"38": 12, "42": 16}}
BEN_CARD = {"红汤": {"38": 20, "42": 30}, "酸汤": {"38": 13, "42": 13},
            "鸡汤": {"38": 9, "42": 9}, "番茄": {"38": 9, "42": 9},
            "菌汤": {"38": 9, "42": 9}, "三鲜": {"38": 9, "42": 9}}

def build(key, label, tag, size, n_side, side_price, card):
    """size: '38'/'42'；card: 成本卡建议售价字典；n_side: 清汤格数"""
    red = C[key]["红汤"]

    def mk(name, parts, price, has_clear):
        cost = round(sum(v for _, v in parts), 6)
        cparts = [(n, card[n][size] if n != "清汤" else 0) for n, _ in parts]
        card_total = sum(v for _, v in cparts)
        seg  = " + ".join(f"{n} {v:.2f}" for n, v in parts)
        cseg = " + ".join(f"{n} {v:g}" for n, v in cparts)
        warn = "  [!] 实际售价低于成本卡建议售价" if price < card_total else ""
        tail = "  | 清汤格售价与成本均为 0 元" if has_clear else ""
        return {"name": name, "cost": cost, "price": price, "card": card_total,
                "note": f"{label} | 成本: {seg} | 成本卡建议售价: {cseg} (合计 {card_total:g}){warn}{tail}"}

    rows = []
    if n_side == 1:
        for s in SIDES:
            rows.append(mk(f"{tag} · 红汤＋{s}", [("红汤", red), (s, C[key][s])],
                           YY_RED + side_price[s], False))
        rows.append(mk(f"{tag} · 红汤＋清汤", [("红汤", red), ("清汤", 0.0)], YY_RED, True))
    else:
        for a, b in itertools.combinations(SIDES + ["清汤"], 2):
            ca = 0.0 if a == "清汤" else C[key][a]
            cb = 0.0 if b == "清汤" else C[key][b]
            pa = 0 if a == "清汤" else side_price[a]
            pb = 0 if b == "清汤" else side_price[b]
            rows.append(mk(f"{tag} · 红汤＋{a}＋{b}", [("红汤", red), (a, ca), (b, cb)],
                           BEN_RED + pa + pb, "清汤" in (a, b)))
    return rows


POTDATA = {
    "38":     {"title": "鸳鸯锅 38cm", "spec": "38cm 鸳鸯锅", "rows": build("38yy", "38cm鸳鸯锅", "鸳鸯锅38cm（小）", "38", 1, YY_SIDE, YY_CARD)},
    "42":     {"title": "鸳鸯锅 42cm", "spec": "42cm 鸳鸯锅", "rows": build("42yy", "42cm鸳鸯锅", "鸳鸯锅42cm（大）", "42", 1, YY_SIDE, YY_CARD)},
    "benz38": {"title": "奔驰锅 38cm（三格）", "spec": "38cm 奔驰锅", "rows": build("38benz", "38cm奔驰锅", "奔驰锅38cm（小·三格）", "38", 2, BEN_SIDE, BEN_CARD)},
    "benz42": {"title": "奔驰锅 42cm（三格）", "spec": "42cm 奔驰锅", "rows": build("42benz", "42cm奔驰锅", "奔驰锅42cm（大·三格）", "42", 2, BEN_SIDE, BEN_CARD)},
}

with open(OUT, "w", encoding="utf-8") as f:
    f.write("// 由 gen_pots.py 从《萍姐锅底成本卡（新）2025.07.12》+ 上蔡店菜单_20260925确定版 自动生成，请勿手改。\n")
    f.write("// 成本 = Σ单份成本 + Σ单份运费；售价 = 菜单红汤价 + 各清汤加料价；清汤格为 0 元空格。\n")
    f.write("const POTDATA = ")
    json.dump(POTDATA, f, ensure_ascii=False, indent=1)
    f.write(";\n")

print()
for k, v in POTDATA.items():
    rs = v["rows"]
    avg_c = sum(r["cost"] for r in rs) / len(rs)
    avg_p = sum(r["price"] for r in rs) / len(rs)
    print(f"{k:7s} {v['title']:20s} {len(rs):2d} 组合 | 成本 {min(r['cost'] for r in rs):.2f}~{max(r['cost'] for r in rs):.2f}"
          f" 均{avg_c:.2f} | 售价 {avg_p:.0f} | 均毛利率 {(avg_p-avg_c)/avg_p*100:.1f}%")
