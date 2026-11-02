// Copies the static app into dist/ for the native shells (Capacitor). No bundler needed.
import { cpSync, mkdirSync, rmSync } from 'node:fs';

const FILES = ['index.html', 'privacy.html', 'manifest.json', 'sw.js', 'css', 'js', 'i18n', 'fonts', 'icons'];

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
for (const f of FILES) cpSync(f, `dist/${f}`, { recursive: true });
console.log('dist/ ready');
