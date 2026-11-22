// 빌드 후 별도 터미널에서 node scripts/serve-check.mjs dist 를 실행합니다.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const origin = `http://127.0.0.1:${process.env.STUDY_CHECK_PORT || 4321}`;
const article = '/ai/spatial-sense-guide/';
const feedback = 'https://t3rryahn.duckdns.org/feedback/?service=study&from=';
const shots = path.resolve(__dirname, '../.local/shots-apple');
const slidesOnly = process.argv.includes('--slides-only');
const capturePages = process.env.STUDY_CAPTURE_PAGES?.split(',');
let saved = 0;

async function open(page, url) {
  // 같은 장면 해시로 다시 이동하면 브라우저가 네트워크 응답을 만들지 않습니다.
  const response = (await page.goto(origin + url)) ?? (await page.reload());
  assert.equal(response?.status(), 200, url);
  await page.evaluate(() => document.fonts.ready);
}

async function checkWidth(page) {
  const { content, viewport } = await page.evaluate(() => ({
    content: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
    viewport: document.documentElement.clientWidth,
  }));
  assert.ok(content <= viewport, `${page.url()} spans ${content}px at ${viewport}px`);
}

async function capture(page, name, width, theme, fullPage = false) {
  await checkWidth(page);
  if (capturePages && !capturePages.includes(name)) return;
  await page.screenshot({
    path: path.join(shots, `${name}-${width}-${theme}.png`),
    fullPage,
    animations: 'disabled',
  });
  saved++;
}

async function checkFeedback(page) {
  await open(page, article + '?source=check#section');
  const link = page.locator('footer').getByRole('link', { name: '의견 보내기', exact: true });
  assert.equal(await link.getAttribute('href'), feedback + encodeURIComponent(article));
}

async function checkThemeSelect(page) {
  const select = page.locator('starlight-theme-select select:visible');
  const current = () => page.locator('html').getAttribute('data-theme');
  const bodyColor = () => page.locator('body').evaluate(el => getComputedStyle(el).color);
  await open(page, '/');
  assert.equal(await current(), 'light');
  const light = await bodyColor();
  await select.selectOption('dark');
  assert.equal(await current(), 'dark');
  const dark = await bodyColor();
  assert.notEqual(dark, light);
  await open(page, '/ai/spatial-sense/');
  assert.equal(await current(), 'dark');
  await open(page, article);
  assert.equal(await current(), 'dark');
  assert.equal(await bodyColor(), dark);
  await page.emulateMedia({ colorScheme: 'dark' });
  await select.selectOption('light');
  assert.equal(await current(), 'light');
  assert.equal(await bodyColor(), light);
  await select.selectOption('auto');
  assert.equal(await current(), 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
}

async function checkScreens(page, width, theme) {
  await open(page, '/');
  assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
  await capture(page, 'home', width, theme, true);

  const opener = page.locator('site-search [data-open-modal]');
  await opener.click();
  const search = page.locator('site-search dialog:modal');
  await search.locator('.pagefind-ui__search-input').fill('공간감각');
  await search.locator('.pagefind-ui__result-link').first().waitFor();
  assert.match(await search.locator('.pagefind-ui__message').innerText(), /검색 결과 \d+건/);
  await capture(page, 'search', width, theme);
  await page.keyboard.press('Escape');
  await search.waitFor({ state: 'hidden' });
  assert.ok(await opener.evaluate(el => el === document.activeElement), '검색을 닫은 뒤 포커스');

  await open(page, article);
  assert.ok(await page.locator('main table').count(), '구성 표');
  assert.ok(await page.locator('main code').count(), 'VRAM 계산 코드');
  await capture(page, 'article', width, theme, true);
}

async function checkSlides(page, width, theme) {
  await open(page, '/ai/spatial-sense/#23');
  await page.locator('#head').filter({ hasText: '방향' }).waitFor();
  await capture(page, 'slides', width, theme);
  const contents = page.locator('#open-scenes');
  await contents.click();
  const dialog = page.locator('#scene-dialog:modal');
  assert.equal(await dialog.locator('[aria-current="step"]').getAttribute('href'), '#23');
  await checkWidth(page);
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  assert.ok(await contents.evaluate(el => el === document.activeElement), '목차를 닫은 뒤 포커스');
}

async function run() {
  await fs.mkdir(shots, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  try {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ colorScheme: theme, reducedMotion: 'reduce' });
      // 슬라이드 원본의 외부 글꼴 요청은 로컬 대체 글꼴로 검증합니다.
      await context.route('https://fonts.googleapis.com/**', route =>
        route.fulfill({ contentType: 'text/css', body: '' }));
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text());
      });
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: width < 768 ? 844 : 960 });
        if (!slidesOnly) await checkScreens(page, width, theme);
        await checkSlides(page, width, theme);
        console.log(`PASS ${width}px ${theme}: ${slidesOnly ? 'slides' : 'home, search, article, slides'}`);
      }
      if (!slidesOnly && theme === 'light') await checkThemeSelect(page);
      await context.close();
    }
    if (!slidesOnly) {
      const noJS = await browser.newContext({ javaScriptEnabled: false });
      await checkFeedback(await noJS.newPage());
      await noJS.close();
    }
    assert.deepEqual(errors, []);
    const summary = slidesOnly ? 'slide overflow, scene dialog, focus return'
      : 'theme override, persistence, system preference, static feedback URL';
    console.log(`PASS: ${summary}; ${saved} PNGs`);
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
