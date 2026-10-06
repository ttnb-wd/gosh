/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const { spawnSync } = require('node:child_process');
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
const { fixture } = require('./security-fixture.cjs');

const announcement = { id: 'arrival', title: 'New fragrance', description: 'An upcoming item', announcement_type: 'coming_soon', arrival_date: '2026-10-15', is_active: true, image: '/arrival.png', imageFileId: '', cta_text: 'Learn More', cta_url: '/products' };
const formData = Object.fromEntries(Object.entries(announcement).filter(([key]) => key !== 'id'));
const product = { id: 'product', name: 'Existing product', brand: 'Brand', price: 100000, image: '/product.png', is_active: true };
const offer = { id: 'offer', product_id: 'product', promotion_price: 75000, is_active: true, start_at: '2026-10-06T02:30:00.000Z', end_at: '2099-10-08T17:45:00.000Z', product };

function harness(file, overrides = {}, fetchResponse = async () => ({ ok: true, json: async () => ({ success: true, announcements: [] }) })) {
 const states = [], effects = [], calls = [], notifications = [], countdowns = [], diagnostics = []; let cursor = 0;
 const react = { ...React, useState: initial => {
  const index = cursor++;
  if (!(index in states)) states[index] = Object.hasOwn(overrides, index) ? overrides[index] : initial;
  return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
 }, useEffect: fn => effects.push(fn) };
 const Plain = ({ children }) => React.createElement('div', null, children);
 const mocks = {
  react, 'framer-motion': { motion: { div: Plain, form: ({ children, onSubmit, className }) => React.createElement('form', { onSubmit, className }, children) }, AnimatePresence: Plain },
  'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
  '@/components/ui/StudioRowActions': { __esModule: true, default: Plain },
  '@/components/ui/StudioSelect': { __esModule: true, default: ({ label, value, options, onChange }) => React.createElement('label', null, label, React.createElement('select', { value, onChange: e => onChange(e.target.value) }, options.map(o => React.createElement('option', { key: o.value, value: o.value }, o.label)))) },
  '@/components/ui/StudioFeedback': { notify: message => notifications.push(message), confirmAction: async () => true },
  '@/lib/dev-log': { __esModule: true, default: { error: (...args) => diagnostics.push(args) } },
  '@/lib/announcements': fixture().load('lib/announcements.ts'),
  '@/lib/business-schedule': fixture().load('lib/business-schedule.ts'),
  '@/hooks/useCountdown': { useCountdown: target => { countdowns.push(target); return { total: 1000 }; }, formatCountdown: () => '1s' },
 };
 const loadedModule = { exports: {} };
 const context = vm.createContext({ module: loadedModule, exports: loadedModule.exports, require: name => mocks[name] || require(name), Date, console,
  fetch: async (url, init) => { calls.push({ url, init }); return fetchResponse(url, init); }, setInterval: () => 0, clearInterval() {}, document: { hidden: false } });
 const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
 new vm.Script(code).runInContext(context);
 return { states, effects, calls, notifications, countdowns, diagnostics, tree() { cursor = 0; effects.length = 0; countdowns.length = 0; return loadedModule.exports.default(); }, html() { return renderToStaticMarkup(this.tree()); } };
}
function find(node, predicate) {
 if (!React.isValidElement(node)) return null;
 if (predicate(node)) return node;
 for (const child of React.Children.toArray(node.props.children)) { const match = find(child, predicate); if (match) return match; }
 return null;
}

