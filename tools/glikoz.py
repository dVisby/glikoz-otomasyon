#!/usr/bin/env python3
"""Glikoz Günlüğüm — Reels pipeline.

  python3 tools/glikoz.py new <slug> "<Başlık>"     create episodes/NNN-<slug>/episode.json from the template
  python3 tools/glikoz.py voicetext <ep>             write episodes/<ep>/voice.txt (text to send to ElevenLabs)
  python3 tools/glikoz.py preview <ep>               estimated timing, contact sheet only (no voice needed)
  python3 tools/glikoz.py align <ep> [voice.mp3]     detect sentence onsets in the voice -> timing.json
  python3 tools/glikoz.py render <ep>                frames + ambient + voice -> out/reels.mp4, kapak.jpg, aciklama.txt, contact.png
  python3 tools/glikoz.py cover <ep>                 only re-draw out/kapak.jpg

<ep> is the folder name under episodes/ (e.g. 001-seker-sensoru) or just its number (001).
"""
import sys, os, json, re, asyncio, base64, shutil, subprocess, pathlib, wave
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
ENGINE = ROOT / 'engine' / 'player.html'
EPISODES = ROOT / 'episodes'
VOICE_OFFSET = 0.4     # voice starts this far into the video
TAIL = 2.0             # seconds after the last word
FPS = 30


def ep_dir(arg):
    p = EPISODES / arg
    if p.is_dir(): return p
    hits = sorted(EPISODES.glob(f'{arg}-*'))
    if not hits: sys.exit(f'episode not found: {arg}')
    return hits[0]


def load(ep):
    return json.loads((ep / 'episode.json').read_text(encoding='utf-8'))


def spoken_lines(e):
    out = []
    for sc in e['scenes']:
        for ln in sc['lines']:
            if isinstance(ln, str): out.append({'text': ln, 'say': ln.replace(' | ', ' ')})
            else: out.append({'text': ln['text'], 'say': ln.get('say', ln['text'].replace(' | ', ' '))})
    return out


# ---------------------------------------------------------------- commands
def cmd_new(slug, title):
    EPISODES.mkdir(exist_ok=True)
    nums = [int(p.name[:3]) for p in EPISODES.iterdir() if p.is_dir() and p.name[:3].isdigit()]
    nid = f'{(max(nums) + 1) if nums else 1:03d}'
    d = EPISODES / f'{nid}-{slug}'; d.mkdir()
    tpl = json.loads((ROOT / 'templates' / 'episode.template.json').read_text(encoding='utf-8'))
    tpl['id'] = nid; tpl['slug'] = slug; tpl['title'] = title
    (d / 'episode.json').write_text(json.dumps(tpl, ensure_ascii=False, indent=2), encoding='utf-8')
    print(d)


def cmd_voicetext(ep):
    e = load(ep)
    txt = '\n\n'.join(l['say'] for l in spoken_lines(e))
    (ep / 'voice.txt').write_text(txt, encoding='utf-8')
    print(txt)


def estimate_timing(e):
    t = VOICE_OFFSET; lines = []
    for l in spoken_lines(e):
        d = max(1.6, len(l['say']) / 14.5)
        lines.append({'start': round(t, 3), 'end': round(t + d, 3)}); t += d + .45
    return {'total': round(t + TAIL, 3), 'lines': lines, 'estimated': True}


def detect_onsets(mp3, n, expected=None):
    """Split the voice into n lines at pauses. With `expected` (relative line lengths, e.g. character
    counts) a dynamic programme picks the pause set whose line durations best match the text, preferring
    longer pauses; without it the n-1 longest pauses are used."""
    SR = 16000
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(mp3), '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    hop = SR // 100
    frames = len(x) // hop - 2
    env = np.array([np.sqrt(np.mean(x[i * hop:(i + 2) * hop] ** 2)) for i in range(frames)])
    db = 20 * np.log10(env + 1e-9)
    voiced = db > -42
    first = int(np.argmax(voiced)); last = int(len(voiced) - np.argmax(voiced[::-1]))
    gaps = []; i = first
    while i < last:
        if not voiced[i]:
            j = i
            while j < last and not voiced[j]: j += 1
            if j - i >= 10: gaps.append((i, j))
            i = j
        else: i += 1
    if len(gaps) < n - 1:
        sys.exit(f'only {len(gaps)} pauses found for {n} lines — check that voice text matches episode lines')
    if expected:
        E = np.array(expected, float); E = E / E.sum() * (last - first - sum(g[1] - g[0] for g in gaps) * 0.6)
        G = len(gaps); INF = 1e18
        # bounds: index -1 = start, G = end
        def seg_cost(a_end, b_start, k):   # line k spans from a_end to b_start (frames)
            d = b_start - a_end; e = E[k]
            return ((d - e) / max(e, 40)) ** 2
        dp = np.full((n, G + 1), INF); back = np.full((n, G + 1), -1, int)
        for g in range(G):  # first line ends at gap g
            dp[0][g] = seg_cost(first, gaps[g][0], 0) - 0.04 * (gaps[g][1] - gaps[g][0])
        for k in range(1, n - 1):
            for g in range(k, G):
                best, arg = INF, -1
                for h in range(k - 1, g):
                    if dp[k - 1][h] >= INF: continue
                    c = dp[k - 1][h] + seg_cost(gaps[h][1], gaps[g][0], k) - 0.04 * (gaps[g][1] - gaps[g][0])
                    if c < best: best, arg = c, h
                dp[k][g], back[k][g] = best, arg
        best, arg = INF, -1
        for h in range(n - 2, G):
            if dp[n - 2][h] >= INF: continue
            c = dp[n - 2][h] + seg_cost(gaps[h][1], last, n - 1)
            if c < best: best, arg = c, h
        idx = [arg]
        for k in range(n - 2, 0, -1): idx.append(back[k][idx[-1]])
        chosen = [gaps[i] for i in sorted(idx)]
    else:
        chosen = sorted(sorted(gaps, key=lambda g: g[0] - g[1])[:n - 1])  # longest n-1 pauses, in time order
    starts = [first] + [g[1] for g in chosen]
    ends = [g[0] for g in chosen] + [last]
    report = [{'start': s / 100, 'end': e / 100} for s, e in zip(starts, ends)]
    leftovers = sorted([(g[1] - g[0]) / 100 for g in gaps if g not in chosen], reverse=True)[:3]
    shortest = min((g[1] - g[0]) / 100 for g in chosen) if chosen else 0
    return report, len(x) / SR, shortest, leftovers


