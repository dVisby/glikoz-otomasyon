/* Glikoz Günlüğüm — scene library.
 * Entry points (called by tools/glikoz.py through Playwright):
 *   setup(episode, timing)  -> builds the timeline
 *   render(t)               -> draws frame at real time t (seconds)
 *   renderCover()           -> draws the cover image
 *   audioEvents()           -> [{t, f, a, d}] UI ticks and [{t, swell:true}] for the ambient track
 * timing = {total, lines:[{start, end}]} : one entry per spoken line, real seconds in the final video.
 */
const W = 1080, H = 1920;
const C = {
  bg: '#070707', gold: '#C8B07A', ink: '#DDD8CE', gray: '#8A8780', grayDim: '#4A4844',
  faint: '#2A2927', red: '#E0344F', redDeep: '#8E1729', brand: '#9C9282'
};
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const LEAD = 0.15;      // caption appears this much before the spoken line
const SCENE_LEAD = 0.35; // scene fades in this much before its first line

/* ---------------- helpers ---------------- */
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const easeOut = x => 1 - Math.pow(1 - x, 3);
const lerp = (a, b, k) => a + (b - a) * k;
const fadeWin = (t, a, b, f = .4) => clamp(Math.min((t - a) / f, (b - t) / f));
const trNum = (n, dec = 0) => {
  const s = Math.abs(n).toFixed(dec).split('.');
  s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (n < 0 ? '−' : '') + s.join(',');
};
function mixColor(c1, c2, k) {
  const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const a = p(c1), b = p(c2);
  return 'rgb(' + a.map((v, i) => Math.round(lerp(v, b[i], k))).join(',') + ')';
}
function text(str, x, y, o = {}) {
  const { font = '400 30px Mono', color = C.gray, align = 'left', spacing = 0, alpha = 1, glow = null } = o;
  if (alpha <= 0 || !str) return;
  ctx.save();
  ctx.globalAlpha *= alpha; ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = spacing + 'px';
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 30; }
  ctx.fillText(str, x, y); ctx.restore();
}
function measure(str, font, spacing = 0) {
  ctx.save(); ctx.font = font; ctx.letterSpacing = spacing + 'px';
  const w = ctx.measureText(str).width; ctx.restore(); return w;
}
function wrapLines(str, font, maxW) {
  const words = str.split(' '); const lines = []; let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (measure(test, font) > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
  }
  if (cur) lines.push(cur); return lines;
}
function roundRect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function ruby(x, y, r, a = 1, glow = 1) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.shadowColor = 'rgba(224,52,79,0.85)'; ctx.shadowBlur = 28 * glow;
  const g = ctx.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r);
  g.addColorStop(0, '#FF7A8C'); g.addColorStop(.55, C.red); g.addColorStop(1, C.redDeep);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,190,200,0.55)'; ctx.lineWidth = Math.max(1, r * .12);
  ctx.beginPath(); ctx.arc(x, y, r * .5, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}
/* standard layout pieces */
function bigNumber(str, o = {}) {
  const { alpha = 1, color = C.gold, size = 150, unit = null } = o;
  const glow = color === C.red ? 'rgba(224,52,79,.55)' : null;
  text(str, 72, 545, { font: `500 ${size}px Mono`, color, alpha, spacing: -2, glow });
  if (unit) text(unit, 72 + measure(str, `500 ${size}px Mono`, -2) + 14, 545, { font: '400 64px Mono', color, alpha });
}
const label = (s, y, a = 1, color = C.gray) => text(s, 76, y, { font: '400 28px Mono', color, alpha: a, spacing: 2 });
const source = (s, a = 1, y = 1262) => text(s, 76, y, { font: '400 21px Mono', color: C.grayDim, alpha: a, spacing: 1.5 });
const small = (s, x, y, o = {}) => text(s, x, y, Object.assign({ font: '400 20px Mono', color: C.grayDim, spacing: 1.5 }, o));

/* ---------------- glucose curve helpers ---------------- */
const bump = (x, amp, tau) => x <= 0 ? 0 : amp * (x / tau) * Math.exp(1 - x / tau);
function chart(x0, y0, w, h, gmin, gmax, band = [70, 140]) {
  const Y = v => y0 + h - (v - gmin) / (gmax - gmin) * h;
  if (band) {
    ctx.fillStyle = 'rgba(200,176,122,0.07)'; ctx.fillRect(x0, Y(band[1]), w, Y(band[0]) - Y(band[1]));
    ctx.strokeStyle = 'rgba(200,176,122,0.25)'; ctx.lineWidth = 1; ctx.setLineDash([6, 8]);
    band.forEach(v => { ctx.beginPath(); ctx.moveTo(x0, Y(v)); ctx.lineTo(x0 + w, Y(v)); ctx.stroke(); });
    ctx.setLineDash([]);
    band.forEach(v => text(String(v), x0 - 12, Y(v) + 7, { font: '400 20px Mono', color: C.grayDim, align: 'right' }));
  }
  ctx.strokeStyle = C.faint; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0 + h); ctx.lineTo(x0 + w, y0 + h); ctx.stroke();
  return Y;
}
function strokeCurve(f, x0, w, h0, h1, Y, upto, colorFn, width = 5) {
  const steps = 240; ctx.lineWidth = width; ctx.lineCap = 'round';
  for (let i = 0; i < steps; i++) {
    const a = h0 + (h1 - h0) * i / steps; if (a > upto) break;
    const b = Math.min(h0 + (h1 - h0) * (i + 1) / steps, upto);
    const va = f(a), vb = f(b);
    ctx.strokeStyle = colorFn((va + vb) / 2); ctx.beginPath();
    ctx.moveTo(x0 + (a - h0) / (h1 - h0) * w, Y(va)); ctx.lineTo(x0 + (b - h0) / (h1 - h0) * w, Y(vb)); ctx.stroke();
  }
}
const gcol = hi => v => v > hi ? C.red : C.gold;

