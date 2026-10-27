// The in-page part of scripts/checks/black-ink.ts, as plain JavaScript: it runs inside the browser (page.evaluate),
// so it is kept out of the TypeScript file, where tsx would add helpers the browser does not have.
// Given the page's path, returns every visible piece of text that is not #14100d at full strength (see black-ink.ts).
/* eslint-disable @typescript-eslint/no-unused-expressions -- a bare function, read as text by black-ink.ts */
(path) => {
    const INK = [20, 16, 13], ACCENT = [122, 22, 18];
    const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const same = (c, t) => Math.abs(c.r - t[0]) <= 1 && Math.abs(c.g - t[1]) <= 1 && Math.abs(c.b - t[2]) <= 1;
    const out = [];
    const opacityOf = (el) => { let o = 1; for (let e = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o; };
    const label = (el) => { const parts = []; for (let e = el; e && parts.length < 4; e = e.parentElement) { const id = e.id ? `#${e.id}` : ''; const cls = typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''; parts.unshift(e.tagName.toLowerCase() + id + cls); } return parts.join(' > '); };
    const seen = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = (n.textContent || '').replace(/\s+/g, ' ').trim();
      if (!t || !/[\p{L}\p{N}£$%]/u.test(t)) continue;
      const el = n.parentElement; if (!el || seen.has(el)) continue; seen.add(el);
      if (el.closest('script,style,noscript,svg,template')) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const range = document.createRange(); range.selectNodeContents(n); const r = range.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue; // clipped to 1px for screen readers, or empty
      const op = opacityOf(el); if (op < 0.01) continue; // hidden on purpose
      const c = parse(cs.color); if (!c) continue;
      const alpha = Math.round(c.a * op * 1000) / 1000;
      // Light text (white, cream) is on a dark or red background: buttons, the red strip button, dark panels. The
      // folder paper is an image, so the text colour, not the background, tells the two apart.
      if (lum(c) > 0.4) continue;
      if (same(c, ACCENT) && alpha >= 0.999) continue;
      if (same(c, INK) && alpha >= 0.999) continue;
      out.push({ page: path, text: t.slice(0, 40), colour: `rgb(${c.r},${c.g},${c.b})`, alpha, tag: el.tagName.toLowerCase(), path: label(el) });
    }
    for (const inp of Array.from(document.querySelectorAll('input[placeholder],textarea[placeholder]'))) {
      const r = inp.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || !inp.placeholder) continue;
      const c = parse(getComputedStyle(inp, '::placeholder').color); if (!c) continue;
      const alpha = Math.round(c.a * opacityOf(inp) * 1000) / 1000;
      if (same(c, INK) && alpha >= 0.999) continue;
      out.push({ page: path, text: inp.placeholder.slice(0, 40), colour: `rgb(${c.r},${c.g},${c.b})`, alpha, tag: 'placeholder', path: label(inp), placeholder: true });
    }
    return out;
  }
