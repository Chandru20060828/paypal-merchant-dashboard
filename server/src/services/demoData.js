// Deterministic demo dataset (synthetic, no real customer data).
const r2 = (n) => Math.round(n * 100) / 100;
function rng(seed) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const DEMO_PRODUCTS = [
  { name: 'Classic Tee', price: 24.99, cost: 8.5, ship: 1.2, base: 6, from: 1, to: 1.05, refundP: 0.03 },
  { name: 'Canvas Tote', price: 19.99, cost: 6.2, ship: 1.0, base: 4, from: 0.8, to: 1.35, refundP: 0.02 },
  { name: 'Sneakers', price: 79.99, cost: 41, ship: 4, base: 2.5, from: 1, to: 1.6, refundP: 0.06 },
  { name: 'Hoodie', price: 49.99, cost: 22, ship: 3, base: 3.2, from: 1.3, to: 0.6, refundP: 0.04, lateRefund: 0.12 },
];

export function generateDemo(days = 56, endDate = new Date()) {
  const rand = rng(42);
  const end = new Date(endDate); end.setUTCHours(0, 0, 0, 0); end.setUTCDate(end.getUTCDate() - 1);
  const txs = []; let n = 1000;
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(end.getTime() - i * 864e5), prog = (days - 1 - i) / (days - 1);
    const wk = [0, 6].includes(day.getUTCDay()) ? 1.25 : 1;
    for (const p of DEMO_PRODUCTS) {
      const orders = Math.max(0, Math.round(p.base * (p.from + (p.to - p.from) * prog) * wk * (0.7 + 0.6 * rand())));
      for (let k = 0; k < orders; k++) {
        const qty = rand() < 0.8 ? 1 : 2, gross = r2(p.price * qty), fee = r2(gross * 0.029 + 0.3);
        const date = new Date(day.getTime() + Math.floor(rand() * 86400000)), id = 'DEMO' + n++;
        txs.push({ transactionId: id, date, type: 'sale', productName: p.name, quantity: qty, gross, currency: 'USD', fee, net: r2(gross - fee), status: 'completed', refundAmount: 0 });
        if (rand() < p.refundP + (p.lateRefund && prog > 0.65 ? p.lateRefund : 0)) {
          const rd = new Date(Math.min(date.getTime() + (1 + Math.floor(rand() * 4)) * 864e5, end.getTime() + 864e5 - 1));
          txs.push({ transactionId: id + '-R', date: rd, type: 'refund', productName: p.name, quantity: qty, gross: 0, currency: 'USD', fee: 0, net: -gross, status: 'completed', refundAmount: gross });
        }
      }
    }
  }
  const expenses = [];
  const start = new Date(end.getTime() - (days - 1) * 864e5);
  for (let i = 0; i < days; i += 7) expenses.push({ name: 'Social media ads', category: 'Marketing', amount: 180, date: new Date(start.getTime() + i * 864e5) });
  for (let i = 0; i < days; i += 28) expenses.push({ name: 'Store subscription', category: 'Software', amount: 39, date: new Date(start.getTime() + i * 864e5) });
  const costs = DEMO_PRODUCTS.map((p) => ({ productName: p.name, unitCost: p.cost, shippingCost: p.ship }));
  return { txs, expenses, costs };
}
