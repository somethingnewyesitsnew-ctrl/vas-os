#!/usr/bin/env python3
"""
Wiring check — scans every onclick/onchange/oninput/etc handler across
material.html + js/*.js and confirms each referenced function is
actually defined somewhere in the codebase. Catches "dead button" bugs
(a handler pointing at a function that was renamed/removed/never written)
that don't show up in a plain syntax check.

Usage:  python3 tests/wiring-check.py [path-to-repo-root]
        (defaults to the current directory)
"""
import re, glob, sys, os

REPO = sys.argv[1] if len(sys.argv) > 1 else '.'
os.chdir(REPO)

defined = set()
pattern_def = re.compile(r'(?:^|[^a-zA-Z0-9_.])function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(')
pattern_window = re.compile(r'window\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=')
pattern_const = re.compile(r'(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?(?:function|\()')

all_files = sorted(glob.glob('js/*.js')) + ['material.html']
for fn in all_files:
    if 'archived' in fn: continue
    text = open(fn, encoding='utf-8').read()
    for m in pattern_def.finditer(text): defined.add(m.group(1))
    for m in pattern_window.finditer(text): defined.add(m.group(1))
    for m in pattern_const.finditer(text): defined.add(m.group(1))

handler_pattern = re.compile(r'on(?:click|change|input|submit|keydown|keyup|blur|focus)\s*=\s*["\']([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(')
used = {}
for fn in all_files:
    if 'archived' in fn: continue
    text = open(fn, encoding='utf-8').read()
    for m in handler_pattern.finditer(text):
        name = m.group(1)
        used.setdefault(name, []).append(fn)

# Names that are JS keywords/globals, not app functions — grep can match
# these inside inline expressions like onclick="if(...)" or
# onblur="setTimeout(fn,200)"; they are not bugs.
builtin_ignore = {'confirm','alert','prompt','encodeURIComponent','decodeURIComponent',
    'parseInt','parseFloat','isNaN','JSON','Math','String','Number','Boolean','Array',
    'Object','Date','event','this','if','setTimeout','setInterval','for','while'}

missing = {}
for name, files in used.items():
    if name in builtin_ignore: continue
    if name not in defined:
        missing[name] = sorted(set(files))

print(f"Total unique handler function names referenced: {len(used)}")
print(f"Total unique functions defined: {len(defined)}")
print()
if missing:
    print("=== ORPHANED HANDLERS (referenced but never defined) ===")
    for name, files in sorted(missing.items()):
        print(f"  {name}  <-  called from: {', '.join(files)}")
    sys.exit(1)
else:
    print("=== CLEAN: every onclick/onchange/etc handler resolves to a real function ===")
    sys.exit(0)
