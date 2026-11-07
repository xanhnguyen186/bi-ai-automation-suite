# n8n Code node (Python) - mode: "Run Once for All Items"   (this is Code2, after the Merge node)
# Builds ONE email-ready HTML report, in this order:
#   Hero -> Key metrics (4 cards + insight) -> Best product -> Best store
#   -> 4 chart cards (each with its own dark insight strip) -> Recommended actions -> Footer
#
# Merge node inputs (append mode, 6 inputs), in this order:
#   Input 1    = Basic LLM Chain (item has "text")
#   Inputs 2-5 = the 4 chart images (items have "url"): net revenue by month, by category,
#                top 5 subcategories, net revenue by store
#   Input 6    = KPI Code node (item has "report_month")
#
# The LLM answers in tagged sections: [KPI] [TREND] [CATEGORY] [SUBCATEGORY] [STORE] [ACTIONS].
# Everything is table-based with inline CSS so it survives Gmail/Outlook; fancy effects (rounded corners,
# translucent panels, background photos) degrade gracefully to plain colours. No imports needed.

# ======================= SETTINGS - edit these =======================
REPORT_TITLE = "Monthly Performance Report"     # email subject
HERO_LABEL = "BUSINESS PERFORMANCE"
HERO_TITLE = "Monthly Report"
BRAND_NAME = "YourStore"                        # your store / company name ("" hides it)
CURRENCY = ""                                   # e.g. "$" or "EGP " - shown before money figures
# Public image links (hosted anywhere, e.g. Google Drive / GitHub / Imgur). Leave "" for a clean colour fallback.
HERO_IMAGE_URL = ""                             # wide banner, about 1360 x 500 px
PRODUCT_IMAGE_URL = ""                          # about 680 x 520 px (square-ish)
STORE_IMAGE_URL = ""                            # about 680 x 520 px (square-ish)
# =====================================================================

NAVY, MUTED, INK = "#10214B", "#5B6B8C", "#0B1220"
GOOD, BAD, FLAT = "#16A34A", "#DC2626", "#64748B"
LINE = "#DCE6F5"
FONT = "Inter,Arial,Helvetica,sans-serif"

CHART_TAGS = ["TREND", "CATEGORY", "SUBCATEGORY", "STORE"]       # insight shown under chart 1..4

# ---------------------------- helpers ----------------------------
def esc(v):
    return (str(v).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))

def strip_tags(t):
    out, depth = [], 0
    for ch in str(t):
        if ch == "<":
            depth += 1
        elif ch == ">" and depth:
            depth -= 1
        elif not depth:
            out.append(ch)
    return "".join(out)

def clean_line(t):
    return strip_tags(t).replace("__", "").replace("`", "").strip()

def rich(text, strong_style="font-weight:700;"):
    """Escape the text, then turn **bold** markers into <strong>. Unbalanced markers are dropped."""
    parts = esc(text).split("**")
    if len(parts) % 2 == 0:
        parts = ["".join(parts)]
    parts = [p.replace("*", "") for p in parts]
    return "".join(p if i % 2 == 0 else '<strong style="' + strong_style + '">' + p + "</strong>"
                   for i, p in enumerate(parts))

def fnum(v, decimals=0):
    if v is None or v == "":
        return "-"
    return format(float(v), ",." + str(decimals) + "f")

def url_ok(u):
    return str(u).strip().startswith("http")

def css_url(u):
    return str(u).strip().replace("'", "%27").replace('"', "%22").replace("&", "&amp;")

# ---------------------------- 1. inputs ----------------------------
kpi, llm_text, charts = {}, "", []
for item in _items:
    j = item["json"]
    if "report_month" in j:
        kpi = j
    elif j.get("text") or j.get("output"):
        llm_text = str(j.get("text") or j.get("output"))
    elif j.get("url"):
        charts.append(str(j["url"]))

month = kpi.get("report_month_label", "")
prev_label = kpi.get("prev_month_label", "")
first_label = kpi.get("first_month_label", "")

