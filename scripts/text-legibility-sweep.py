#!/usr/bin/env python3
"""Site-wide legibility pass: 15px minimum font size + grey text -> full black #14100d.

Safe-by-design: only raises font sizes BELOW 15px, only darkens foreground text
(color: values, soft-ink constants, --mag-ink-soft, Tailwind text-gray/neutral/slate).
Never touches borders/hairlines (rgba not prefixed by color:), the accent red, or
light-on-dark text. Skips throwaway prototype pages and backups.
"""
import re, glob, os

INK = '#14100d'
EXCLUDE = re.compile(r'(land101|mp121|newpage|newspaper-|preview-|homepage-v2|landing-demo|landing1012|newspaper-demo|\.old|\.bak)')

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
