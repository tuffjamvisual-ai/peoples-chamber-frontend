#!/usr/bin/env python3
# Adds verified links to "How this piece was checked" records in lib/editorials/*.ts.
# Input: a JSON map {"<slug>#<index>": "<url>"}. Each matching record string in the
# recordsReviewed array becomes { text: `...`, url: '...' }. Records already turned into
# objects are left alone, so the script can be re-run with more links.
import json, re, sys, glob
links = json.load(open(sys.argv[1]))
by_slug = {}
for k, u in links.items():
    s, i = k.rsplit('#', 1)
    by_slug.setdefault(s, {})[int(i)] = u
changed = 0
for f in glob.glob('lib/editorials/*.ts'):
    if f.endswith(('index.ts', 'types.ts')):
        continue
    src = open(f).read()
    m = re.search(r"slug:\s*'([^']+)'", src)
    if not m or m.group(1) not in by_slug:
        continue
    want = by_slug[m.group(1)]
    a = re.search(r'recordsReviewed:\s*\[', src)
    if not a:
        continue
    pos = a.end()
    # walk the array: string literals or { ... } objects, comma separated
    idx = 0
    out = src[:pos]
    i = pos
    depth = 0
    while True:
        ws = re.match(r'\s*', src[i:]).group(0)
        out += ws; i += len(ws)
        if src[i] == ']':
            break
        if src[i] in '`\'"':
            q = src[i]; j = i + 1
            while True:
                if src[j] == '\\': j += 2; continue
                if src[j] == q: break
                j += 1
            lit = src[i:j + 1]
            if idx in want:
                url = want[idx].replace("'", "%27")
                lit = '{ text: ' + lit + ", url: '" + url + "' }"
                changed += 1
            out += lit; i = j + 1
        elif src[i] == '{':
            j = src.index('}', i)
            out += src[i:j + 1]; i = j + 1
        else:
            raise SystemExit(f'unexpected token in {f} at {i}: {src[i:i+30]!r}')
        idx += 1
        ws = re.match(r'\s*', src[i:]).group(0)
        out += ws; i += len(ws)
        if src[i] == ',':
            out += ','; i += 1
    out += src[i:]
    open(f, 'w').write(out)
print('records linked:', changed)
