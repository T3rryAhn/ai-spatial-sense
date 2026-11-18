// npm run build 후 node scripts/serve-check.mjs dist와 함께 실행합니다.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('response', r => { if (r.status() === 404 && !r.url().includes('does-not-exist')) console.log('404:', r.url()); });
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ body: '', contentType: 'text/css' }));
  await fs.mkdir('.artifacts/screenshots', { recursive: true });
  for (const route of ['/', '/ai/', '/cs/', '/network/', '/os/', '/ai/spatial-sense-guide/']) {
    const response = await page.goto('http://127.0.0.1:4321' + route);
    assert.equal(response.status(), 200);
    assert.equal(await page.locator('html').getAttribute('lang'), 'ko');
    assert.ok((await page.locator('h1').textContent()).trim());
    await page.screenshot({ path: `.artifacts/screenshots/wiki-${route.replaceAll('/', '-')}.png`, fullPage: true });
  }
  const links = page.locator('main a[href^="/ai/spatial-sense/#"]');
  assert.equal(await links.count(), 49);
  await links.filter({ hasText: '10.' }).first().click();
  assert.equal(new URL(page.url()).hash, '#10');
  await page.locator('#open-scenes').click();
  await page.locator('[data-scene="39"]').click();
  assert.equal(new URL(page.url()).hash, '#40');
  await page.locator('.study-tools a').click();
  assert.equal(new URL(page.url()).pathname, '/ai/');
  await page.locator('site-search [data-open-modal]').click();
  await page.locator('.pagefind-ui__search-input').fill('공간감각');
  await page.locator('.pagefind-ui__result-link').first().waitFor();
  await page.screenshot({ path: '.artifacts/screenshots/wiki-search.png' });
  await page.keyboard.press('Escape');
  await page.locator('starlight-theme-select select').first().selectOption('dark');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page.setViewportSize({ width: 375, height: 812 });
  for (const route of ['/', '/ai/', '/cs/', '/network/', '/os/', '/ai/spatial-sense-guide/']) {
    await page.goto('http://127.0.0.1:4321' + route);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, route);
  }
  await page.locator('button.sl-menu-button').click();
  await page.screenshot({ path: '.artifacts/screenshots/wiki-menu-375.png' });
  await page.goto('http://127.0.0.1:4321/#20');
  await page.waitForURL('**/ai/spatial-sense/#20');
  assert.equal(await (await page.request.get('http://127.0.0.1:4321/healthz')).text(), 'ok');
  const missing = await page.request.get('http://127.0.0.1:4321/does-not-exist/');
  assert.equal(missing.status(), 404);
  assert.ok((await missing.text()).includes('<html'));
  assert.deepEqual(errors, []);
  console.log('Wiki routes, scene links, search, theme, mobile, redirect, healthz, 404: PASS; console errors: 0');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
