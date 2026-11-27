#!/usr/bin/env python3
"""Statik paylaşımlar (tek sayfa infografik + carousel) — marka stilinde 1080x1350 PNG.
Kullanım: python3 tools/posts.py <ep>   (episodes/<ep>/post.json okunur, out/ altına PNG yazar)
post.json: {"cards":[{"kind":"cover|text|bars|cta", ...}], "footer": "..."}"""
import asyncio, base64, html, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / 'engine' / 'fonts'
BG = base64.b64encode((ROOT / 'engine' / 'assets' / 'bg.jpg').read_bytes()).decode()
LOGO = base64.b64encode((ROOT / 'engine' / 'assets' / 'logo.png').read_bytes()).decode()
OLIVE, CLAY, CREAM, INK = '#4E5B34', '#D2643F', '#F6F1E4', '#2B2A22'


def face():
    css = ''
    for w in (400, 500, 600, 700, 800):
        for sub in ('latin', 'latin-ext'):
            f = FONTS / f'inter-{sub}-{w}-normal.woff2'
            if f.exists():
                css += f"@font-face{{font-family:'InterX';font-weight:{w};src:url(data:font/woff2;base64,{base64.b64encode(f.read_bytes()).decode()}) format('woff2');}}\n"
    return css


BASE = """
*{box-sizing:border-box;margin:0;padding:0}
body{width:1080px;height:1350px;font-family:'InterX',sans-serif;color:%(ink)s;position:relative;overflow:hidden;background:%(cream)s}
.bg{position:absolute;inset:0;background:url(data:image/jpeg;base64,%(bg)s) center/cover;opacity:.35}
.veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(246,241,228,.92),rgba(246,241,228,.97))}
.wrap{position:absolute;inset:0;padding:84px 78px 110px;display:flex;flex-direction:column}
.logo{position:absolute;top:44px;right:56px;width:92px;height:92px;border-radius:50%%;background:#fff url(data:image/png;base64,%(logo)s) center/78%% no-repeat;box-shadow:0 4px 18px rgba(0,0,0,.12)}
h1{font-weight:800;font-size:76px;line-height:1.08;letter-spacing:-1px;color:%(olive)s}
h2{font-weight:800;font-size:58px;line-height:1.12;color:%(olive)s}
p{font-weight:500;font-size:42px;line-height:1.38}
.card{background:#fff;border-radius:36px;padding:38px 42px;box-shadow:0 10px 30px rgba(60,50,20,.10)}
.small{font-weight:500;font-size:24px;color:#6b6a5c;line-height:1.35}
.pill{display:inline-block;background:%(olive)s;color:#fff;font-weight:700;font-size:28px;padding:10px 26px;border-radius:40px;letter-spacing:.5px}
.src{position:absolute;left:78px;right:78px;bottom:42px;font-weight:500;font-size:21px;color:#7a7968;line-height:1.35}
.num{font-weight:800;color:%(clay)s}
""" % dict(ink=INK, cream=CREAM, olive=OLIVE, clay=CLAY, bg=BG, logo=LOGO)


def page(body):
    return f"<html><head><meta charset='utf-8'><style>{face()}{BASE}</style></head><body><div class='bg'></div><div class='veil'></div><div class='logo'></div>{body}</body></html>"


def fm(x):
    return f'{x:.1f}'.replace('.', ',')


def e(s):
    return html.escape(s).replace('\n', '<br>')


