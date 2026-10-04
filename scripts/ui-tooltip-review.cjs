/* eslint-disable @typescript-eslint/no-require-imports */
// Checks shared hints against the isolated UI preview without live data writes.
const assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs');
const { chromium } = require(path.join(require('node:os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [], results = [];
  for (const width of [390, 768, 1440, 1920]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:3025/admin');
    const trigger = page.getByRole('button', { name: 'Switch to dark mode' });
    await trigger.hover();
    const tooltip = page.getByRole('tooltip');
    await tooltip.waitFor();
    assert.equal(await tooltip.innerText(), 'Switch to dark mode');
    assert.equal(await tooltip.evaluate(element => element.matches(':popover-open')), true);
    const box = await tooltip.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= width);
    await page.mouse.move(1, 899);
    await tooltip.waitFor({ state: 'hidden' });
    await trigger.focus();
    await tooltip.waitFor();
    assert.equal(await trigger.getAttribute('aria-describedby'), await tooltip.getAttribute('id'));
    await page.keyboard.press('Escape');
    await tooltip.waitFor({ state: 'hidden' });
    assert.equal(await trigger.getAttribute('aria-describedby'), null);
    results.push({ width, hover: true, keyboard: true, accessibleDescription: true, viewportFit: true });
    await page.close();
  }
  assert.deepEqual(errors, []);
  await browser.close();
  if (process.env.GOSH_UI_REVIEW_ROOT) fs.writeFileSync(path.join(process.env.GOSH_UI_REVIEW_ROOT, 'tooltip-results.json'), JSON.stringify({ results, errors }, null, 2));
  console.log('Shared tooltips passed mouse, keyboard, Escape, accessible descriptions and viewport fitting at four widths.');
})().catch(error => { console.error(error); process.exit(1); });