def cmd_align(ep, mp3=None):
    e = load(ep); n = len(spoken_lines(e))
    src = pathlib.Path(mp3) if mp3 else ep / 'voice.mp3'
    if src.resolve() != (ep / 'voice.mp3').resolve(): shutil.copy(src, ep / 'voice.mp3')
    lines, dur, shortest, left = detect_onsets(ep / 'voice.mp3', n, [len(l['say']) + 6 for l in spoken_lines(e)])
    timing = {'voice_offset': VOICE_OFFSET, 'voice_duration': round(dur, 3),
              'lines': [{'start': round(l['start'] + VOICE_OFFSET, 3), 'end': round(l['end'] + VOICE_OFFSET, 3)} for l in lines]}
    timing['total'] = round(timing['lines'][-1]['end'] + TAIL, 3)
    (ep / 'timing.json').write_text(json.dumps(timing, indent=1), encoding='utf-8')
    for k, (l, s) in enumerate(zip(timing['lines'], spoken_lines(e))):
        print(f"{k + 1:2d} {l['start']:6.2f}-{l['end']:6.2f}  {s['say'][:60]}")
    print(f'lines={n} total={timing["total"]}s  shortest chosen pause={shortest:.2f}s  longest unused pauses={left}')
    tl = timing['lines']; sl = spoken_lines(e)
    rates = [len(s['say']) / max(.1, l['end'] - l['start']) for l, s in zip(tl, sl)]
    odd = [k + 1 for k, r in enumerate(rates) if r > 30 or r < 7]
    if odd: print(f'WARNING: implausible speech rate on lines {odd} — verify alignment on the contact sheet')


async def _browser_job(e, timing, job):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--allow-file-access-from-files'])
        async def page():
            pg = await b.new_page(viewport={'width': 1080, 'height': 1920})
            await pg.goto(ENGINE.as_uri()); await pg.evaluate('window.ready')
            info = await pg.evaluate('([e, t]) => setup(e, t)', [e, timing]); timing['total'] = info['total']; return pg
        r = await job(page); await b.close(); return r


async def _grab(pg, expr, path, fmt='image/jpeg'):
    data = await pg.evaluate(f"(() => {{ {expr}; return document.getElementById('c').toDataURL('{fmt}', 0.95); }})()")
    pathlib.Path(path).write_bytes(base64.b64decode(data.split(',', 1)[1]))