/* ======================================================================
 * SCENES. Each: draw(s, lt, a) where s = scene object (with s.L = local line starts,
 * s.dur), lt = local time, a = scene alpha. events(s) -> local tick events.
 * ====================================================================== */
const SCENES = {};

/* cubes: amount counter with icon grid and a limit bar.
 * {steps:[{line, value, label, sub?, subLine?, source}], unit:'g', perIcon:4.2, limit:25, limitLabel, max:40} */
SCENES.cubes = {
  value(s, lt) {
    let v = 0, prev = 0;
    for (const st of s.steps) {
      const t0 = s.L[st.line] + .2;
      v = lerp(prev, st.value, ease(prog(lt, t0, t0 + 1.8)));
      if (lt < t0 + 1.8) break; prev = st.value;
    }
    return v;
  },
  draw(s, lt) {
    const v = this.value(s, lt), lim = s.limit ?? Infinity;
    const over = prog(v, lim, lim + 2);
    const col = mixColor(C.gold, C.red, over);
    const vs = String(Math.round(v));
    text(vs, 72, 545, { font: '500 150px Mono', color: col, spacing: -2, glow: over > 0 ? `rgba(224,52,79,${.5 * over})` : null });
    if (s.unit) text(s.unit, 72 + measure(vs, '500 150px Mono', -2) + 14, 545, { font: '400 64px Mono', color: col });
    s.steps.forEach((st, i) => {
      const t0 = s.L[st.line] - .1, t1 = i + 1 < s.steps.length ? s.L[s.steps[i + 1].line] - .1 : s.dur + 1;
      const a = fadeWin(lt, t0, t1, .3);
      label(st.label, 600, a);
      if (st.sub) {
        const ts = st.subLine != null ? s.L[st.subLine] : t0 + 2.6;
        label(st.sub, 642, a * prog(lt, ts, ts + .4), st.value > lim ? C.red : C.gold);
      }
      if (st.source) source(st.source, a);
    });
    const per = s.perIcon || 1, maxV = Math.max(...s.steps.map(x => x.value));
    const n = Math.ceil(maxV / per - 1e-6), cols = 5, sz = 120, gap = 28;
    const x0 = (W - (cols * sz + (cols - 1) * gap)) / 2, y0 = 720;
    for (let i = 0; i < n; i++) {
      const fill = clamp((v - i * per) / per); if (fill <= 0) continue;
      const red = i * per >= lim - 1e-6;
      this.cube(x0 + (i % cols) * (sz + gap), y0 + Math.floor(i / cols) * (sz + gap), sz, fill, red, prog(fill, 0, .35));
    }
    if (s.limit != null) {
      const bx = 76, bw = 928, by = 1090, max = s.max || maxV * 1.15;
      ctx.fillStyle = C.faint; ctx.fillRect(bx, by, bw, 14);
      ctx.fillStyle = C.gold; ctx.fillRect(bx, by, bw * Math.min(v, lim) / max, 14);
      if (v > lim) { ctx.save(); ctx.shadowColor = 'rgba(224,52,79,.8)'; ctx.shadowBlur = 20; ctx.fillStyle = C.red; ctx.fillRect(bx + bw * lim / max, by, bw * (v - lim) / max, 14); ctx.restore(); }
      const lx = bx + bw * lim / max;
      ctx.fillStyle = C.ink; ctx.fillRect(lx - 1.5, by - 22, 3, 58);
      text(s.limitLabel || `SINIR ${lim} ${s.unit || ''}`, lx, by - 34, { font: '400 22px Mono', color: C.ink, align: 'center', spacing: 1.5, alpha: prog(v, lim * .8, lim) });
      small('0', bx, by + 52); small(`${max} ${s.unit || ''}`, bx + bw, by + 52, { align: 'right' });
    }
  },
  cube(x, y, sz, fill, red, a) {
    if (a <= 0) return;
    const k = easeOut(clamp(a)), sc = .6 + .4 * k, cx = x + sz / 2, cy = y + sz / 2, ss = sz * sc;
    ctx.save(); ctx.globalAlpha *= k;
    if (red) { ctx.shadowColor = 'rgba(224,52,79,0.7)'; ctx.shadowBlur = 30; }
    roundRect(cx - ss / 2, cy - ss / 2, ss, ss, 16 * sc); ctx.strokeStyle = red ? C.red : C.gold; ctx.lineWidth = 3; ctx.stroke();
    ctx.shadowBlur = 0; ctx.save(); roundRect(cx - ss / 2, cy - ss / 2, ss, ss, 16 * sc); ctx.clip();
    ctx.fillStyle = red ? 'rgba(224,52,79,0.28)' : 'rgba(200,176,122,0.16)';
    const fh = ss * fill; ctx.fillRect(cx - ss / 2, cy + ss / 2 - fh, ss, fh); ctx.restore();
    ctx.fillStyle = red ? 'rgba(255,160,175,0.5)' : 'rgba(230,214,170,0.45)';
    for (let i = 0; i < 9; i++) {
      const gx = cx - ss * .3 + (i % 3) * ss * .3, gy = cy - ss * .3 + Math.floor(i / 3) * ss * .3;
      if (gy > cy + ss / 2 - fh) { ctx.beginPath(); ctx.arc(gx, gy, 2.5 * sc, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  },
  events(s) {
    const ev = []; const per = s.perIcon || 1, lim = s.limit ?? Infinity;
    for (let t = 0; t < s.dur; t += 1 / 30) {
      const a = this.value(s, t), b = this.value(s, t + 1 / 30);
      for (let i = 0; i < 40; i++) if (a < i * per + .2 && b >= i * per + .2) ev.push(i * per >= lim ? { t, f: 700, a: .22, d: .08 } : { t, f: 1250, a: .16, d: .05 });
    }
    return ev;
  }
};

/* people: grid of people, k of every `of` highlighted.  {big, label, sub?, source, of:7, k:1, rows:7} */
SCENES.people = {
  person(x, y, red, a) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= easeOut(a); const dy = (1 - easeOut(a)) * 12;
    if (red) { ctx.shadowColor = 'rgba(224,52,79,.9)'; ctx.shadowBlur = 26; }
    ctx.fillStyle = red ? C.red : '#3B3934';
    ctx.beginPath(); ctx.arc(x, y - 18 + dy, 11, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y + 22 + dy, 21, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.restore();
  },
  pick(r, c, cols, k) { // deterministic pseudo-random highlighted columns per row
    const h = a => Math.abs(Math.sin((a + 1) * 12.9898 + (r + 1) * 78.233) * 43758.5453) % 1;
    const order = [...Array(cols).keys()].sort((a, b) => h(a) - h(b));
    return order.slice(0, k).includes(c);
  },
  draw(s, lt) {
    const L0 = s.L[0];
    bigNumber(s.big || `${s.k} / ${s.of}`);
    label(s.label, 600); if (s.sub) label(s.sub, 642, prog(lt, L0 + 2.6, L0 + 3), C.red);
    const cols = s.of || 7, rows = s.rows || 7, cw = Math.min(112, 860 / (cols - 1 || 1)), ch = 68;
    const x0 = (W - (cols - 1) * cw) / 2, y0 = 730;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const ap = prog(lt, L0 + (r + c) * .05, L0 + .4 + (r + c) * .05);
      const red = this.pick(r, c, cols, s.k || 1) && lt > L0 + 1.5 + r * .12;
      this.person(x0 + c * cw, y0 + r * ch, red, ap);
    }
    if (s.source) source(s.source);
  },
  events(s) { const r = s.rows || 7; return [...Array(r).keys()].map(i => ({ t: s.L[0] + 1.5 + i * .12, f: 760, a: .16, d: .07 })); }
};

/* dots: N dots, `highlight` of them red; counter counts up.  {total:100, highlight:37, big?, unit?, label, sub?, source, cols:10} */
SCENES.dots = {
  draw(s, lt) {
    const L0 = s.L[0], tot = s.total || 100, hi = s.highlight ?? tot, cols = s.cols || 10;
    const k = ease(prog(lt, L0 + .3, L0 + 2.3));
    bigNumber(s.big || trNum(Math.round(hi * k)), { unit: s.unit });
    label(s.label, 600); if (s.sub) label(s.sub, 642, prog(lt, L0 + 2.5, L0 + 2.9), C.gold);
    const rows = Math.ceil(tot / cols), gx = 860 / (cols - 1), gy = Math.min(48, 500 / Math.max(rows - 1, 1));
    for (let i = 0; i < tot; i++) {
      const c = i % cols, r = Math.floor(i / cols), x = 110 + c * gx, y = 720 + r * gy;
      const ap = prog(lt, L0 + .1 + i * (1.6 / tot), L0 + .4 + i * (1.6 / tot));
      if (i < hi * k + .5 && i < hi) ruby(x, y, Math.min(13, gx * .2), ap, .7);
      else { ctx.save(); ctx.globalAlpha *= ap; ctx.fillStyle = '#34322E'; ctx.beginPath(); ctx.arc(x, y, Math.min(9, gx * .14), 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    }
    if (s.source) source(s.source);
  },
  events(s) { return [0, .5, 1, 1.5].map(d => ({ t: s.L[0] + .4 + d, f: 1100, a: .08, d: .03 })); }
};

/* bars: horizontal comparison.  {big?, unit, label, items:[{label, value, line?, red?}], limit?, limitLabel?, max?, source} */
SCENES.bars = {
  appear(s, i) { const it = s.items[i]; return it.line != null ? s.L[it.line] + .1 : s.L[0] + .3 + i * .45; },
  draw(s, lt) {
    const max = s.max || Math.max(...s.items.map(i => i.value)) * 1.1;
    let shown = null;
    s.items.forEach((it, i) => { if (lt >= this.appear(s, i)) shown = it; });
    if (s.big) bigNumber(s.big, { unit: s.unit });
    else if (shown) bigNumber(trNum(shown.value, shown.dec || 0), { unit: s.unit, color: shown.red ? C.red : C.gold });
    label(s.label, 600);
    const x0 = 76, bw = 928, rowH = Math.min(110, 520 / s.items.length), y0 = 700;
    s.items.forEach((it, i) => {
      const t0 = this.appear(s, i), k = ease(prog(lt, t0, t0 + .9)), a = prog(lt, t0 - .1, t0 + .2);
      const y = y0 + i * rowH;
      text(it.label, x0, y + 26, { font: '400 24px Mono', color: C.ink, spacing: 1.5, alpha: a });
      text(trNum(it.value * k, it.dec || 0) + (s.unit ? ' ' + s.unit : ''), x0 + bw, y + 26, { font: '400 24px Mono', color: it.red ? C.red : C.gold, align: 'right', alpha: a });
      ctx.fillStyle = C.faint; ctx.fillRect(x0, y + 42, bw, 14);
      ctx.save(); if (it.red) { ctx.shadowColor = 'rgba(224,52,79,.8)'; ctx.shadowBlur = 18; }
      ctx.fillStyle = it.red ? C.red : C.gold; ctx.fillRect(x0, y + 42, bw * it.value / max * k, 14); ctx.restore();
    });
    if (s.limit != null) {
      const lx = x0 + bw * s.limit / max, a = prog(lt, s.L[0] + .2, s.L[0] + .6);
      ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = C.ink; ctx.fillRect(lx - 1.5, y0 - 10, 3, s.items.length * rowH); ctx.restore();
      text(s.limitLabel || `SINIR ${s.limit}`, lx, y0 - 22, { font: '400 20px Mono', color: C.ink, align: 'center', spacing: 1.5, alpha: a });
    }
    if (s.source) source(s.source);
  },
  events(s) { return s.items.map((_, i) => ({ t: this.appear(s, i), f: 900, a: .14, d: .06 })); }
};

/* sensor: CGM cross-section with measurement counter.  {value:1440, label, source} */
SCENES.sensor = {
  P: Array.from({ length: 46 }, (_, i) => ({ x: (i * 137.5) % 900 + 90, y: 990 + ((i * 53) % 150), v: .3 + (i % 5) * .12, ph: i })),
  draw(s, lt) {
    const L0 = s.L[0], tEnd = s.L[1] != null ? s.L[1] + 2.5 : L0 + 5;
    bigNumber(trNum(lerp(0, s.value || 1440, ease(prog(lt, L0 + 2.6, tEnd)))));
    label(s.label, 600);
    const top = 860;
    ctx.fillStyle = '#2B201D'; ctx.fillRect(60, top, 960, 34);
    ctx.fillStyle = '#1B1513'; ctx.fillRect(60, top + 34, 960, 86);
    ctx.fillStyle = '#120E0D'; ctx.fillRect(60, top + 120, 960, 190);
    ctx.strokeStyle = 'rgba(200,176,122,0.08)'; ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(130 + i * 105 + (i % 2) * 30, top + 200 + (i % 3) * 30, 44, 30, (i % 4) * .4, 0, Math.PI * 2); ctx.stroke(); }
    for (const p of this.P) {
      ctx.fillStyle = 'rgba(200,176,122,0.75)'; ctx.beginPath();
      ctx.arc(60 + ((p.x + lt * 30 * p.v) % 960), p.y + Math.sin(lt * 1.5 + p.ph) * 8, 3.4, 0, Math.PI * 2); ctx.fill();
    }
    small('DERİ', 1004, top + 24, { align: 'right', font: '400 19px Mono' });
    small('HÜCRELER ARASI SIVI', 1004, top + 296, { align: 'right', font: '400 19px Mono', color: C.gray, alpha: prog(lt, L0 + 2.0, L0 + 2.4) });
    const sy = lerp(560, top - 54, easeOut(prog(lt, L0, L0 + 1.2)));
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 20;
    const sg = ctx.createLinearGradient(0, sy, 0, sy + 54); sg.addColorStop(0, '#E9E5DC'); sg.addColorStop(1, '#A9A49A');
    ctx.fillStyle = sg; roundRect(390, sy, 300, 54, 27); ctx.fill(); ctx.restore();
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(540, sy + 27, 12, 0, Math.PI * 2); ctx.fill();
    small('SENSÖR', 720, sy + 34, { color: C.gray, font: '400 19px Mono', alpha: prog(lt, L0 + 1.2, L0 + 1.6) });
    const fl = easeOut(prog(lt, L0 + 1.2, L0 + 2.0)) * 190;
    if (fl > 0) {
      ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(540, top); ctx.lineTo(540, top + fl); ctx.stroke();
      small('İNCE UÇ', 560, top + 175, { color: C.gold, font: '400 19px Mono', alpha: prog(lt, L0 + 2.0, L0 + 2.4) });
    }
    if (lt > L0 + 2.2) {
      for (let k = 0; k < 3; k++) {
        const pt = ((lt - L0 - 2.2) + k * .5) % 1.5 / 1.5;
        ctx.strokeStyle = `rgba(200,176,122,${(1 - pt) * .6})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(540, top + 190, 10 + pt * 90, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(540, top + 190, 7, 0, Math.PI * 2); ctx.fill();
    }
    if (s.source) source(s.source);
  },
  events(s) { const ev = []; for (let t = s.L[0] + 2.2; t < s.dur - .3; t += .5) ev.push({ t, f: 1800, a: .07, d: .03 }); return ev; }
};

/* day: 24h glucose curve.  {label, meals:[{h, amp, tau?, label, red?}], base:88, band:[70,140], hi:140, source} */
SCENES.day = {
  f(s, h) { return (s.base || 88) + s.meals.reduce((acc, m) => acc + bump(h - m.h, m.amp, m.tau || .7), 0) + 3 * Math.sin(h * 1.7); },
  draw(s, lt) {
    const L0 = s.L[0], end = s.L[1] != null ? s.L[1] + 1.8 : s.dur - .5;
    const head = lerp(0, 24, ease(prog(lt, L0, end))), v = this.f(s, head), hi = s.hi || 140;
    bigNumber(String(Math.round(v)), { color: v > hi ? C.red : C.gold });
    label(s.label, 600);
    const x0 = 130, w = 860, y0 = 720, h = 420, Y = chart(x0, y0, w, h, 50, 210, s.band || [70, 140]);
    strokeCurve(hh => this.f(s, hh), x0, w, 0, 24, Y, head, gcol(hi));
    ctx.fillStyle = v > hi ? C.red : C.ink; ctx.beginPath(); ctx.arc(x0 + head / 24 * w, Y(v), 8, 0, Math.PI * 2); ctx.fill();
    ['00', '06', '12', '18', '24'].forEach((t, i) => small(t, x0 + i * w / 4, y0 + h + 36, { align: 'center' }));
    s.meals.forEach(m => {
      const px = x0 + (m.h + (m.tau || .7)) / 24 * w;
      small(m.label, px, Y(this.f(s, m.h + (m.tau || .7))) - 30, { align: 'center', color: m.red ? C.red : C.gray, alpha: prog(head, m.h, m.h + .6) });
    });
    if (s.source) source(s.source);
  },
  events(s) { return []; }
};

/* spike: zoom on one rise with insulin bars and consequence items.  {amp:92, label, items:[...], itemsLine:1, source} */
SCENES.spike = {
  draw(s, lt) {
    const L0 = s.L[0], f = h => 88 + bump(h - 13, s.amp || 92, .55);
    const head = lerp(12.5, 16, ease(prog(lt, L0, L0 + 2.4)));
    let peak = 0; for (let i = 0; i <= 60; i++) peak = Math.max(peak, f(12.5 + i * (head - 12.5) / 60));
    bigNumber(String(Math.round(peak)), { color: peak > 140 ? C.red : C.gold });
    label(s.label, 600);
    const x0 = 130, w = 860, y0 = 700, h = 300, Y = chart(x0, y0, w, h, 50, 200);
    strokeCurve(f, x0, w, 12.5, 16, Y, head, gcol(140));
    const by = 1100, n = 18;
    small('İNSÜLİN', 76, by - 64, { color: C.gold, spacing: 2, alpha: prog(lt, L0 + .6, L0 + 1) });
    for (let i = 0; i < n; i++) {
      const hh = 12.5 + (i + .5) * 3.5 / n; if (hh > head) break;
      const ins = bump(hh - 13.25, 1, .6);
      ctx.fillStyle = `rgba(200,176,122,${.35 + ins * .6})`; ctx.fillRect(x0 + (i + .2) * w / n, by - (6 + ins * 54), w / n * .6, 6 + ins * 54);
    }
    const ti = s.L[s.itemsLine ?? 1] ?? L0 + 3;
    (s.items || []).forEach((it, i) => {
      const a = prog(lt, ti + i * .35, ti + .4 + i * .35), x = 200 + i * 340;
      ruby(x - 70, 1172, 9, a, .8); text(it, x - 50, 1180, { font: '400 24px Mono', color: C.ink, spacing: 2, alpha: a });
    });
    if (s.source) source(s.source);
  },
  events(s) { const ti = s.L[s.itemsLine ?? 1] ?? s.L[0] + 3; return (s.items || []).map((_, i) => ({ t: ti + i * .35, f: 640, a: .15, d: .08 })); }
};

/* compare: two response curves.  {a:{amp,label}, b:{amp,label}, big:'−%37', counter:37, prefix:'−%', bigLine:1, label, xLabels, source} */
SCENES.compare = {
  draw(s, lt) {
    const L0 = s.L[0], tb = s.L[s.bigLine ?? 1] ?? L0 + 2.6;
    const pct = lerp(0, s.counter ?? 0, ease(prog(lt, tb, tb + 1.2)));
    bigNumber(s.counter != null ? (s.prefix ?? '') + Math.round(pct) + (s.suffix ?? '') : s.big, { alpha: prog(lt, tb - .2, tb + .1) });
    label(s.label, 600);
    const x0 = 130, w = 860, y0 = 720, h = 380, Y = chart(x0, y0, w, h, 0, 120, null);
    const fa = m => bump(m, s.a.amp, s.a.tau || 50), fb = m => bump(m, s.b.amp, s.b.tau || 58);
    const head = lerp(0, 120, ease(prog(lt, L0, L0 + 2.3)));
    strokeCurve(fa, x0, w, 0, 120, Y, head, () => C.red); strokeCurve(fb, x0, w, 0, 120, Y, head, () => C.gold);
    (s.xLabels || ['0', '30', '60', '90', '120 dk']).forEach((t, i, arr) => small(t, x0 + i * w / (arr.length - 1), y0 + h + 36, { align: 'center' }));
    const m60 = x0 + w / 2, ga = prog(lt, tb - .2, tb + .2);
    if (ga > 0) {
      ctx.save(); ctx.globalAlpha *= ga; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.moveTo(m60, Y(fa(60)) - 10); ctx.lineTo(m60, y0 + h); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.ink; [fa(60), fb(60)].forEach(v => { ctx.beginPath(); ctx.arc(m60, Y(v), 7, 0, Math.PI * 2); ctx.fill(); }); ctx.restore();
    }
    text(s.a.label, x0 + w, Y(fa(30)) - 60, { font: '400 22px Mono', color: C.red, align: 'right', spacing: 1.5, alpha: prog(lt, L0 + 1, L0 + 1.4) });
    text(s.b.label, x0 + w, Y(fb(100)) + 70, { font: '400 22px Mono', color: C.gold, align: 'right', spacing: 1.5, alpha: prog(lt, L0 + 1.4, L0 + 1.8) });
    if (s.source) source(s.source);
  },
  events(s) { return []; }
};

/* flatten: a spike that softens (habit effect) with footsteps.  {counter:10, unit:'dk', label, from:95, to:55, steps:true, source} */
SCENES.flatten = {
  draw(s, lt) {
    const L0 = s.L[0];
    bigNumber(String(Math.round(lerp(0, s.counter ?? 10, ease(prog(lt, L0 + .6, L0 + 3.2))))) + (s.unit ? ' ' + s.unit : ''));
    label(s.label, 600);
    const x0 = 130, w = 860, y0 = 720, h = 330, Y = chart(x0, y0, w, h, 50, 210);
    const k = ease(prog(lt, L0 + .8, L0 + 3.4));
    const f = m => 92 + lerp(bump(m - 10, s.from || 95, 40), bump(m - 10, s.to || 55, 38), k);
    strokeCurve(f, x0, w, 0, 150, Y, 150, gcol(140));
    if (s.steps !== false) for (let i = 0; i < 12; i++) {
      const a = prog(lt, L0 + .6 + i * .22, L0 + .9 + i * .22);
      ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = C.gold; ctx.beginPath();
      ctx.ellipse(x0 + (10 + i * 8) / 150 * w, y0 + h + 40 + (i % 2) * 18, 7, 11, .3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    small('TEMSİLİ', x0 + w, y0 + 10, { align: 'right' });
    if (s.source) source(s.source);
  },
  events(s) { return s.steps === false ? [] : [...Array(12).keys()].map(i => ({ t: s.L[0] + .6 + i * .22, f: 300, a: .12, d: .03 })); }
};

/* statement: big headline text + optional icon list (generic text scene).  {big?, title, label?, bullets?:[...], source} */
SCENES.statement = {
  draw(s, lt) {
    const L0 = s.L[0];
    if (s.big) bigNumber(s.big, { unit: s.unit, color: s.red ? C.red : C.gold });
    if (s.label) label(s.label, 600);
    if (s.title) {
      const lines = wrapLines(s.title, '500 64px Mono', 900);
      lines.forEach((l, i) => text(l, 76, 800 + i * 84, { font: '500 64px Mono', color: C.ink, alpha: prog(lt, L0 + i * .2, L0 + .4 + i * .2) }));
    }
    (s.bullets || []).forEach((b, i) => {
      const tb = b.line != null ? s.L[b.line] : L0 + .6 + i * .5, a = prog(lt, tb, tb + .4);
      const txt = typeof b === 'string' ? b : b.text, y = (s.title ? 1000 : 760) + i * 70;
      ruby(96, y - 9, 9, a, .7); text(txt, 126, y, { font: '400 30px Mono', color: C.ink, spacing: 1, alpha: a });
    });
    if (s.source) source(s.source);
  },
  events(s) { return (s.bullets || []).map((b, i) => ({ t: b.line != null ? s.L[b.line] : s.L[0] + .6 + i * .5, f: 900, a: .12, d: .06 })); }
};

/* close: series sign-off.  {title:'ARALIKTA KAL', disclaimer:[...]} */
SCENES.close = {
  draw(s, lt) {
    const x0 = 130, w = 860, y0 = 760, h = 300, Y = chart(x0, y0, w, h, 50, 210);
    const f = hh => 100 + 10 * Math.sin(hh * 1.3 + lt * .8) + 6 * Math.sin(hh * 3.1);
    strokeCurve(f, x0, w, 0, 24, Y, lerp(0, 24, ease(prog(lt, 0, 2.2))), () => C.gold, 4);
    text(s.title || 'ARALIKTA KAL', 540, 600, { font: '500 64px Mono', color: C.gold, align: 'center', spacing: 4, alpha: prog(lt, .4, 1), glow: 'rgba(200,176,122,.6)' });
    const d = s.disclaimer || ['BİLGİLENDİRME AMAÇLIDIR · TIBBİ TAVSİYE DEĞİLDİR', 'TEDAVİ İÇİN DOKTORUNUZA DANIŞIN'];
    d.forEach((l, i) => small(l, 540, 1225 + i * 33, { align: 'center' }));
  },
  events(s) { return []; }
};

/* ======================================================================
 * END CARD: animated "Glikoz Günlüğüm" logo on a cream badge + CTA rows.
 * Always appended after the last spoken line. Episode may set
 * cta: {save, comment, share}.
 * ====================================================================== */
const ENDCARD_DUR = 5.6;
const LOGO = { cream: '#F8F4EE', ink: '#1D2424', olive: '#5E6B3B', oliveSoft: 'rgba(94,107,59,.55)' };
const CTA_DEFAULT = {
  save: 'Kaydet — sonra lazım olacak.',
  comment: 'Sende nasıl? Yorumlara yaz.',
  share: 'Bilmesi gereken birine gönder.'
};
function logoWaveY(x) { // logo units: disc radius = 205, origin at disc centre
  return -32 + 3 * Math.sin((x + 104) / 14) - 46 * Math.exp(-Math.pow((x - 11) / 10, 2)) + 10 * Math.exp(-Math.pow((x - 27) / 7, 2));
}
function drawLogo(cx, cy, R, lt) {
  const k = R / 205;
  const P = (x, y) => [cx + x * k, cy + y * k];
  // badge
  const a0 = easeOut(prog(lt, 0, .6)), sc = .92 + .08 * a0;
  ctx.save(); ctx.globalAlpha *= a0;
  ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 18;
  ctx.fillStyle = LOGO.cream; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
  ctx.shadowColor = 'transparent';
  const vg = ctx.createRadialGradient(cx - R * .3, cy - R * .4, R * .1, cx, cy, R);
  vg.addColorStop(0, 'rgba(255,255,255,.35)'); vg.addColorStop(1, 'rgba(200,190,175,.18)');
  ctx.fillStyle = vg; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
  // serif G
  text('G', ...P(-17, -26), { font: `400 ${Math.round(178 * k)}px Serif`, color: LOGO.ink, align: 'center', alpha: easeOut(prog(lt, 1.0, 1.6)) });
  // dotted arc from top of G to the ring
  const nd = 12, arcA = prog(lt, .9, 1.7);
  for (let i = 0; i < nd; i++) {
    if (i / nd > arcA) break;
    const th = -Math.PI / 2 + (i / (nd - 1)) * (Math.PI / 2 - .18);
    const [x, y] = P(-5 + 100 * Math.cos(th), -66 + 100 * Math.sin(th) - 6);
    ctx.fillStyle = LOGO.ink; ctx.beginPath(); ctx.arc(x, y, 2.6 * k, 0, Math.PI * 2); ctx.fill();
  }
  // glucose wave drawing itself
  const wx = lerp(-104, 93, ease(prog(lt, .4, 1.6)));
  ctx.strokeStyle = LOGO.olive; ctx.lineWidth = 3.2 * k; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let x = -104; x <= wx; x += 1) { const [px, py] = P(x, logoWaveY(x)); x === -104 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
  ctx.stroke();
  ctx.fillStyle = LOGO.olive; ctx.beginPath(); ctx.arc(...P(-104, logoWaveY(-104)), 5 * k, 0, Math.PI * 2); ctx.fill();
  // ring at the end + one pulse
  if (wx >= 92) {
    const [rx, ry] = P(100, logoWaveY(93));
    ctx.strokeStyle = LOGO.olive; ctx.lineWidth = 2.6 * k; ctx.beginPath(); ctx.arc(rx, ry, 8 * k, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = LOGO.olive; ctx.beginPath(); ctx.arc(rx, ry, 3.4 * k, 0, Math.PI * 2); ctx.fill();
    const pp = prog(lt, 1.6, 2.4);
    if (pp > 0 && pp < 1) { ctx.strokeStyle = `rgba(94,107,59,${(1 - pp) * .7})`; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.arc(rx, ry, (8 + pp * 26) * k, 0, Math.PI * 2); ctx.stroke(); }
  }
  // wordmark
  const wa = prog(lt, 1.5, 2.1), wd = (1 - easeOut(wa)) * 10;
  text('Glikoz', ...P(0, 88 + wd), { font: `500 ${Math.round(66 * k)}px Sans`, color: LOGO.ink, align: 'center', alpha: wa, spacing: -1 });
  const ga = prog(lt, 1.8, 2.4);
  text('GÜNLÜĞÜM', ...P(4, 124), { font: `400 ${Math.round(17 * k)}px Sans`, color: LOGO.olive, align: 'center', alpha: ga, spacing: 7 * k });
  ctx.save(); ctx.globalAlpha *= ga; ctx.fillStyle = LOGO.ink; const [dx, dy] = P(0, 150); ctx.fillRect(dx - 12 * k, dy, 24 * k, 1.6 * k); ctx.restore();
  ctx.restore();
}
function icon(kind, x, y, s, color) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();
  if (kind === 'save') { // bookmark
    ctx.moveTo(x - s * .38, y - s * .5); ctx.lineTo(x + s * .38, y - s * .5); ctx.lineTo(x + s * .38, y + s * .5);
    ctx.lineTo(x, y + s * .2); ctx.lineTo(x - s * .38, y + s * .5); ctx.closePath();
  } else if (kind === 'comment') { // speech bubble
    ctx.arc(x, y - s * .02, s * .44, Math.PI * .72, Math.PI * .62 + Math.PI * 2);
    ctx.lineTo(x - s * .44, y + s * .46); ctx.closePath();
  } else { // paper plane
    ctx.moveTo(x - s * .5, y - s * .42); ctx.lineTo(x + s * .5, y - s * .42); ctx.lineTo(x - s * .05, y + s * .5); ctx.lineTo(x - s * .12, y - .02 * s); ctx.closePath();
    ctx.moveTo(x - s * .12, y - .02 * s); ctx.lineTo(x + s * .5, y - s * .42);
  }
  ctx.stroke(); ctx.restore();
}
function drawEndcard(lt) {
  const R = 300, cx = 540, cy = 780;
  drawLogo(cx, cy, R, lt);
  const cta = Object.assign({}, CTA_DEFAULT, EP.cta || {});
  const rows = [
    { k: 'save', txt: cta.save, t: 2.5, size: 56, font: '400 40px Jost', color: C.gold, txtColor: C.ink },
    { k: 'comment', txt: cta.comment, t: 3.1, size: 42, font: '300 34px Jost', color: C.gray, txtColor: '#BDB8AF' },
    { k: 'share', txt: cta.share, t: 3.6, size: 42, font: '300 34px Jost', color: C.gray, txtColor: '#BDB8AF' }
  ];
  let y = 1215;
  rows.forEach((r, i) => {
    const a = easeOut(prog(lt, r.t, r.t + .5)), dx = (1 - a) * 20;
    ctx.save(); ctx.globalAlpha *= a;
    if (i === 0) { // highlighted pill for the main CTA
      ctx.fillStyle = 'rgba(200,176,122,0.10)'; ctx.strokeStyle = 'rgba(200,176,122,0.45)'; ctx.lineWidth = 2;
      roundRect(120, y - 58, 840, 104, 52); ctx.fill(); ctx.stroke();
      if (lt > r.t + .6) { const b = .5 + .5 * Math.sin((lt - r.t) * 4); icon('save', 200, y - 6, r.size * (1 + .05 * b), C.gold); }
      else icon('save', 200, y - 6, r.size, C.gold);
    } else icon(r.k, 200, y - 6, r.size, r.color);
    let font = r.font; const m = font.match(/^(\d+) (\d+)px (.+)$/);
    for (let px = +m[2]; px > 22 && measure(r.txt, font) > 660; px -= 1) font = `${m[1]} ${px}px ${m[3]}`;
    text(r.txt, 260 + dx, y + 8, { font, color: r.txtColor });
    ctx.restore();
    y += i === 0 ? 120 : 88;
  });
}

/* ======================================================================
 * TIMELINE
 * ====================================================================== */
let EP = null, TL = null;
function setup(episode, timing) {
  EP = episode;
  const endStart = timing.lines[timing.lines.length - 1].end + 0.9;
  TL = { total: endStart + ENDCARD_DUR, endStart, scenes: [], captions: [] };
  let li = 0;
  episode.scenes.forEach(sc => {
    const n = sc.lines.length, lines = timing.lines.slice(li, li + n);
    const start = lines[0].start - SCENE_LEAD;
    TL.scenes.push(Object.assign({}, sc, { _start: start, _lines: lines }));
    sc.lines.forEach((ln, k) => {
      const t = typeof ln === 'string' ? ln : ln.text;
      const parts = t.split(' | '), tl = lines[k];
      const total = parts.reduce((a, p) => a + p.length, 0); let acc = 0;
      parts.forEach(p => {
        const ps = tl.start + (tl.end - tl.start) * acc / total; acc += p.length;
        TL.captions.push({ start: ps - LEAD, text: p });
      });
    });
    li += n;
  });
  TL.scenes.forEach((s, i) => {
    s._end = i + 1 < TL.scenes.length ? TL.scenes[i + 1]._start + .35 : TL.endStart + .4;
    s.dur = s._end - s._start; s.L = s._lines.map(l => l.start - s._start);
  });
  TL.captions.forEach((c, i) => { c.end = i + 1 < TL.captions.length ? TL.captions[i + 1].start : TL.endStart + .2; });
  return { scenes: TL.scenes.length, captions: TL.captions.length, total: TL.total };
}
function background() {
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(540, 900, 50, 540, 900, 900);
  g.addColorStop(0, 'rgba(40,36,30,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const ba = TL && TL.endStart != null && background.t != null ? 1 - prog(background.t, TL.endStart - .2, TL.endStart + .3) : 1;
  text(EP.brand || 'GLİKOZ GÜNLÜĞÜM', 1008, 345, { font: '400 26px Jost', color: C.brand, align: 'right', spacing: 4, alpha: ba });
  if (EP.id) text('#' + EP.id, 1008, 380, { font: '400 20px Mono', color: C.grayDim, align: 'right', spacing: 2, alpha: ba });
}
function drawCaptions(t) {
  for (const c of TL.captions) {
    const a = fadeWin(t, c.start, c.end, .25); if (a <= 0) continue;
    const font = '300 50px Jost', lines = wrapLines(c.text, font, 860), lh = 66, y0 = 1385 - (lines.length - 1) * lh / 2;
    const dy = (1 - easeOut(prog(t, c.start, c.start + .4))) * 14;
    lines.forEach((l, i) => text(l, 540, y0 + i * lh + dy, { font, color: C.ink, align: 'center', alpha: a }));
  }
}
function render(t) {
  background.t = t; background();
  TL.scenes.forEach((s, i) => {
    const isLast = i === TL.scenes.length - 1;
    const a = fadeWin(t, s._start, s._end, isLast ? .8 : .45); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; SCENES[s.type].draw(s, t - s._start, a); ctx.restore();
  });
  drawCaptions(t);
  if (t > TL.endStart - .3) { ctx.save(); ctx.globalAlpha = fadeWin(t, TL.endStart, TL.total + 5, .4); drawEndcard(t - TL.endStart); ctx.restore(); }
  if (t > TL.total - .5) { ctx.save(); ctx.globalAlpha = prog(t, TL.total - .5, TL.total); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}
function audioEvents() {
  const ev = [];
  TL.scenes.forEach((s, i) => {
    if (i > 0) ev.push({ t: s._start + .3, swell: true });
    (SCENES[s.type].events(s) || []).forEach(e => ev.push(Object.assign({}, e, { t: e.t + s._start })));
  });
  const e0 = TL.endStart;
  ev.push({ t: e0 + .1, swell: true }, { t: e0 + 1.6, f: 880, a: .16, d: .35 }, { t: e0 + 1.75, f: 1320, a: .10, d: .4 },
          { t: e0 + 2.5, f: 1100, a: .10, d: .06 }, { t: e0 + 3.1, f: 990, a: .07, d: .05 }, { t: e0 + 3.6, f: 990, a: .07, d: .05 });
  return ev;
}
function renderCover() {
  background();
  // decorative day curve under the title
  const x0 = 130, w = 820, Y = chart(x0, 1180, w, 240, 50, 210);
  const f = h => 92 + bump(h - 8, 40, .7) + bump(h - 13, 85, .55) + bump(h - 20, 48, .75) + 3 * Math.sin(h * 1.7);
  strokeCurve(f, x0, w, 0, 24, Y, 24, gcol(140), 5);
  const t = EP.coverTitle || EP.title, font = '500 92px Mono', lines = wrapLines(t.toLocaleUpperCase('tr-TR'), font, 900);
  const y0 = 820 - (lines.length - 1) * 55;
  lines.forEach((l, i) => text(l, 540, y0 + i * 110, { font, color: C.gold, align: 'center', glow: 'rgba(200,176,122,.4)' }));
  if (EP.coverSub) text(EP.coverSub, 540, y0 + lines.length * 110 + 30, { font: '300 46px Jost', color: C.ink, align: 'center' });
}
window.setup = setup; window.render = render; window.audioEvents = audioEvents; window.renderCover = renderCover;
window.getTotal = () => TL.total;
window.ready = Promise.all(['500 150px Mono', '400 30px Mono', '300 50px Jost', '400 26px Jost', '400 40px Jost', '400 100px Serif', '500 60px Sans', '400 20px Sans'].map(f => document.fonts.load(f, 'AİŞĞÜÇÖıa1')));
