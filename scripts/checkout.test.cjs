/* eslint-disable @typescript-eslint/no-require-imports */
// Executes the checkout component and real order/proof routes with isolated
// transactional fixtures. Never reads credentials or changes production data.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const React = require('react');
const { fixture, request } = require('./security-fixture.cjs');

const cart = [{ id: 'p1', name: 'goaid', brand: 'Test', price: 100, image: '/test.png', qty: 1 }];
const product = { name: 'goaid', price: 100, stock: 1, is_active: true };
const flush = async () => { for (let i = 0; i < 12; i++) await new Promise(resolve => setImmediate(resolve)); };
function gate() { let release; const promise = new Promise(resolve => { release = resolve; }); return { promise, release }; }
function find(node, predicate) {
  if (!React.isValidElement(node)) return null;
  if (predicate(node)) return node;
  for (const child of React.Children.toArray(node.props.children)) { const match = find(child, predicate); if (match) return match; }
  return null;
}
function harness(options = {}) {
  const f = fixture({ data: { 'products/p1': product, ...options.data } });
  const route = f.load('app/api/checkout/place-order/route.ts');
  const remove = f.load('app/api/checkout/delete-payment-proof/route.ts');
  const file = new File(['fixture-image'], 'proof.png', { type: 'image/png' });
  const slots = [false, structuredClone(cart), 'kbzpay', true, null, { kbzpay: file }];
  const calls = [], diagnostics = [], listeners = new Map(), cleanups = [];
  let cursor = 0, uploads = 0, keys = 0, orderRequests = 0;
  const useState = initial => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
  };
  const Plain = ({ children }) => React.createElement('div', null, children);
  const settings = { enable_checkout: true, allow_kbzpay: true, allow_wavepay: true };
  const mocks = {
    react: { ...React, useState, useRef: initial => useState({ current: initial })[0], useEffect: fn => effects.push(fn), useMemo: fn => fn() },
    'framer-motion': { motion: { div: Plain, button: 'button' }, AnimatePresence: Plain },
    'next/navigation': { useRouter: () => ({ push() {} }) },
    'next/image': { __esModule: true, default: Plain },
    'lucide-react': new Proxy({}, { get: () => Plain }),
    '@/lib/firebase/client-auth': { getFirebaseAuthorizationHeader: async () => ({}) },
    '@/lib/firebase/config': { auth: { currentUser: { uid: options.userId || 'user-a' } } },
    '@/hooks/useSiteSettings': { useSiteSettings: () => ({ settings }) },
    '@/hooks/useWebsiteSettings': { useWebsiteSettings: () => ({ settings: {} }) },
    '@/hooks/useDelayedLoading': { useDelayedLoading: value => value },
    '@/components/ErrorBoundaries': { PageErrorBoundary: Plain },
    '@/lib/dev-log': { __esModule: true, default: Object.fromEntries(['error', 'warn', 'info', 'log'].map(method => [method, (...args) => diagnostics.push(args)])) },
  };
  const effects = [], loadedModule = { exports: {} };
  const storage = new Map([['gosh_cart', JSON.stringify(cart)]]);
  const session = options.session || new Map();
  const context = vm.createContext({ module: loadedModule, exports: loadedModule.exports,
    require: name => mocks[name] || (name.startsWith('@/components/') ? { __esModule: true, default: Plain } : require(name)),
    File, FormData, URL, Event, crypto: { randomUUID: () => 'request-' + (++keys) },
    localStorage: {
      getItem: name => { if (name === 'gosh_orders' && options.invalidBackup) return '{invalid'; return storage.get(name) || null; },
      setItem: (name, value) => { if (options.storageUnavailable) throw new Error('Storage blocked'); storage.set(name, value); },
      removeItem: name => { if (options.storageUnavailable) throw new Error('Storage blocked'); storage.delete(name); },
    },
    sessionStorage: {
      getItem: name => session.get(name) || null,
      setItem: (name, value) => { if (options.sessionUnavailable) throw new Error('Session storage blocked'); session.set(name, value); },
      removeItem: name => { if (options.sessionUnavailable) throw new Error('Session storage blocked'); session.delete(name); },
    },
    document: { body: { style: { overflow: '' } } },
    window: { innerWidth: options.mobile ? 390 : 1440, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name), dispatchEvent: event => listeners.get(event.type)?.() },
    fetch: async (url, init) => {
      calls.push({ url, init });
      if (url.endsWith('/upload-payment-proof')) {
        await options.uploadGate?.promise;
        if (options.uploadFails && uploads === 0) { uploads++; return Response.json({ error: 'Could not upload payment proof.' }, { status: 500 }); }
        const fileId = 'proof-' + (++uploads);
        f.data.set('payment_uploads/' + fileId, { user_id: 'user-a' });
        return Response.json({ success: true, fileId });
      }
      if (url.endsWith('/place-order')) {
        const number = ++orderRequests;
        await options.orderGate?.promise;
        if (options.retryStatus && number === 2) return Response.json({ error: 'Please try again.' }, { status: options.retryStatus });
        if (options.failBeforeCommit && number === 1) return Response.json({ error: 'Could not place order. Please try again.' }, { status: 503 });
        const result = await route.POST(request(JSON.parse(init.body), url, { 'Idempotency-Key': init.headers['Idempotency-Key'] }));
        if (options.loseResponse && number === 1) throw new TypeError('Response lost');
        if (options.invalidResponse && number === 1) return new Response('<html>timeout</html>', { status: 502 });
        return result;
      }
      if (url.endsWith('/delete-payment-proof')) return remove.POST(request(JSON.parse(init.body), url));
      return Response.json({ success: true });
    },
  });
  const code = ts.transpileModule(fs.readFileSync('app/checkout/page.tsx', 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  new vm.Script(code).runInContext(context);
  const h = { f, slots, calls, diagnostics, storage, session, settings,
    tree() { cursor = 0; effects.length = 0; return loadedModule.exports.default().props.children.type(); },
    control(predicate) { return find(this.tree(), predicate); },
    confirm() { return this.control(node => node.props['aria-label'] === 'Confirm payment and place order'); },
    click(button = this.confirm()) { button.props.onClick({ preventDefault() {}, stopPropagation() {} }); },
    orders() { return [...f.data.keys()].filter(key => /^orders\/[^/]+$/.test(key)); },
    submissions() { return calls.filter(call => call.url.endsWith('/place-order')); },
    uploads() { return calls.filter(call => call.url.endsWith('/upload-payment-proof')); },
    cartEvent() { listeners.get('cart-updated')?.(); },
    // Hook slots shared by state and refs in the component's declaration order.
    error() { return slots[12]; }, success() { return slots[13]; },
    mount() { this.tree(); effects.forEach(effect => { const cleanup = effect(); if (typeof cleanup === 'function') cleanups.push(cleanup); }); },
    unmount() { cleanups.forEach(cleanup => cleanup()); },
  };
  return h;
}

for (const mobile of [false, true]) test(`checkout ${mobile ? 'mobile-equivalent' : 'desktop'}: upload then one confirm creates one order`, async () => {
  const h = harness({ mobile });
  const button = h.confirm();
  assert.equal(button.props.type, 'button'); assert.equal(button.props.disabled, false);
  h.click(button); await flush();
  assert.equal(h.uploads().length, 1); assert.equal(h.submissions().length, 1);
  const body = JSON.parse(h.submissions()[0].init.body);
  assert.deepEqual(body.items, [{ product_id: 'p1', selected_size: null, quantity: 1 }]);
  assert.equal(body.paymentScreenshotFileId, 'proof-1'); assert.equal(body.paymentScreenshotUrl, null);
  assert.ok(h.submissions()[0].init.headers['Idempotency-Key']);
  assert.ok(!('total' in body)); // server computes total from trusted prices
  assert.equal(h.orders().length, 1); assert.equal(h.f.data.get('products/p1').stock, 0);
  assert.equal(h.f.data.get(h.orders()[0]).total, 100); assert.equal(h.success(), true); assert.equal(h.error(), '');
  h.click(button); await flush(); // late event from the original button cannot place again
  assert.equal(h.submissions().length, 1);
});

test('checkout: refresh after a lost response recovers the same saved key/body without reuploading', async () => {
  const first = harness({ loseResponse: true }); first.mount(); first.click(); await flush(); first.unmount();
  assert.ok(first.session.has('gosh_checkout_attempt'));
  const recovered = harness({ data: Object.fromEntries(first.f.data), session: first.session });
  // Simulate a fresh tab render: no selected proof File survives the refresh.
  recovered.slots[2] = null; recovered.slots[5] = {};
  recovered.mount(); assert.equal(recovered.confirm().props.disabled, false);
  recovered.click(); await flush();
  assert.equal(recovered.uploads().length, 0); assert.equal(recovered.orders().length, 1);
  assert.equal(recovered.f.data.get('products/p1').stock, 0); assert.equal(recovered.success(), true);
  assert.equal(recovered.submissions()[0].init.body, first.submissions()[0].init.body);
  assert.equal(recovered.submissions()[0].init.headers['Idempotency-Key'], first.submissions()[0].init.headers['Idempotency-Key']);
  assert.equal(first.session.has('gosh_checkout_attempt'), false);
});
test('checkout: a saved attempt is not restored for a different signed-in user', async () => {
  const first = harness({ loseResponse: true }); first.mount(); first.click(); await flush();
  const other = harness({ session: first.session, userId: 'user-b' });
  other.slots[5] = {}; other.mount(); assert.equal(other.confirm().props.disabled, true);
  assert.equal(other.slots[9].current, null);
});
for (const retryStatus of [401, 403, 408, 429]) test(`checkout: HTTP ${retryStatus} during recovery keeps the previous attempt for a later successful retry`, async () => {
  const h = harness({ loseResponse: true, retryStatus }); h.mount(); h.click(); await flush();
  h.click(); await flush(); assert.equal(h.success(), false); assert.ok(h.session.has('gosh_checkout_attempt'));
  h.click(); await flush(); assert.equal(h.success(), true); assert.equal(h.orders().length, 1);
  assert.equal(h.f.data.get('products/p1').stock, 0); assert.equal(h.uploads().length, 1);
  const submissions = h.submissions(); assert.equal(submissions.length, 3);
  assert.ok(submissions.every(call => call.init.body === submissions[0].init.body && call.init.headers['Idempotency-Key'] === submissions[0].init.headers['Idempotency-Key']));
});
test('checkout: session storage unavailable still preserves same-page retry idempotency', async () => {
  const h = harness({ loseResponse: true, sessionUnavailable: true }); h.click(); await flush(); h.click(); await flush();
  assert.equal(h.success(), true); assert.equal(h.orders().length, 1); assert.equal(h.uploads().length, 1);
});
test('checkout: changed payment availability cannot reject retrieval of an already committed order', async () => {
  const f = fixture({ data: { 'products/p1': product, 'payment_uploads/proof': { user_id: 'user-a' } } });
  const route = f.load('app/api/checkout/place-order/route.ts');
  const body = { customerName: 'Guest Customer', phone: 'N/A', address: 'N/A', city: 'N/A', paymentMethod: 'kbzpay', paymentScreenshotFileId: 'proof', items: [{ product_id: 'p1', quantity: 1 }] };
  const make = key => request(body, '/api/checkout/place-order', { 'Idempotency-Key': key });
  const first = await route.POST(make('original')); assert.equal(first.status, 200);
  f.data.set('site_settings/1', { allow_kbzpay: false });
  const retry = await route.POST(make('original')); assert.equal(retry.status, 200);
  assert.equal((await retry.json()).data.id, (await first.json()).data.id);
  const different = await route.POST(make('new-attempt')); assert.equal(different.status, 400);
  assert.match((await different.json()).error, /KBZPay is currently unavailable/);
  assert.equal(f.data.get('products/p1').stock, 0); assert.equal([...f.data.keys()].filter(key => /^orders\/[^/]+$/.test(key)).length, 1);
});

test('checkout: double tap before React renders locks upload/order synchronously', async () => {
  const slow = gate(), h = harness({ uploadGate: slow });
  const button = h.confirm(); h.click(button); h.click(button); await flush();
  assert.equal(h.uploads().length, 1); assert.equal(h.submissions().length, 0);
  assert.equal(h.confirm().props.disabled, true);
  assert.equal(h.control(node => node.type === 'input' && node.props.type === 'file').props.disabled, true);
  slow.release(); await flush();
  assert.equal(h.submissions().length, 1); assert.equal(h.orders().length, 1); assert.equal(h.f.data.get('products/p1').stock, 0);
});
test('checkout: slow order disables confirm; repeated handler invocation sends no additional request', async () => {
  const slow = gate(), h = harness({ orderGate: slow }); h.click(); await flush();
  assert.equal(h.confirm().props.disabled, true); h.click(); await flush();
  assert.equal(h.submissions().length, 1); assert.equal(h.orders().length, 0);
  slow.release(); await flush(); assert.equal(h.orders().length, 1);
});

for (const failure of ['loseResponse', 'invalidResponse', 'failBeforeCommit']) test(`checkout: ${failure} retries identical key/body/proof without duplicate stock decrement`, async () => {
  const h = harness({ [failure]: true }); h.mount(); h.click(); await flush();
  assert.equal(h.success(), false); assert.ok(h.error());
  const fileInput = h.control(node => node.type === 'input' && node.props.type === 'file');
  assert.equal(fileInput.props.disabled, true);
  fileInput.props.onChange({ target: { files: [new File(['other'], 'other.png')] } });
  const drawer = h.control(node => typeof node.props.onUpdateQuantity === 'function');
  drawer.props.onUpdateQuantity('p1', undefined, 2);
  h.storage.set('gosh_cart', '[]'); // a storage/cart event must not change an unresolved attempt
  h.cartEvent();
  h.click(); await flush();
  assert.equal(h.submissions().length, 2); assert.equal(h.uploads().length, 1);
  assert.equal(h.submissions()[0].init.body, h.submissions()[1].init.body);
  assert.equal(h.submissions()[0].init.headers['Idempotency-Key'], h.submissions()[1].init.headers['Idempotency-Key']);
  assert.equal(h.orders().length, 1); assert.equal(h.f.data.get('products/p1').stock, 0);
  assert.equal(h.success(), true); assert.equal(h.error(), '');
  assert.ok(!h.calls.some(call => call.url.endsWith('/delete-payment-proof')));
});

test('checkout: mobile and desktop send exactly the same complete order payload', async () => {
  const desktop = harness(), mobile = harness({ mobile: true });
  desktop.click(); mobile.click(); await flush();
  assert.equal(mobile.submissions()[0].init.body, desktop.submissions()[0].init.body);
  assert.deepEqual({ ...mobile.submissions()[0].init.headers }, { ...desktop.submissions()[0].init.headers });
});
test('checkout: leaving after a definitive rejection cleans up unused proof through the secure route', async () => {
  const h = harness({ data: { 'products/p1': { ...product, stock: 0 } } }); h.mount(); h.click(); await flush();
  h.unmount(); await flush();
  assert.equal(h.f.data.has('payment_uploads/proof-1'), false);
  assert.ok(h.f.calls.some(call => call[0] === 'delete-file' && call[1] === 'proof-1'));
});
test('checkout: ambiguous order outcome retains proof; confirmed proof is never cleaned up by the client', async () => {
  for (const loseResponse of [true, false]) {
    const h = harness({ loseResponse }); h.mount(); h.click(); await flush(); h.unmount(); await flush();
    assert.ok(h.f.data.get('payment_uploads/proof-1').order_id);
    assert.ok(!h.calls.some(call => call.url.endsWith('/delete-payment-proof')));
  }
});
test('checkout: concurrent same-key retries return one order even when proof has already attached', async () => {
  const f = fixture({ data: { 'products/p1': product, 'payment_uploads/proof': { user_id: 'user-a' } } });
  const route = f.load('app/api/checkout/place-order/route.ts');
  const body = { customerName: 'Guest Customer', phone: 'N/A', address: 'N/A', city: 'N/A', paymentMethod: 'kbzpay', paymentScreenshotFileId: 'proof', items: [{ product_id: 'p1', quantity: 1 }] };
  const make = () => request(body, '/api/checkout/place-order', { 'Idempotency-Key': 'same-attempt' });
  const responses = await Promise.all([route.POST(make()), route.POST(make())]);
  assert.deepEqual(responses.map(response => response.status), [200, 200]);
  const [a, b] = await Promise.all(responses.map(response => response.json()));
  assert.equal(a.data.id, b.data.id); assert.equal(f.data.get('products/p1').stock, 0);
  assert.equal([...f.data.keys()].filter(key => /^orders\/[^/]+$/.test(key)).length, 1);
});

for (const failure of ['invalidBackup', 'storageUnavailable']) test(`checkout: ${failure} cannot mask a committed order`, async () => {
  const h = harness({ [failure]: true }); h.click(); await flush();
  assert.equal(h.success(), true); assert.equal(h.error(), '');
  assert.equal(h.orders().length, 1); assert.equal(h.f.data.get('products/p1').stock, 0);
});
test('checkout: failed proof upload never places an order; retry waits for finalized file ID', async () => {
  const h = harness({ uploadFails: true }); h.click(); await flush();
  assert.equal(h.submissions().length, 0); assert.equal(h.orders().length, 0); assert.equal(h.f.data.get('products/p1').stock, 1);
  h.click(); await flush(); assert.equal(h.orders().length, 1);
  assert.equal(JSON.parse(h.submissions()[0].init.body).paymentScreenshotFileId, 'proof-2');
});
test('checkout: genuine zero stock rejects without order/payment/receipt attachment; owned proof survives retry', async () => {
  const h = harness({ data: { 'products/p1': { ...product, stock: 0 } } }); h.click(); await flush();
  assert.match(h.error(), /Only 0 left in stock for goaid/); assert.equal(h.orders().length, 0);
  assert.equal(h.f.data.get('products/p1').stock, 0); assert.equal(h.f.data.get('payment_uploads/proof-1').order_id, undefined);
  assert.ok(![...h.f.data.keys()].some(key => key.startsWith('payments/')));
  h.f.data.set('products/p1', product); h.click(); await flush();
  assert.equal(h.uploads().length, 1); assert.equal(h.orders().length, 1); assert.equal(h.success(), true);
});
test('checkout: replacing an unattached proof after stock rejection uses authorized cleanup', async () => {
  const h = harness({ data: { 'products/p1': { ...product, stock: 0 } } }); h.click(); await flush();
  h.control(node => node.type === 'input' && node.props.type === 'file').props.onChange({ target: { files: [new File(['other'], 'other.png')] } });
  h.f.data.set('products/p1', product); h.click(); await flush();
  assert.equal(h.uploads().length, 2); assert.ok(h.f.calls.some(call => call[0] === 'delete-file' && call[1] === 'proof-1'));
  assert.equal(h.f.data.has('payment_uploads/proof-1'), false); assert.equal(h.orders().length, 1);
});
test('checkout: concurrent competing orders cannot oversell the last unit', async () => {
  const f = fixture({ data: { 'products/p1': product, 'payment_uploads/a': { user_id: 'user-a' }, 'payment_uploads/b': { user_id: 'user-a' } } });
  const route = f.load('app/api/checkout/place-order/route.ts');
  const body = { customerName: 'Guest Customer', phone: 'N/A', address: 'N/A', city: 'N/A', paymentMethod: 'kbzpay', items: [{ product_id: 'p1', quantity: 1 }] };
  const responses = await Promise.all(['a', 'b'].map(key => route.POST(request({ ...body, paymentScreenshotFileId: key }, '/api/checkout/place-order', { 'Idempotency-Key': key }))));
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 400]);
  assert.equal(f.data.get('products/p1').stock, 0); assert.equal([...f.data.keys()].filter(key => /^orders\/[^/]+$/.test(key)).length, 1);
  const loser = responses.find(response => response.status === 400); assert.match((await loser.json()).error, /Only 0 left/);
  assert.equal(['a', 'b'].filter(key => f.data.get('payment_uploads/' + key).order_id).length, 1);
});
