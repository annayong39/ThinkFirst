// Optional visual check after running print-fixtures.cjs.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const root = path.resolve('tmp/print-qa');
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'thinkfirst-print-'));
const url = pathToFileURL(path.join(root, 'document.html')).href;
const result = spawnSync(chrome, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--user-data-dir=' + profile, '--window-size=1200,900',
  '--screenshot=' + path.join(root, 'document.png'),
  '--print-to-pdf=' + path.join(root, 'document.pdf'), url
], { windowsHide: true, encoding: 'utf8', timeout: 30000 });
if (result.error || result.status !== 0) throw result.error || new Error(result.stderr);
if (!fs.existsSync(path.join(root, 'document.pdf'))) throw new Error('PDF was not produced.');
console.log('Wrote portrait print preview and PDF to tmp/print-qa.');