# ---------------------------- 2. parse the LLM's tagged sections ----------------------------
sections, order, current = {}, [], None
for raw in llm_text.replace("\r", "").split("\n"):
    line = raw.strip().strip("*#` ").strip()
    if line.startswith("[") and line.endswith("]") and 1 < len(line) < 30:
        current = line[1:-1].strip().upper().replace(" ", "_")
        sections[current] = []
        order.append(current)
    elif current is not None and not raw.strip().startswith("```"):
        sections[current].append(raw)

def paragraph(tag):
    return " ".join(clean_line(x) for x in sections.get(tag, []) if clean_line(x))

def bullets(tag):
    items = []
    for x in sections.get(tag, []):
        t = clean_line(x)
        if not t:
            continue
        if t[0] in "-*•":
            t = t[1:].strip()
        elif t[0].isdigit() and "." in t[:3]:
            t = t[t.index(".") + 1:].strip()
        elif items:
            items[-1] += " " + t
            continue
        items.append(t)
    return items

parsed_ok = any(t in sections for t in ["KPI"] + CHART_TAGS + ["ACTIONS"])

# ---------------------------- 3. building blocks ----------------------------
def spacer(h=16):
    return '<tr><td height="' + str(h) + '" style="font-size:0;line-height:0;">&nbsp;</td></tr>'

def frost(inner, pad=18):
    """Pale frosted-glass panel (solid pale colour first; translucent white where supported)."""
    return ('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            'style="background:#F6F9FE;background:rgba(255,255,255,.75);border:1px solid ' + LINE + ';border-radius:22px;">'
            '<tr><td class="pad" style="padding:' + str(pad) + 'px;">' + inner + '</td></tr></table>')

def title_row(glyph, title, meta="", icon_bg="#DCEBFF"):
    return ('<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
            '<td width="40" valign="middle"><div style="width:30px;height:30px;line-height:30px;border-radius:9px;background:' + icon_bg
            + ';text-align:center;font-size:15px;">' + glyph + '</div></td>'
            '<td valign="middle" style="font-family:' + FONT + ';font-size:17px;font-weight:700;color:' + NAVY + ';">' + esc(title) + '</td>'
            '<td align="right" valign="middle" style="font-family:' + FONT + ';font-size:12px;color:' + MUTED + ';">' + esc(meta) + '</td>'
            '</tr></table>')

def strip_box(text):
    """Dark rounded insight strip with a lightbulb."""
    if not text:
        return ""
    return ('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;"><tr>'
            '<td style="background:' + INK + ';border-radius:14px;padding:13px 16px;">'
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
            '<td width="32" valign="top" style="font-size:16px;line-height:22px;">&#128161;</td>'
            '<td valign="top" style="font-family:' + FONT + ';font-size:14px;line-height:22px;color:#DCE5F5;">'
            + rich(text, "font-weight:700;color:#FFFFFF;") + '</td></tr></table></td></tr></table>')

def trend(change, unit, lower_is_better=False):
    if change in (None, ""):
        return "", "no previous month", FLAT
    v = float(change)
    if v == 0:
        return "&#9654;", "0.0" + unit + " vs " + esc(prev_label), FLAT
    good = (v < 0) if lower_is_better else (v > 0)
    arrow = "&#8599;" if v > 0 else "&#8600;"
    return arrow, ("+" if v > 0 else "") + format(v, ".1f") + unit + " vs " + esc(prev_label), (GOOD if good else BAD)

def kpi_card(glyph, icon_bg, glyph_color, label, value, change, unit, lower_is_better=False):
    arrow, txt, color = trend(change, unit, lower_is_better)
    return ('<td class="stack" width="50%" valign="top" style="padding:6px;">'
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            'style="background:#FFFFFF;border:1px solid #E3EBF7;border-radius:16px;">'
            '<tr><td style="padding:16px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
            '<td width="58" valign="middle"><div style="width:46px;height:46px;line-height:46px;border-radius:23px;background:' + icon_bg
            + ';text-align:center;font-size:21px;font-weight:700;color:' + glyph_color + ';">' + glyph + '</div></td>'
            '<td valign="middle" style="font-family:' + FONT + ';">'
            '<div style="font-size:13px;color:' + MUTED + ';">' + label + '</div>'
            '<div style="font-size:28px;font-weight:800;color:' + NAVY + ';line-height:1.15;margin:2px 0;">' + value + '</div>'
            '<div style="font-size:12.5px;font-weight:600;color:' + color + ';">' + arrow + ' ' + txt + '</div>'
            '</td></tr></table></td></tr></table></td>')

