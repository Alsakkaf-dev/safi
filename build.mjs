// Bundles src/ into dist/ (the folder Chrome loads) and copies static files and lists.
import { build } from 'esbuild';
import { cp, rm, mkdir } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('static', 'dist', { recursive: true });
await cp('lists', 'dist/lists', { recursive: true, filter: (p) => !p.endsWith('.md') });
const common = { bundle: true, target: 'chrome110', legalComments: 'none', logLevel: 'warning' };
await build({ ...common, entryPoints: ['src/content.js', 'src/popup.js', 'src/options.js'], outdir: 'dist', format: 'iife' });
await build({ ...common, entryPoints: ['src/background.js'], outdir: 'dist', format: 'esm' });
console.log('built dist/');
