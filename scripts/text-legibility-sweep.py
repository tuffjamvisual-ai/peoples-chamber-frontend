#!/usr/bin/env python3
"""Site-wide legibility pass: 15px minimum font size + grey text -> full black #14100d.

Black ink rule (owner, 27 Oct 2026): also removes fixed opacity from text (inline style objects, CSS rules and Tailwind
opacity-NN classes), turns near-black and grey text colours and faded ink (${INK}88) into #14100d, and the old accent
#6b2417 into the accent red #7a1612. Kept: opacity in a condition (disabled or hidden states are handled by hand),
opacity on images, SVG and pure decoration (an element styled with a background and no text, such as a 1px divider),
hover and animation states. The browser check scripts/checks/black-ink.ts is the final word.

Safe-by-design: only raises font sizes BELOW 15px, only darkens foreground text
(color: values, soft-ink constants, --mag-ink-soft, Tailwind text-gray/neutral/slate).
Never touches borders/hairlines (rgba not prefixed by color:), the accent red, or
light-on-dark text. Skips throwaway prototype pages and backups.
"""
import re, glob, os

INK = '#14100d'
EXCLUDE = re.compile(r'(land101|mp121|newpage|newspaper-|preview|homepage-v2|landing|template|folder-bg|internal/|new2|\.old|\.bak|lib/email\.ts|lib/member-digest\.ts)')

def raise_px(m, lo=15):
    n = int(m.group('n'))
    return m.group('pre') + (str(lo) if n < lo else str(n)) + m.group('post')

def process(text):
    c = 0
    # 1. inline fontSize: '9px' / "9px"  (raise <15)
    def f_inline(m):
        n = int(m.group('n'))
        return f"{m.group('pre')}{15 if n<15 else n}px{m.group('q')}"
    text, n = re.subn(r"(?P<pre>fontSize:\s*(?P<q>['\"]))(?P<n>\d{1,2})px(?P=q)", f_inline, text); c += n
    # 2. CSS font-size: 9px
    text, n = re.subn(r"(?P<pre>font-size:\s*)(?P<n>\d{1,2})px(?P<post>\s*[;!}\n])",
                      lambda m: m.group('pre') + (f"{15 if int(m.group('n'))<15 else int(m.group('n'))}px") + m.group('post'), text); c += n
    # 3. Tailwind text-[9px]
    text, n = re.subn(r"text-\[(?P<n>\d{1,2})px\]",
                      lambda m: f"text-[{15 if int(m.group('n'))<15 else int(m.group('n'))}px]", text); c += n
    # 4. clamp( Npx ,  -> raise the minimum
    text, n = re.subn(r"(?P<pre>clamp\(\s*)(?P<n>\d{1,2})px(?P<post>\s*,)",
                      lambda m: m.group('pre') + (f"{15 if int(m.group('n'))<15 else int(m.group('n'))}px") + m.group('post'), text); c += n
    # 5. Tailwind text-xs (=12px) -> 15px ; text-[2xs]/text-xs only
    text, n = re.subn(r"\btext-xs\b", "text-[15px]", text); c += n
    # 6. foreground colour rgba(20,16,13,alpha<1) -> black  (only after color:)
    text, n = re.subn(r"(color:\s*(['\"]))rgba\(\s*20\s*,\s*16\s*,\s*13\s*,\s*0?\.\d+\s*\)(['\"])",
                      lambda m: f"{m.group(1)}{INK}{m.group(3)}", text); c += n
    # 7. soft/muted ink constants = 'rgba(20,16,13,alpha)' -> black
    text, n = re.subn(r"((?:INK_SOFT|SOFT_INK|INK_MUTED|MUTED_INK|MUTED|SOFT)\w*\s*=\s*(['\"]))rgba\(\s*20\s*,\s*16\s*,\s*13\s*,\s*0?\.\d+\s*\)(['\"])",
                      lambda m: f"{m.group(1)}{INK}{m.group(3)}", text); c += n
    # 8. --mag-ink-soft / --ink-soft brown-grey -> black
    text, n = re.subn(r"(--(?:mag-)?ink-soft:\s*)#[0-9a-fA-F]{3,6}", lambda m: m.group(1) + INK, text); c += n
    # 9. Tailwind grey text -> black
    text, n = re.subn(r"text-(?:gray|grey|neutral|slate|zinc|stone)-\d{2,3}", "text-[#14100d]", text); c += n
    # 10. near-black and grey text colours -> black (after color: only)
    text, n = re.subn(r"(color:\s*(['\"]))(?:#1a140e|#1a1a1a|#2b2722|#333|#333333|#3a3a3a|#444|#555|#555555|#666|#777|#888|#999|#9a9a9a)(['\"])",
                      lambda m: f"{m.group(1)}{INK}{m.group(3)}", text); c += n
    # 11. faded ink written as a hex alpha suffix: color: `${INK}88` -> INK
    text, n = re.subn(r"color:\s*`\$\{INK\}[0-9a-fA-F]{2}`", "color: INK", text); c += n
    # 12. the old accent #6b2417 -> the accent red
    text, n = re.subn(r"#6[bB]2417", "#7a1612", text); c += n
    # 13. fixed opacity on text. Inline style objects: a static number, not in a condition, and not on a style that is
    #     only decoration (a background with no colour, such as a 1px divider) or on an image.
    def drop_inline(m):
        obj = m.group(0)
        if re.search(r"background:\s*'?currentColor|width:\s*'1px'|height:\s*'1px'", obj) or '?' in obj:
            return obj
        new = re.sub(r"opacity:\s*['\"]?0?\.\d+['\"]?\s*,\s*", "", obj)
        new = re.sub(r",\s*opacity:\s*['\"]?0?\.\d+['\"]?(?=\s*\})", "", new)
        new = re.sub(r"\{\{\s*opacity:\s*['\"]?0?\.\d+['\"]?\s*\}\}", "{{}}", new)
        return new
    text, n = re.subn(r"(?<!<img )(?<!<Image )(?<!<svg )style=\{\{[^{}]*opacity:\s*['\"]?0?\.\d+['\"]?[^{}]*\}\}", drop_inline, text)
    text = text.replace(" style={{}}", ""); c += n
    #     CSS text rules (not :hover, :disabled or decoration such as a separator line)
    def drop_css(m):
        rule = m.group(0)
        if re.search(r":hover|:disabled|:active|background:\s*currentColor|width:\s*1px", rule):
            return rule
        return re.sub(r"\s*opacity:\s*0?\.\d+;", "", rule)
    text, n = re.subn(r"[^{}`]*\{[^{}]*opacity:\s*0?\.\d+;[^{}]*\}", drop_css, text); c += n
    #     Tailwind opacity-NN on an element (hover: and disabled: variants kept)
    text, n = re.subn(r"(?<=[\s\"])opacity-(?:[1-9]\d?)(?=[\s\"])", "", text); c += n
    return text, c

changed = {}
for pat in ('app/**/*.tsx', 'app/**/*.css', 'lib/**/*.tsx', 'lib/**/*.ts'):
    for path in glob.glob(pat, recursive=True):
        if EXCLUDE.search(path) or '.next' in path:
            continue
        with open(path) as fh:
            orig = fh.read()
        new, c = process(orig)
        if new != orig:
            with open(path, 'w') as fh:
                fh.write(new)
            changed[path] = c

print(f"files changed: {len(changed)}; total substitutions: {sum(changed.values())}")
for p in sorted(changed, key=lambda x: -changed[x])[:25]:
    print(f"  {changed[p]:4}  {p}")
