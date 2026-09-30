#!/usr/bin/env node
// Fails if the library can reach Highcharts or the frozen originals.
//  1. Walks the import graph from src/index.js and rejects any `highcharts*`
//     import and any file under src/originals/.
//  2. Scans dist/ (run `npm run build` first) for the string "highcharts".
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = join(root, 'src/index.js');
const ORIGINALS = join(root, 'src/originals') + '/';
const EXTS = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
const SPEC_RE = /(?:import|export)\s[^'"`]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;

const problems = [];

function resolveLocal(from, spec) {
    const base = resolve(dirname(from), spec);
    for (const ext of EXTS) {
        const p = base + ext;
        if (existsSync(p) && statSync(p).isFile()) return p;
    }
    problems.push(`${relative(root, from)}: cannot resolve "${spec}"`);
    return null;
}

const seen = new Set();
const stack = [ENTRY];
while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    if (file.startsWith(ORIGINALS)) problems.push(`reaches frozen original: ${relative(root, file)}`);
    if (!/\.(m?[jt]sx?)$/.test(file)) continue;
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(SPEC_RE)) {
        const spec = m[1] ?? m[2] ?? m[3] ?? m[4];
        if (/^highcharts/i.test(spec)) problems.push(`${relative(root, file)} imports "${spec}"`);
        else if (spec.startsWith('.')) {
            const target = resolveLocal(file, spec);
            if (target) stack.push(target);
        }
    }
}

const dist = join(root, 'dist');
if (!existsSync(dist)) {
    problems.push('dist/ not found; run `npm run build` first');
} else {
    const walk = (dir) =>
        readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
    for (const f of walk(dist)) {
        const text = readFileSync(f, 'utf8');
        if (/highcharts/i.test(text)) problems.push(`dist contains "highcharts": ${relative(root, f)}`);
        if (/src\/originals\//.test(text)) problems.push(`dist references src/originals: ${relative(root, f)}`);
    }
}

if (problems.length) {
    console.error('check:no-highcharts FAILED\n' + problems.map((p) => `  - ${p}`).join('\n'));
    process.exit(1);
}
console.log(`check:no-highcharts OK (${seen.size} source files reachable from src/index.js, dist/ clean)`);
