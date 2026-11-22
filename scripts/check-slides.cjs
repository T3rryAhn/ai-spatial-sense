// NODE_PATH에 Playwright 설치 경로를 지정하거나 프로젝트에 별도로 설치해 실행합니다.
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const path = require('node:path');
const origin = `http://127.0.0.1:${process.env.STUDY_CHECK_PORT || 4321}`;

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ reducedMotion: 'reduce', colorScheme: 'light' });
  // 외부 글꼴 없이도 동작하는 조건을 전후 동일하게 유지합니다.
  await context.route('https://fonts.googleapis.com/**', route => route.fulfill({ body: '', contentType: 'text/css' }));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  const results = [];
  const measure = () => {
    const copy = document.querySelector('#copy').getBoundingClientRect();
    const stage = document.querySelector('#stage').getBoundingClientRect();
    const solo = document.querySelector('#main').classList.contains('solo');
    const ranges = [];
    const walker = document.createTreeWalker(document.querySelector('#copy'), NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent.trim()) continue;
      const range = document.createRange(); range.selectNodeContents(walker.currentNode);
      ranges.push(...[...range.getClientRects()].filter(r => r.width && r.height));
    }
    const textRight = Math.max(...ranges.map(r => r.right));
    const map = document.querySelector('#map');
    const bbox = map.getBBox(), matrix = map.getScreenCTM();
    const panelGraphic = document.querySelector('#panel.show > *');
    const graphicLeft = panelGraphic ? panelGraphic.getBoundingClientRect().left
      : matrix ? new DOMPoint(bbox.x, bbox.y).matrixTransform(matrix).x : null;
    return {
      solo, copy: { x: copy.x, y: copy.y, width: copy.width, height: copy.height, right: copy.right },
      stage: { x: stage.x, y: stage.y, width: stage.width, height: stage.height },
      boxGap: solo ? null : stage.left - copy.right,
      textToGraphicGap: solo ? null : graphicLeft - textRight,
      overflow: document.documentElement.scrollWidth > innerWidth,
      head: document.querySelector('#head').textContent,
    };
  };
  for (const phase of ['before', 'after']) {
    for (const width of [1366, 1440, 1920, 2560, 390, 860, 1000]) {
      await page.setViewportSize({ width, height: width <= 860 ? 844 : 1080 });
      for (const scene of [1, 10, 20, 30]) {
        const url = phase === 'before' ? '/before/index.html' : '/ai/spatial-sense/';
        // 원본에는 hashchange 리스너가 없으므로 query도 바꿔 반드시 새 문서로 로드합니다.
        await page.goto(`${origin}${url}?scene=${scene}#${scene}`);
        await page.waitForTimeout(600);
        const data = await page.evaluate(measure);
        assert.equal(data.overflow, false, `${phase} ${width} #${scene}: horizontal overflow`);
        let screenshot;
        if ([1366, 1920, 2560, 390].includes(width)) {
          screenshot = `.artifacts/screenshots/${phase}-${width}-scene-${scene}.png`;
          await fs.mkdir(path.dirname(screenshot), { recursive: true });
          await page.screenshot({ path: screenshot });
        }
        results.push({ phase, width, scene, ...data, screenshot });
      }
    }
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(origin + '/ai/spatial-sense/#10');
  await page.locator('#open-scenes').click();
  assert.equal(await page.locator('#scene-dialog').evaluate(el => el.open), true);
  assert.equal(await page.locator('[data-scene]').count(), 50);
  assert.equal(await page.locator('[aria-current="step"]').getAttribute('href'), '#10');
  await page.keyboard.press('ArrowRight');
  assert.equal(new URL(page.url()).hash, '#10');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#scene-dialog').evaluate(el => el.open), false);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'open-scenes');
  await page.locator('#open-scenes').click();
  await page.locator('[data-scene="29"]').click();
  await page.waitForTimeout(300);
  assert.equal(new URL(page.url()).hash, '#30');
  await page.screenshot({ path: '.artifacts/screenshots/slide-mobile-375.png' });
  await page.locator('#open-scenes').click();
  await page.screenshot({ path: '.artifacts/screenshots/slide-dialog-375.png' });
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.study-tools a').getAttribute('href'), '/ai/');
  // 모든 장면에서 직접 링크와 제목을 검증합니다.
  const metadata = JSON.parse(await fs.readFile('src/generated/slides.json', 'utf8'));
  for (const scene of metadata.scenes) {
    await page.evaluate(n => { location.hash = '#' + n; }, scene.number);
    await page.waitForTimeout(50);
    assert.equal(await page.locator('#head').textContent(), scene.title);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  }
  const unchanged = [];
  for (const width of [390, 860, 1000]) for (const scene of [1, 10, 20, 30]) {
    const before = results.find(r => r.phase === 'before' && r.width === width && r.scene === scene);
    const after = results.find(r => r.phase === 'after' && r.width === width && r.scene === scene);
    unchanged.push({ width, scene, copySame: JSON.stringify(before.copy) === JSON.stringify(after.copy), stageSame: JSON.stringify(before.stage) === JSON.stringify(after.stage) });
  }
  await fs.writeFile('.artifacts/slide-results.json', JSON.stringify({ results, unchanged, errors }, null, 2));
  assert.ok(unchanged.every(r => r.copySame && r.stageSame), '좁은 화면의 본문 위치·크기가 바뀌었습니다.');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ screenshots: 34, measurements: results.length, unchanged, errors }, null, 2));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
