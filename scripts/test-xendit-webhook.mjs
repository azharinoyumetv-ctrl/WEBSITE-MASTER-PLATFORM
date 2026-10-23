import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');

function load(path, dependencies, globals = {}) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name), Buffer, URL, Date, AbortSignal, console, ...globals });
  return exports;
}

function fixture() {
  const order = { id: '11111111-1111-4111-8111-111111111111', tenantId: 'tenant-a', totalAmount: 149000, currency: 'IDR', orderStatus: 'awaiting_payment', guestEmail: null };
  const payment = { id: 'payment-a', paymentStatus: 'initiated' };
  const state = { ledger: 0, fetches: 0, invoice: { id: 'abcdef123456abcdef123456', external_id: order.id, amount: 149000, currency: 'IDR', status: 'PAID', paid_amount: 149000, paid_at: '2026-10-23T05:00:00Z' } };
  const db = {
    systemTenant: { findUnique: async () => ({ id: order.tenantId, subdomain: 'default', website: null }) },
    tenantOrder: {
      findUnique: async () => order,
      update: async ({ data }) => Object.assign(order, data),
      updateMany: async ({ data }) => { if (!['paid', 'completed'].includes(order.orderStatus)) Object.assign(order, data); return { count: 1 }; },
    },
    tenantPayment: {
      findFirst: async () => payment,
      updateMany: async ({ data }) => { if (payment.paymentStatus === 'succeeded') return { count: 0 }; Object.assign(payment, data); return { count: 1 }; },
    },
    tenantPaymentLedger: { create: async () => { state.ledger++; } },
    $transaction: async action => action(db),
  };
  const helper = load('../lib/xendit-server.ts', { 'server-only': {}, '@/lib/prisma': { default: db, __esModule: true }, '@/lib/crypto': { decrypt: value => value } }, {
    process: { env: { XENDIT_SECRET_KEY: 'test-secret-only', XENDIT_WEBHOOK_TOKEN: 'test-token-only' } },
    fetch: async url => { assert.equal(url, 'https://api.xendit.co/v2/invoices/abcdef123456abcdef123456'); state.fetches++; return Response.json(state.invoice); },
  });
  const route = load('../app/api/webhooks/payments/xendit/route.ts', {
    'next/server': { NextResponse: Response, NextRequest: Request }, '@/lib/prisma': { default: db, __esModule: true },
    '@/lib/xendit-server': helper, '@/lib/actions/notifications': { sendOrderConfirmationEmail: async () => {} },
    '../../../webhook/[provider]/route': { POST: () => { throw new Error('Legacy route must not handle this order'); } },
  });
  const notify = (token = 'test-token-only', body = {}) => route.POST(new Request('https://wmp.dagangos.com/api/webhooks/payments/xendit', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-callback-token': token },
    body: JSON.stringify({ id: state.invoice.id, external_id: order.id, status: 'PAID', ...body }),
  }));
  return { order, payment, state, notify, helper };
}

test('invalid Xendit token cannot verify or pay an order', async () => {
  const f = fixture(); assert.equal((await f.notify('forged')).status, 403); assert.equal(f.state.fetches, 0); assert.equal(f.order.orderStatus, 'awaiting_payment');
});
test('caller PAID status cannot override a provider PENDING invoice', async () => {
  const f = fixture(); f.state.invoice.status = 'PENDING'; assert.equal((await f.notify()).status, 200); assert.equal(f.order.orderStatus, 'awaiting_payment'); assert.equal(f.state.ledger, 0);
});
test('wrong amount, currency or external reference cannot settle an order', async () => {
  for (const change of [{ amount: 1 }, { currency: 'USD' }, { external_id: 'another-order' }]) {
    const f = fixture(); Object.assign(f.state.invoice, change); assert.equal((await f.notify()).status, 422); assert.equal(f.order.orderStatus, 'awaiting_payment');
  }
});
test('verified payment settles exactly once and late expiry cannot undo it', async () => {
  const f = fixture(); assert.equal((await f.notify()).status, 200); assert.equal(f.order.orderStatus, 'paid'); assert.equal(f.state.ledger, 1);
  assert.equal((await f.notify()).status, 200); assert.equal(f.state.ledger, 1);
  f.state.invoice.status = 'EXPIRED'; assert.equal((await f.notify()).status, 200); assert.equal(f.order.orderStatus, 'paid');
});
test('hosted invoice URLs are restricted to Xendit HTTPS hosts', () => {
  const { helper } = fixture(); assert.equal(helper.validXenditUrl('https://checkout.xendit.co/web/test'), true);
  for (const value of ['https://evil.example/web/test', 'http://checkout.xendit.co/test', 'https://checkout.xendit.co@evil.example/test']) assert.equal(helper.validXenditUrl(value), false);
});
