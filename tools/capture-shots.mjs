import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../game/', import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const manifest = JSON.parse(await readFile(new URL('../shots.json', import.meta.url), 'utf8'));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer(async (request, response) => {
  const page = new URL(request.url, 'http://127.0.0.1').pathname;
  const file = resolve(root, '.' + (page === '/' ? '/index.html' : page));
  if (!file.startsWith(resolve(root) + sep)) return response.writeHead(403).end();
  try {
    const bytes = await readFile(file);
    response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(bytes);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
let browser;
const errors = [];
try {
  browser = await chromium.launch({ executablePath: chrome, timeout: 9000 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(6500);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
  page.on('request', request => { if (!request.url().startsWith(origin + '/')) errors.push('Unexpected request ' + request.url()); });
  if (process.argv.includes('--test')) {
    const { playTest } = await import('./play-test.mjs');
    await playTest(page, origin);
  } else {
    const shots = manifest.filter(shot => !process.argv[2] || shot.name.startsWith(process.argv[2]));
    assert(shots.length, 'No matching capture');
    for (const shot of shots) {
      await page.goto(origin + '/' + shot.query, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__shotReady || !document.querySelector('#error-panel').hidden);
      assert.equal(await page.evaluate(() => window.__shotReady), true, 'WebGL scene did not render');
      assert.deepEqual(errors, []);
      let saved = false;
      for (const quality of [89, 84, 78, 70, 61, 50, 40]) {
        const bytes = await page.screenshot({ type: 'jpeg', quality });
        if (bytes.length > 256 * 1024) continue;
        await writeFile(new URL('../screenshots/' + shot.name, import.meta.url), bytes);
        console.log(shot.name, bytes.length, 'bytes, JPEG quality', quality);
        saved = true;
        break;
      }
      assert(saved, shot.name + ' exceeds 256 KiB');
    }
    if (!process.argv[2]) await unlink(new URL('../screenshots/4-start-menu.jpg', import.meta.url)).catch(error => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
  assert.deepEqual(errors, []);
} catch (error) {
  if (errors.length) console.error(errors);
  throw error;
} finally {
  await browser?.close();
  server.closeAllConnections();
  server.close();
}