for (const type of ['coming_soon', 'new_arrival']) test(`announcement admin form: ${type} has exactly one native date field, optional message and correct create/edit payload`, async () => {
 const h = harness('components/admin/AnnouncementManager.tsx', { 1: false, 2: true, 6: { ...formData, announcement_type: type } });
 const html = h.html();
 assert.equal((html.match(/type="date"/g) || []).length, 1);
 assert.ok(html.includes('Arrival Date')); assert.ok(html.includes('COMING SOON')); assert.ok(html.includes('NEW ARRIVAL')); assert.ok(html.includes('Create Announcement'));
 assert.ok(!/Create Promotion|Update Promotion|Start Date|End Date|datetime-local|Discount|Promotion Price|countdown/i.test(html));
 assert.equal(find(h.tree(), el => el.type === 'textarea').props.required, undefined);
 assert.ok(html.includes('grid gap-4 md:grid-cols-2')); // existing mobile/desktop form grid
 const dateInput = find(h.tree(), el => el.type === 'input' && el.props.type === 'date');
 dateInput.props.onChange({ target: { value: '2026-11-02' } });
 const form = find(h.tree(), el => typeof el.props.onSubmit === 'function');
 await form.props.onSubmit({ preventDefault() {} });
 const create = h.calls.find(call => call.init?.method === 'POST');
 assert.equal(create.url, '/api/admin/announcements/action'); assert.equal(create.init.credentials, 'include');
 const body = JSON.parse(create.init.body); assert.equal(body.action, 'create'); assert.equal(body.data.arrival_date, '2026-11-02'); assert.equal(body.data.announcement_type, type);
 for (const field of ['start_at','end_at','promotion_price','discount_percent','type','product_id']) assert.ok(!(field in body.data));

 const edit = harness('components/admin/AnnouncementManager.tsx', { 1: false, 2: true, 3: 'arrival', 6: { ...formData, announcement_type: type } });
 assert.ok(edit.html().includes('Update Announcement'));
 await find(edit.tree(), el => typeof el.props.onSubmit === 'function').props.onSubmit({ preventDefault() {} });
 const update = JSON.parse(edit.calls.find(call => call.init?.method === 'POST').init.body);
 assert.equal(update.action, 'update'); assert.equal(update.announcementId, 'arrival'); assert.equal(update.data.arrival_date, '2026-10-15');
});

test('announcement admin: safe API validation errors keep the form open', async () => {
 const h = harness('components/admin/AnnouncementManager.tsx', { 1: false, 2: true, 6: formData }, async () => ({ ok: false, json: async () => ({ error: 'Enter a valid arrival date.' }) }));
 await find(h.tree(), el => typeof el.props.onSubmit === 'function').props.onSubmit({ preventDefault() {} });
 assert.deepEqual(h.notifications, ['Enter a valid arrival date.']); assert.equal(h.states[2], true); assert.equal(h.states[6].arrival_date, '2026-10-15');
});

for (const [announcement_type, label, prefix] of [['coming_soon','COMING SOON','Arriving'],['new_arrival','NEW ARRIVAL','Available']]) test(`homepage announcement ${label}: date only and no promotion components on mobile/desktop`, () => {
 const h = harness('components/PromotionBanner.tsx', { 0: [{ kind: 'announcement', data: { ...announcement, announcement_type, promotion_price: 1, start_at: offer.start_at, end_at: offer.end_at } }], 1: 0, 2: false });
 const html = h.html();
 assert.equal((html.match(new RegExp(label, 'g')) || []).length, 2);
 assert.equal((html.match(new RegExp(prefix + ' Oct 15, 2026', 'g')) || []).length, 2);
 assert.ok(!/LIMITED OFFER|Starts:|Ends:|Starts in|Ends in|Save \d+%|\bKs\b|\bAM\b|\bPM\b/.test(html));
 assert.equal(h.countdowns.length, 0);
});
test('homepage promotion retains LIMITED OFFER, discount, promotional price and exact countdown', () => {
 const data = { ...offer, type: 'promotion', title: product.name, description: 'Save 25% on this product!', image: product.image, cta_text: 'Shop Now', cta_url: '/products/product' };
 const h = harness('components/PromotionBanner.tsx', { 0: [{ kind: 'promotion', data }], 1: 0, 2: false });
 const html = h.html();
 assert.equal((html.match(/LIMITED OFFER/g) || []).length, 2); assert.ok(!/NEW ARRIVAL|COMING SOON|Arriving|Available/.test(html));
 assert.ok(html.includes('Save 25%')); assert.ok(html.includes('75,000')); assert.ok(html.includes('Starts:')); assert.ok(html.includes('Ends:')); assert.ok(html.includes('Ends in'));
 assert.deepEqual(h.countdowns, [Date.parse(offer.end_at), Date.parse(offer.end_at)]);
});
test('homepage loader reads separate sources without classifying legacy promotions as announcements', async () => {
 const h = harness('components/PromotionBanner.tsx', {}, async url => ({ ok: true, json: async () => url.includes('product-promotions') ? { success: true, promotions: [offer], bannerPromotions: [{ type: 'new_product', id: 'legacy' }] } : { success: true, announcements: [announcement] } }));
 h.tree(); h.effects[0](); await new Promise(resolve => setImmediate(resolve));
 assert.deepEqual(h.calls.map(call => call.url).sort(), ['/api/announcements/active','/api/product-promotions/active']);
 assert.deepEqual(Array.from(h.states[0], item => item.kind), ['promotion','announcement']);
 assert.equal(h.states[0][0].data.promotion_price, 75000); assert.equal(h.states[0][0].data.start_at, offer.start_at);
 assert.ok(!h.states[0].some(item => item.data.id === 'legacy'));
});
for (const timeZone of ['UTC','Asia/Yangon','America/New_York','Pacific/Kiritimati']) test('arrival calendar date never shifts in device timezone ' + timeZone, () => {
 const code = `const a=require('node:assert/strict'),h=require('./scripts/security-fixture.cjs').fixture().load('lib/announcements.ts');a.equal(h.formatArrivalDate('2026-10-15'),'Oct 15, 2026');a.equal(h.formatArrivalDate('2028-02-29'),'Feb 29, 2028');a.equal(h.isArrivalDate('2026-02-29'),false);a.equal(h.isArrivalDate('2026-10-15T00:00Z'),false);`;
 const result = spawnSync(process.execPath, ['-e',code], { env: { ...process.env, TZ: timeZone }, encoding: 'utf8' }); assert.equal(result.status, 0, result.stderr);
});