def render_card(c, footer, n, total):
    k = c['kind']
    src = f"<div class='src'>{e(c.get('source') or footer or '')}</div>"
    pager = f"<div style='position:absolute;left:78px;top:60px' class='small'>{n}/{total}</div>" if total > 1 else ''
    if k == 'cover':
        b = f"<div class='wrap' style='justify-content:center'><span class='pill' style='align-self:flex-start;margin-bottom:34px'>{e(c.get('tag',''))}</span><h1 style='font-size:92px'>{e(c['title'])}</h1><p style='margin-top:36px;color:#55543f'>{e(c.get('sub',''))}</p></div>{src}"
    elif k == 'text':
        items = ''.join(f"<div class='card' style='margin-top:28px;padding:44px 46px'><p style='font-size:46px'>{e(t)}</p></div>" for t in c.get('items', []))
        b = f"<div class='wrap' style='justify-content:center;padding-bottom:110px'><div><h2 style='font-size:68px'>{e(c['title'])}</h2></div>{('<p style=margin-top:28px>'+e(c['body'])+'</p>') if c.get('body') else ''}{items}</div>{src}"
    elif k == 'big':
        b = f"<div class='wrap' style='justify-content:center'><div class='small' style='font-size:30px;margin-bottom:10px'>{e(c.get('kicker',''))}</div><div class='num' style='font-size:210px;line-height:1'>{e(c['big'])}</div><h2 style='margin-top:18px'>{e(c['title'])}</h2><p style='margin-top:26px'>{e(c.get('body',''))}</p></div>{src}"
    elif k == 'bars':
        mx = c['max']; rows = ''
        for r in c['rows']:
            a, bv = r['a'], r['b']
            wa, wb = 60 * a / mx, 60 * bv / mx
            diff = (f"<span class='num' style='font-size:30px'>{e(r['note'])}</span>" if r.get('note') else '')
            rows += f"""<div class='card' style='margin-top:20px;padding:22px 34px'>
              <div style='display:flex;justify-content:space-between;align-items:baseline'><div style='font-weight:800;font-size:38px'>{e(r['name'])}</div>{diff}</div>
              <div style='display:flex;align-items:center;margin-top:14px'><div style='width:150px;font-size:24px;font-weight:600;color:#6b6a5c'>{e(c['la'])}</div><div style='height:34px;width:{wa}%;background:{OLIVE};border-radius:17px;min-width:8px'></div><div style='margin-left:14px;font-size:30px;font-weight:700'>{fm(a)} g</div></div>
              <div style='display:flex;align-items:center;margin-top:10px'><div style='width:150px;font-size:24px;font-weight:600;color:#6b6a5c'>{e(c['lb'])}</div><div style='height:34px;width:{wb}%;background:{CLAY};border-radius:17px;min-width:8px'></div><div style='margin-left:14px;font-size:30px;font-weight:700;color:{CLAY}'>{fm(bv)} g</div></div></div>"""
        b = f"<div class='wrap'><div style='margin-top:34px'><h2 style='font-size:56px'>{e(c['title'])}</h2><p style='font-size:28px;margin-top:10px;color:#55543f'>{e(c.get('sub',''))}</p></div><div style='margin-top:10px'>{rows}</div>{('<p style=font-size:27px;margin-top:20px;margin-bottom:70px;color:#55543f>'+e(c['foot'])+'</p>') if c.get('foot') else ''}</div>{src}"
    elif k == 'cta':
        lines = ''.join(f"<div class='card' style='margin-top:24px'><p style='font-size:40px;font-weight:700'>{e(t)}</p></div>" for t in c['items'])
        b = f"<div class='wrap' style='justify-content:center'><h2 style='font-size:66px'>{e(c['title'])}</h2>{lines}<div class='small' style='margin-top:40px;font-size:28px;font-weight:600;color:{OLIVE}'>Glikoz Günlüğüm</div></div>{src}"
    else:
        raise SystemExit(f'bilinmeyen kart: {k}')
    return page(pager + b)


async def main(ep):
    d = next((p for p in (ROOT / 'episodes').iterdir() if p.name == ep or p.name.startswith(ep + '-')), None)
    spec = json.loads((d / 'post.json').read_text(encoding='utf-8'))
    out = d / 'out'; out.mkdir(exist_ok=True)
    cards = spec['cards']
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1080, 'height': 1350})
        for i, c in enumerate(cards, 1):
            await pg.set_content(render_card(c, spec.get('footer', ''), i, len(cards)))
            await pg.wait_for_timeout(300)
            name = 'infografik.png' if len(cards) == 1 else f'kart{i}.png'
            await pg.screenshot(path=str(out / name))
            print(out / name)
        await b.close()


if __name__ == '__main__':
    asyncio.run(main(sys.argv[1]))
