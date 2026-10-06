/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { fixture, request } = require('./security-fixture.cjs');

const banner = {
  type: 'promotion', title: 'Scheduled banner', description: 'Myanmar schedule',
  cta_text: 'Shop Now', cta_url: '/products', image: '', imageFileId: '',
  product_id: null, is_active: false,
  start_at: '2026-10-06T09:00', end_at: '2026-10-07T00:15',
};

for (const timeZone of ['UTC', 'Asia/Yangon', 'America/New_York', 'Europe/London', 'Pacific/Kiritimati']) {
  test(`selection, typing and UTC round trips are independent of device timezone: ${timeZone}`, () => {
    const code = `
      const assert = require('node:assert/strict');
      const h = require('./scripts/security-fixture.cjs').fixture().load('lib/business-schedule.ts');
      for (const [wall, utc] of [
        ['2026-10-06T09:00', '2026-10-06T02:30:00.000Z'],
        ['2026-10-07T00:15', '2026-10-06T17:45:00.000Z'],
        ['2026-03-08T02:15', '2026-03-07T19:45:00.000Z'],
        ['2026-11-01T01:30', '2026-10-31T19:00:00.000Z'],
        ['2028-02-29T23:45', '2028-02-29T17:15:00.000Z'],
      ]) {
        const date = h.parseBusinessSchedule(wall);
        assert.equal(date.toISOString(), utc);
        assert.equal(h.formatBusinessSchedule(new Date(utc)), wall);
        assert.equal(h.businessCalendarSelection(h.businessCalendarDate(date), wall.slice(11)).toISOString(), utc);
        assert.equal(h.parseBusinessPicker(h.formatBusinessPicker(date)).toISOString(), utc);
      }
    `;
    const result = spawnSync(process.execPath, ['-e', code], { env: { ...process.env, TZ: timeZone }, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  });
}

test('schedule parsing rejects overflow, malformed input and invalid dates instead of normalizing', () => {
  const h = fixture().load('lib/business-schedule.ts');
  for (const value of ['', null, 42, '2026-02-29T09:00', '2026-04-31T09:00', '2026-13-01T09:00', '2026-10-06T24:00', '2026-10-06T09:60', '2026-10-06T09:00:60Z', '2026-10-06T09:00+25:00', '2026-10-06T09:00junk', '0000-01-01T00:00']) {
    assert.equal(h.parseBusinessSchedule(value), null, String(value));
  }
  assert.equal(h.parseBusinessSchedule('2026-10-06T09:00+06:30').toISOString(), '2026-10-06T02:30:00.000Z');
  assert.equal(h.parseBusinessSchedule('2026-10-06T02:30:00.000Z').toISOString(), '2026-10-06T02:30:00.000Z');
});

for (const action of ['create', 'update']) {
  test(`production ${action}: Promotion/Announcement schedules persist as UTC timestamps and retain active setting`, async () => {
    const f = fixture({ admin: true, production: true, data: { 'promotions/existing': banner } });
    const response = await f.load('app/api/admin/promotions/action/route.ts').POST(request({ action, ...(action === 'update' ? { promotionId: 'existing' } : {}), data: banner }));
    assert.equal(response.status, 200);
    const saved = [...f.data.entries()].find(([key]) => key.startsWith('promotions/') && (action === 'update' ? key === 'promotions/existing' : key !== 'promotions/existing'))[1];
    assert.equal(saved.start_at.toDate().toISOString(), '2026-10-06T02:30:00.000Z');
    assert.equal(saved.end_at.toDate().toISOString(), '2026-10-06T17:45:00.000Z');
    assert.equal(saved.is_active, false);
    assert.ok([...f.data.values()].some(value => value.action === 'promotion.' + action && value.actor === 'user-a'));
  });
}

for (const action of ['create', 'update']) {
  for (const [changes, message] of [
    [{ end_at: banner.start_at }, /End date must be after start date/],
    [{ end_at: '2026-10-06T08:59' }, /End date must be after start date/],
    [{ start_at: '2026-02-30T09:00' }, /valid start date/],
    [{ end_at: '2026-10-06T24:00' }, /valid end date/],
    [{ cta_url: 'javascript:alert(1)' }, /CTA URL/],
    [{ title: ' ' }, /title/],
    [{ privileged: true }, /Invalid request body/],
  ]) {
    test(`${action}: useful, safe rejection for ${JSON.stringify(changes)}`, async () => {
      const f = fixture({ admin: true, production: true });
      const response = await f.load('app/api/admin/promotions/action/route.ts').POST(request({ action, ...(action === 'update' ? { promotionId: 'existing' } : {}), data: { ...banner, ...changes } }));
      assert.equal(response.status, 400);
      const result = await response.json();
      assert.match(result.error, message);
      assert.equal(f.calls.length, 0);
      assert.equal(f.load('lib/business-schedule.ts').scheduleSaveError(result), result.error);
    });
  }
}

test('explicit ISO instants remain compatible; timezone conversion happens once', async () => {
  const f = fixture({ admin: true });
  const response = await f.load('app/api/admin/promotions/action/route.ts').POST(request({ action: 'create', data: { ...banner, start_at: '2026-10-06T09:00+06:30', end_at: '2026-10-06T04:00:00.000Z' } }));
  assert.equal(response.status, 200);
  const saved = [...f.data.entries()].find(([key]) => key.startsWith('promotions/'))[1];
  assert.equal(saved.start_at.toDate().toISOString(), '2026-10-06T02:30:00.000Z');
  assert.equal(saved.end_at.toDate().toISOString(), '2026-10-06T04:00:00.000Z');
});