def contact_sheet(e, timing, out_png, from_video=None):
    from PIL import Image
    caps = [l['text'] for l in spoken_lines(e)]
    times = [(l['start'] + l['end']) / 2 for l in timing['lines']]
    times.append(timing['lines'][-1]['end'] + 0.9 + 4.6)  # end card
    tmp = out_png.parent / '_cs'; tmp.mkdir(exist_ok=True)
    if from_video:
        for i, t in enumerate(times):
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.2f}', '-i', str(from_video), '-frames:v', '1', str(tmp / f'{i:02d}.jpg')], check=True)
    else:
        async def job(page):
            pg = await page()
            for i, t in enumerate(times): await _grab(pg, f'render({t})', tmp / f'{i:02d}.jpg')
        asyncio.run(_browser_job(e, timing, job))
    ims = [Image.open(tmp / f'{i:02d}.jpg').resize((270, 480)) for i in range(len(times))]
    cols = 6; rows = (len(ims) + cols - 1) // cols
    g = Image.new('RGB', (270 * cols, 480 * rows))
    for i, im in enumerate(ims): g.paste(im, ((i % cols) * 270, (i // cols) * 480))
    g.save(out_png); shutil.rmtree(tmp); print(out_png)


def cmd_preview(ep):
    e = load(ep); timing = estimate_timing(e)
    (ep / 'out').mkdir(exist_ok=True)
    (ep / 'out' / 'timing.preview.json').write_text(json.dumps(timing, indent=1))
    contact_sheet(e, timing, ep / 'out' / 'preview.png')


def ambient(events, total, path):
    SR = 44100; t = np.arange(int(SR * total)) / SR; out = np.zeros_like(t)
    for f, a in [(55, .10), (82.4, .06), (110, .05), (164.8, .025)]:
        out += a * np.sin(2 * np.pi * f * t + .3 * np.sin(2 * np.pi * .07 * t)) * (.75 + .25 * np.sin(2 * np.pi * .05 * t + f))
    rng = np.random.default_rng(1)
    out += .16 * np.convolve(rng.standard_normal(len(t)), np.ones(400) / 400, mode='same')
    for ev in events:
        s = int(ev['t'] * SR)
        if ev.get('swell'):
            n = int(SR * 1.2); s = max(0, s - int(SR * .84)); env = np.sin(np.linspace(0, np.pi, n)) ** 2
            seg = np.convolve(rng.standard_normal(n), np.ones(60) / 60, mode='same') * 6
            out[s:s + n] += .12 * seg[:len(out) - s] * env[:len(out) - s]
        else:
            n = int(SR * .35)
            if s < 0 or s + n > len(out): continue
            tt = np.arange(n) / SR
            out[s:s + n] += ev['a'] * np.sin(2 * np.pi * ev['f'] * tt) * np.exp(-tt / ev['d']) * (1 - np.exp(-tt / .002))
    out *= np.clip(np.minimum(t / 1.0, (total - t) / 2.0), 0, 1)
    out = out / np.max(np.abs(out)) * .6
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())


def cmd_render(ep, workers=6):
    e = load(ep)
    tpath = ep / 'timing.json'
    if not tpath.exists(): sys.exit('timing.json missing — run align first (or preview for a silent check)')
    timing = json.loads(tpath.read_text())
    out = ep / 'out'; frames = out / 'frames'
    if frames.exists(): shutil.rmtree(frames)
    frames.mkdir(parents=True)
    async def job(page):
        pgs = [await page() for _ in range(workers)]
        n = int(timing['total'] * FPS)
        evs = await pgs[0].evaluate('audioEvents()')
        await _grab(pgs[0], 'renderCover()', out / 'kapak.jpg')
        async def work(k, pg):
            for i in range(k, n, workers): await _grab(pg, f'render({i / FPS})', frames / f'{i:05d}.jpg')
        await asyncio.gather(*(work(k, pg) for k, pg in enumerate(pgs)))
        return evs
    evs = asyncio.run(_browser_job(e, timing, job))
    krem = e.get('theme', 'krem') == 'krem'
    if krem: evs = []  # calm theme: no UI ticks; music is added in Instagram
    ambient(evs, timing['total'], out / 'ambient.wav')
    delay = int(timing['voice_offset'] * 1000)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', str(frames / '%05d.jpg'),
                    '-i', str(out / 'ambient.wav'), '-i', str(ep / 'voice.mp3'), '-filter_complex',
                    f'[1:a]volume={0.22 if krem else 0.45}[amb];[2:a]adelay={delay}|{delay}[v];[amb][v]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]',
                    '-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
                    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', str(out / 'reels.mp4')], check=True)
    shutil.rmtree(frames)
    cap = e.get('caption', e['title']).strip()
    srcs = '\n'.join('• ' + s for s in e.get('sources', []))
    tags = ' '.join(e.get('hashtags', []))
    (out / 'aciklama.txt').write_text(f"{cap}\n\nKaynaklar:\n{srcs}\n\nBilgilendirme amaçlıdır, tıbbi tavsiye değildir.\n\n{tags}\n", encoding='utf-8')
    contact_sheet(e, timing, out / 'contact.png', from_video=out / 'reels.mp4')
    print(out / 'reels.mp4', f'{timing["total"]:.1f}s')


def cmd_cover(ep):
    e = load(ep); tp = ep / 'timing.json'
    timing = json.loads(tp.read_text()) if tp.exists() else estimate_timing(e)
    (ep / 'out').mkdir(exist_ok=True)
    async def job(page):
        pg = await page(); await _grab(pg, 'renderCover()', ep / 'out' / 'kapak.jpg')
    asyncio.run(_browser_job(e, timing, job)); print(ep / 'out' / 'kapak.jpg')


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: print(__doc__); sys.exit()
    c = a[0]
    if c == 'new': cmd_new(a[1], a[2])
    elif c == 'voicetext': cmd_voicetext(ep_dir(a[1]))
    elif c == 'preview': cmd_preview(ep_dir(a[1]))
    elif c == 'align': cmd_align(ep_dir(a[1]), a[2] if len(a) > 2 else None)
    elif c == 'render': cmd_render(ep_dir(a[1]))
    elif c == 'cover': cmd_cover(ep_dir(a[1]))
    else: print(__doc__)
