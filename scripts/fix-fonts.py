#!/usr/bin/env python3
"""Replace all non-Special-Elite font families with Special Elite, monospace."""

import os
import re
import glob

NEW = 'Special Elite, monospace'

# Ordered longest-first so substrings don't match before their parent string
REPLACEMENTS = [
    # Longest / most specific variants first
    ('"EB Garamond","Cormorant Garamond","Garamond",Georgia,"Times New Roman",serif', NEW),
    ('EB Garamond, Garamond, Georgia, "Times New Roman", serif', NEW),
    ('"EB Garamond", Garamond, Georgia, "Times New Roman", serif', NEW),
    ('"Georgia", "Charter", "Times New Roman", serif', NEW),
    ('Georgia, "Times New Roman", serif', NEW),
    # double-quoted JS string variant (humaniser)
    ("'EB Garamond', Georgia, serif", NEW),
    # inline remaining
    ('"EB Garamond", Georgia, serif', NEW),
    ('var(--font-abril), Georgia, serif', NEW),
    # CSS in template literal (your-tax-pound)
    ("font-family: 'Georgia', 'Times New Roman', serif;", "font-family: 'Special Elite', monospace;"),
    # bare Georgia, serif (must come after the longer ones)
    ('Georgia, serif', NEW),
]

def process_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    for old, new in REPLACEMENTS:
        content = content.replace(old, new)
    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

# Process all tsx/ts files under app/ (skip node_modules, .next)
changed = []
for path in sorted(glob.glob('app/**/*.tsx', recursive=True) + glob.glob('app/**/*.ts', recursive=True)):
    if '.next' in path or 'node_modules' in path:
        continue
    if process_file(path):
        changed.append(path)

print(f"Modified {len(changed)} files:")
for p in changed:
    print(f"  {p}")