for (const failedSource of ['announcements', 'product-promotions']) test(`homepage: ${failedSource} failure identifies endpoint/status and retains the other source`, async () => {
 const h = harness('components/PromotionBanner.tsx', {}, async url => url.includes(failedSource)
  ? { ok: false, status: 429, json: async () => ({ error: 'Too many requests. Please try again later.' }) }
  : { ok: true, status: 200, json: async () => url.includes('product-promotions') ? { success: true, promotions: [offer] } : { success: true, announcements: [announcement] } });
 h.tree(); h.effects[0](); await new Promise(resolve => setImmediate(resolve));
 assert.equal(h.states[0].length, 1); assert.equal(h.states[0][0].kind, failedSource === 'announcements' ? 'promotion' : 'announcement');
 assert.equal(h.diagnostics.length, 1); const message = h.diagnostics[0][0];
 assert.ok(message.includes('/api/' + failedSource + '/active')); assert.ok(message.includes('HTTP 429')); assert.ok(message.includes('Too many requests'));
 assert.ok(!message.includes('Could not load homepage offers or announcements')); assert.ok(!message.includes('\n'));
 const html = h.html(); assert.ok(html.includes(failedSource === 'announcements' ? 'LIMITED OFFER' : 'COMING SOON'));
});
test('homepage: 404 HTML is diagnosed without logging the response body or stack', async () => {
 const h = harness('components/PromotionBanner.tsx', {}, async url => url.includes('announcements')
  ? { ok: false, status: 404, json: async () => { throw new SyntaxError('<html>PRIVATE INTERNAL DATA</html>'); } }
  : { ok: true, status: 200, json: async () => ({ success: true, promotions: [offer] }) });
 h.tree(); h.effects[0](); await new Promise(resolve => setImmediate(resolve));
 assert.equal(h.states[0].length, 1); assert.match(h.diagnostics[0][0], /Announcements.*HTTP 404: Expected a JSON response/);
 assert.ok(!JSON.stringify(h.diagnostics).includes('PRIVATE INTERNAL DATA'));
});
test('homepage: empty collections return no items and no failure diagnostics', async () => {
 const h = harness('components/PromotionBanner.tsx', {}, async url => ({ ok: true, status: 200, json: async () => url.includes('product-promotions') ? { success: true, promotions: [] } : { success: true, announcements: [] } }));
 h.tree(); h.effects[0](); await new Promise(resolve => setImmediate(resolve));
 assert.equal(h.states[0].length, 0); assert.equal(h.states[2], false); assert.equal(h.diagnostics.length, 0); assert.equal(h.html(), '');
});