def feature_card(icon, label, heading, body_html, image_url, image_left):
    """Dark cinematic card: text on one side, photo on the other (text only when no photo is set)."""
    text_td = ('<td class="stack" valign="middle" ' + ('width="50%" ' if image_url else '')
               + 'style="padding:30px 28px;background:' + INK + ';background-image:linear-gradient('
               + ('270deg' if image_left else '90deg') + ',#16233B 0%,' + INK + ' 100%);">'
               '<table role="presentation" cellpadding="0" cellspacing="0"><tr>'
               '<td width="46"><div style="width:36px;height:36px;line-height:36px;border-radius:10px;background:#1B2A44;'
               'border:1px solid #2C3E5E;text-align:center;font-size:17px;">' + icon + '</div></td>'
               '<td style="font-family:' + FONT + ';font-size:11px;letter-spacing:3px;color:#9FB0C8;">' + esc(label) + '</td></tr></table>'
               '<div style="font-family:' + FONT + ';font-size:28px;font-weight:800;color:#FFFFFF;margin:16px 0 10px;line-height:1.15;">' + esc(heading) + '</div>'
               '<div style="font-family:' + FONT + ';font-size:14px;line-height:1.65;color:#D3DCEB;">' + body_html + '</div></td>')
    img_td = ('<td class="stack" width="50%" valign="middle" background="' + esc(image_url) + '" bgcolor="' + INK + '" style="padding:0;background-color:' + INK
              + ';background-image:url(\'' + css_url(image_url) + '\');background-size:cover;background-position:center;">'
              '<img src="' + esc(image_url) + '" width="340" alt="" style="display:block;width:100%;height:auto;border:0;"></td>') if image_url else ""
    cells = (img_td + text_td) if image_left else (text_td + img_td)
    return ('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            'style="background:' + INK + ';border-radius:22px;overflow:hidden;"><tr>' + cells + '</tr></table>')

def money(v):
    return esc(CURRENCY) + fnum(v)

def bold(t):
    return '<strong style="color:#FFFFFF;font-weight:700;">' + esc(t) + '</strong>'

def delta_sentence(pct):
    if pct in (None, ""):
        return ""
    v = float(pct)
    return " Revenue was " + bold(("+" if v > 0 else "") + format(v, ".1f") + "%") + " vs " + esc(prev_label) + "."

# ---------------------------- 4. sections ----------------------------
# --- hero ---
if url_ok(HERO_IMAGE_URL):
    hero_bg = ('background-color:#16253D;background-image:url(\'' + css_url(HERO_IMAGE_URL) + '\');'
               'background-size:cover;background-position:center;')
    hero_attr = ' background="' + esc(HERO_IMAGE_URL) + '"'
else:
    hero_bg = 'background-color:#16253D;background-image:linear-gradient(135deg,#2B4D78 0%,#0F1B2D 100%);'
    hero_attr = ""

brand_row = ('<table role="presentation" cellpadding="0" cellspacing="0"><tr>'
             '<td style="font-size:18px;line-height:22px;">&#128717;&nbsp;</td>'
             '<td style="font-family:' + FONT + ';font-size:14px;color:#FFFFFF;">' + esc(BRAND_NAME) + '</td></tr></table>') if BRAND_NAME else "&nbsp;"

hero_html = (
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:22px;overflow:hidden;">'
    '<tr><td' + hero_attr + ' bgcolor="#16253D" style="' + hero_bg + 'border-radius:22px;" valign="top">'
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">'
    '<tr><td class="pad" style="padding:22px 26px 0;">' + brand_row + '</td></tr>'
    '<tr><td class="pad" style="padding:30px 26px 34px;">'
    '<table role="presentation" class="hpanel" width="68%" cellpadding="0" cellspacing="0" style="background:#16253D;background:rgba(11,18,32,.55);border-radius:16px;">'
    '<tr><td style="padding:18px 22px;font-family:' + FONT + ';">'
    '<div style="font-size:11px;letter-spacing:3px;color:#C5D2E6;">' + esc(HERO_LABEL) + '</div>'
    '<div class="h1" style="font-size:38px;font-weight:800;color:#FFFFFF;line-height:1.1;margin:8px 0 6px;">' + esc(HERO_TITLE) + '</div>'
    '<div style="font-size:19px;color:#FFFFFF;">' + esc(month) + '</div>'
    '</td></tr></table></td></tr></table></td></tr></table>')

# --- key metrics ---
kpi_inner = ""
if kpi:
    kpi_inner = (title_row("&#128202;", "Key metrics", (month + " vs " + prev_label) if prev_label else month)
                 + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;"><tr>'
                 + kpi_card("&#128176;", "#DCEBFF", "#1D4ED8", "Net Revenue", money(kpi.get("net_revenue")), kpi.get("net_revenue_mom_pct"), "%")
                 + kpi_card("%", "#FFE1E1", "#DC2626", "Gross Margin", fnum(kpi.get("gross_margin_pct"), 1) + "%", kpi.get("gross_margin_change_pts"), " pts")
                 + '</tr><tr>'
                 + kpi_card("&#128717;", "#DDF7E8", "#16A34A", "Total Orders", fnum(kpi.get("orders")), kpi.get("orders_mom_pct"), "%")
                 + kpi_card("&#8635;", "#EBE3FF", "#7C3AED", "Return Rate", fnum(kpi.get("return_rate_pct"), 1) + "%", kpi.get("return_rate_change_pts"), " pts", lower_is_better=True)
                 + '</tr></table>')
    if kpi.get("latest_month_partial"):
        kpi_inner += ('<div style="background:#FFF4E5;border-radius:8px;padding:8px 12px;font-family:' + FONT + ';font-size:12px;color:#92400E;margin-top:10px;">'
                      'Note: ' + esc(month) + ' only has ' + esc(kpi.get("latest_month_days")) + ' days of data, so comparisons with '
                      + esc(prev_label) + ' are not like-for-like.</div>')
    if parsed_ok:
        kpi_inner += strip_box(paragraph("KPI"))
    else:
        kpi_inner += strip_box(" ".join(clean_line(x) for x in llm_text.split("\n") if clean_line(x)) or "No insights were generated.")
kpi_html = frost(kpi_inner) if kpi_inner else ""

# --- best product ---
product_html = ""
if kpi.get("best_product_name"):
    body = ("The " + bold(kpi.get("best_product_name")) + " was your top performer in " + esc(month) + ", with "
            + bold(fnum(kpi.get("best_product_units")) + " units sold") + ", generating " + bold(money(kpi.get("best_product_revenue")))
            + " in net revenue and accounting for " + bold(fnum(kpi.get("best_product_share_pct"), 1) + "%") + " of the total."
            + delta_sentence(kpi.get("best_product_mom_pct")))
    product_html = feature_card("&#128081;", "TOP PRODUCT", "Best sold product", body,
                                PRODUCT_IMAGE_URL if url_ok(PRODUCT_IMAGE_URL) else "", image_left=False)

# --- best store ---
store_html = ""
if kpi.get("best_store_id"):
    body = (bold("Store " + str(kpi.get("best_store_id"))) + " was " + esc(month) + "'s top-performing location, generating "
            + bold(money(kpi.get("best_store_revenue"))) + " in net revenue, " + bold(fnum(kpi.get("best_store_share_pct"), 1) + "%")
            + " of the month's total." + delta_sentence(kpi.get("best_store_mom_pct")))
    store_html = feature_card("&#127978;", "TOP STORE", "Best performing store", body,
                              STORE_IMAGE_URL if url_ok(STORE_IMAGE_URL) else "", image_left=True)

# --- chart cards ---
CARD_META = [
    ("&#128200;", "Net revenue by month", (first_label + " - " + month) if first_label else month, "#DCEBFF"),
    ("&#127919;", "Net revenue by category", month, "#DDF7E8"),
    ("&#127991;", "Top 5 subcategories", month, "#EBE3FF"),
    ("&#127978;", "Net revenue by store", month, "#FFF0D6"),
]

def chart_card(i, url):
    glyph, ttl, meta, bg = CARD_META[i] if i < len(CARD_META) else ("&#128202;", "Chart " + str(i + 1), month, "#DCEBFF")
    insight = paragraph(CHART_TAGS[i]) if (parsed_ok and i < len(CHART_TAGS)) else ""
    inner = (title_row(glyph, ttl, meta, bg)
             + '<div style="margin-top:12px;background:#FFFFFF;border:1px solid #E3EBF7;border-radius:14px;padding:8px;text-align:center;">'
             '<img src="' + esc(url) + '" width="600" alt="' + esc(ttl) + '" style="display:block;width:100%;max-width:600px;height:auto;border:0;margin:0 auto;"></div>'
             + strip_box(insight))
    return frost(inner)

# --- recommended actions ---
actions = bullets("ACTIONS") if parsed_ok else []
actions_html = ""
if actions:
    rows_html = "".join(
        '<tr><td width="34" valign="top" style="padding:7px 0;"><div style="width:24px;height:24px;line-height:24px;border-radius:12px;background:' + NAVY
        + ';color:#FFFFFF;font-family:' + FONT + ';font-size:12px;font-weight:700;text-align:center;">' + str(n + 1) + '</div></td>'
        '<td valign="top" style="padding:7px 0 7px 4px;font-family:' + FONT + ';font-size:14px;line-height:1.55;color:' + NAVY + ';">'
        + rich(a, "font-weight:700;") + '</td></tr>' for n, a in enumerate(actions))
    actions_html = frost(title_row("&#9989;", "Recommended actions", "", "#DDF7E8")
                         + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;">' + rows_html + '</table>')

# ---------------------------- 5. assemble ----------------------------
parts = [hero_html, kpi_html, product_html, store_html] + [chart_card(i, u) for i, u in enumerate(charts)] + [actions_html]
body_rows = "".join('<tr><td>' + p + '</td></tr>' + spacer(16) for p in parts if p)

footer = ('<tr><td align="center" style="padding:6px 10px 4px;font-family:' + FONT + ';">'
          + ('<div style="font-size:14px;font-weight:700;color:' + NAVY + ';margin-bottom:6px;">&#128717; ' + esc(BRAND_NAME) + '</div>' if BRAND_NAME else '')
          + '<div style="font-size:11px;line-height:1.5;color:#7A8AA8;">Net revenue counts Completed orders only. Return rate = returned orders / all orders. '
          'Insights and recommendations are AI-generated from the figures above.</div></td></tr>')

html = (
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    '<style>@media only screen and (max-width:640px){.wrap{width:100%!important}.stack{display:block!important;width:100%!important;box-sizing:border-box!important}.hpanel{width:100%!important}'
    '.pad{padding-left:16px!important;padding-right:16px!important}.h1{font-size:30px!important}}</style></head>'
    '<body style="margin:0;padding:0;background:#E9F1FC;background-image:linear-gradient(180deg,#DCE9F9 0%,#F5F9FF 100%);font-family:' + FONT + ';color:' + NAVY + ';">'
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#E9F1FC"><tr><td align="center" style="padding:20px 10px;">'
    '<table role="presentation" class="wrap" width="680" cellpadding="0" cellspacing="0" style="width:680px;max-width:100%;">'
    + body_rows + footer +
    '</table></td></tr></table></body></html>'
)

subject = REPORT_TITLE + (" - " + month if month else "")
return [{"json": {"subject": subject, "html": html, "chart_count": len(charts), "kpis_found": bool(kpi),
                  "insights_parsed": parsed_ok, "sections_found": order, "html_size_kb": round(len(html) / 1024.0, 1)}}]
