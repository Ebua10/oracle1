require('dotenv').config();
const express = require('express'), cors = require('cors'), helmet = require('helmet');
const bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken'), { Pool } = require('pg');
const path = require('path');
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const q = (s, p) => db.query(s, p).then(r => r.rows);
const app = express();
app.use(helmet({ contentSecurityPolicy: false }), cors(), express.json());
app.use(express.static(path.join(__dirname, '../../frontend')));

const wrap = f => (req, res) => f(req, res).catch(e => { console.error(e); res.status(e.status || 500).json({ error: e.message }); });
const fail = (status, message) => Object.assign(new Error(message), { status });
const auth = (...roles) => (req, res, next) => {
  try {
    req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET);
    if (roles.length && !roles.includes(req.user.role)) throw 0;
    next();
  } catch { res.status(401).json({ error: 'Not authorized' }); }
};
const need = (b, ...k) => k.forEach(x => { if (b[x] === undefined || b[x] === '') throw fail(400, `${x} is required`); });
const token = u => jwt.sign({ id: u.id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

// ---- Auth
app.post('/api/auth/register', wrap(async (req, res) => {
  const { email, password, name, role } = req.body; need(req.body, 'email', 'password', 'name');
  if (password.length < 8) throw fail(400, 'Password must be at least 8 characters');
  const r = role === 'seller' ? 'seller' : 'buyer';
  const [u] = await q('insert into users(email,password_hash,name,role) values($1,$2,$3,$4) returning id,email,name,role',
    [email.toLowerCase(), await bcrypt.hash(password, 10), name, r]);
  res.json({ user: u, token: token(u) });
}));
app.post('/api/auth/login', wrap(async (req, res) => {
  const [u] = await q('select * from users where email=$1', [(req.body.email || '').toLowerCase()]);
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password_hash))) throw fail(401, 'Wrong email or password');
  res.json({ user: { id: u.id, email: u.email, name: u.name, role: u.role }, token: token(u) });
}));

// ---- Catalog (price shown = flash price while a flash sale is live; auctions show highest bid)
app.get('/api/categories', wrap(async (_, res) => res.json(await q('select * from categories order by name'))));
app.get('/api/products', wrap(async (req, res) => {
  const { search, category, min, max, sale_type, store, sort } = req.query;
  const w = ["p.status='active'"], v = [];
  const add = (sql, val) => { v.push(val); w.push(sql.replace('?', '$' + v.length)); };
  if (search) add('(p.title ilike ? or p.description ilike ?)', `%${search}%`);
  if (category) add('p.category_id=?', category);
  if (min) add('p.price>=?', min);
  if (max) add('p.price<=?', max);
  if (sale_type) add('p.sale_type=?', sale_type);
  if (store) add('p.store_id=?', store);
  const order = { price_asc: 'p.price asc', price_desc: 'p.price desc' }[sort] || 'p.created_at desc';
  res.json(await q(`select p.*, s.name store_name,
    case when p.sale_type='flash' and now() between p.starts_at and p.ends_at then p.flash_price else p.price end as current_price,
    (select max(amount) from bids b where b.product_id=p.id) highest_bid,
    (select round(avg(rating),1) from reviews r where r.product_id=p.id) rating
    from products p join stores s on s.id=p.store_id where ${w.join(' and ')} order by ${order} limit 60`, v));
}));
app.get('/api/products/:id', wrap(async (req, res) => {
  const [p] = await q('select p.*, s.name store_name from products p join stores s on s.id=p.store_id where p.id=$1', [req.params.id]);
  if (!p) throw fail(404, 'Product not found');
  p.tiers = await q('select min_qty,unit_price from bulk_tiers where product_id=$1 order by min_qty', [p.id]);
  p.reviews = await q('select r.rating,r.body,u.name from reviews r join users u on u.id=r.user_id where product_id=$1 order by r.id desc', [p.id]);
  res.json(p);
}));

// ---- Seller
app.post('/api/stores', auth('seller'), wrap(async (req, res) => {
  need(req.body, 'name');
  res.json((await q('insert into stores(owner_id,name,description,location) values($1,$2,$3,$4) returning *',
    [req.user.id, req.body.name, req.body.description, req.body.location]))[0]);
}));
app.post('/api/products', auth('seller'), wrap(async (req, res) => {
  const b = req.body; need(b, 'title', 'price');
  const [s] = await q("select id from stores where owner_id=$1 and status='approved'", [req.user.id]);
  if (!s) throw fail(403, 'Your store must be approved first');
  const [p] = await q(`insert into products(store_id,category_id,title,description,image_url,sale_type,price,stock,flash_price,starts_at,ends_at,bid_increment)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *`,
    [s.id, b.category_id || null, b.title, b.description, b.image_url, b.sale_type || 'fixed', b.price, b.stock || 1, b.flash_price, b.starts_at, b.ends_at, b.bid_increment || 1]);
  for (const t of b.tiers || []) await q('insert into bulk_tiers values($1,$2,$3)', [p.id, t.min_qty, t.unit_price]);
  res.json(p);
}));
app.get('/api/seller/orders', auth('seller'), wrap(async (req, res) =>
  res.json(await q('select o.* from orders o join stores s on s.id=o.store_id where s.owner_id=$1 order by o.created_at desc', [req.user.id]))));
app.post('/api/seller/orders/:id/ship', auth('seller'), wrap(async (req, res) => {
  const r = await q("update orders o set status='shipped' from stores s where o.id=$1 and s.id=o.store_id and s.owner_id=$2 returning o.id", [req.params.id, req.user.id]);
  if (!r.length) throw fail(404, 'Order not found'); res.json({ ok: true });
}));
app.get('/api/seller/stats', auth('seller'), wrap(async (req, res) =>
  res.json((await q(`select count(*) orders, coalesce(sum(total-commission),0) earnings from orders o join stores s on s.id=o.store_id
    where s.owner_id=$1 and o.status<>'cancelled'`, [req.user.id]))[0])));

// ---- Cart + multi-seller checkout (one order per store, escrow held)
app.get('/api/cart', auth(), wrap(async (req, res) => res.json(await q(
  `select c.qty,p.id,p.title,p.image_url,p.store_id,
   case when p.sale_type='flash' and now() between p.starts_at and p.ends_at then p.flash_price else p.price end price
   from cart_items c join products p on p.id=c.product_id where c.user_id=$1`, [req.user.id]))));
app.post('/api/cart', auth(), wrap(async (req, res) => {
  const { product_id, qty = 1 } = req.body; need(req.body, 'product_id');
  await q('insert into cart_items values($1,$2,$3) on conflict(user_id,product_id) do update set qty=$3', [req.user.id, product_id, qty]);
  res.json({ ok: true });
}));
app.delete('/api/cart/:id', auth(), wrap(async (req, res) => { await q('delete from cart_items where user_id=$1 and product_id=$2', [req.user.id, req.params.id]); res.json({ ok: true }); }));

async function unitPrice(p, qty) {
  let price = p.sale_type === 'flash' && p.flash_price && new Date() >= p.starts_at && new Date() <= p.ends_at ? +p.flash_price : +p.price;
  const [t] = await q('select unit_price from bulk_tiers where product_id=$1 and min_qty<=$2 order by min_qty desc limit 1', [p.id, qty]);
  return t ? Math.min(price, +t.unit_price) : price;
}
app.post('/api/checkout', auth(), wrap(async (req, res) => {
  const { coupon, payment_method = 'card' } = req.body;
  const items = await q('select c.qty, p.* from cart_items c join products p on p.id=c.product_id where c.user_id=$1', [req.user.id]);
  if (!items.length) throw fail(400, 'Your cart is empty');
  let pct = 0, cp = null;
  if (coupon) {
    [cp] = await q('select * from coupons where code=$1 and active and (expires_at is null or expires_at>now())', [coupon.toUpperCase()]);
    if (!cp) throw fail(400, 'Coupon is invalid or expired'); pct = +cp.percent_off;
  }
  const [{ value: rate }] = await q("select value from settings where key='default_commission'");
  const client = await db.connect(), checkout = require('crypto').randomUUID(), byStore = {};
  try {
    await client.query('begin');
    for (const it of items) {
      if (it.sale_type === 'auction') throw fail(400, `"${it.title}" is an auction; place a bid instead`);
      if (it.stock < it.qty) throw fail(400, `Not enough stock for "${it.title}"`);
      const up = await unitPrice(it, it.qty);
      const off = cp && (!cp.store_id || cp.store_id === it.store_id) ? pct : 0;
      (byStore[it.store_id] ||= []).push({ ...it, up: up * (1 - off / 100) });
    }
    const orders = [];
    for (const [storeId, list] of Object.entries(byStore)) {
      const total = list.reduce((a, i) => a + i.up * i.qty, 0);
      const { rows: [o] } = await client.query('insert into orders(buyer_id,checkout_id,store_id,total,commission,coupon,payment_method) values($1,$2,$3,$4,$5,$6,$7) returning *',
        [req.user.id, checkout, storeId, total.toFixed(2), (total * rate / 100).toFixed(2), cp && cp.code, payment_method]);
      for (const i of list) {
        await client.query('insert into order_items values($1,$2,$3,$4)', [o.id, i.id, i.qty, i.up.toFixed(2)]);
        await client.query('update products set stock=stock-$1 where id=$2', [i.qty, i.id]);
      }
      orders.push(o);
    }
    await client.query('delete from cart_items where user_id=$1', [req.user.id]);
    await client.query('commit');
    // TODO: create payment intent (Stripe / mobile money) for the checkout total here.
    res.json({ checkout_id: checkout, orders });
  } catch (e) { await client.query('rollback'); throw e; } finally { client.release(); }
}));
app.get('/api/orders', auth(), wrap(async (req, res) => res.json(await q('select o.*, s.name store_name from orders o join stores s on s.id=o.store_id where buyer_id=$1 order by created_at desc', [req.user.id]))));
app.post('/api/orders/:id/confirm', auth(), wrap(async (req, res) => {
  const r = await q("update orders set status='delivered', escrow_status='released' where id=$1 and buyer_id=$2 and status='shipped' returning id", [req.params.id, req.user.id]);
  if (!r.length) throw fail(400, 'Order cannot be confirmed yet'); res.json({ ok: true });
}));

// ---- Auctions
app.post('/api/products/:id/bids', auth(), wrap(async (req, res) => {
  const amount = +req.body.amount; need(req.body, 'amount');
  const [p] = await q("select * from products where id=$1 and sale_type='auction' and status='active'", [req.params.id]);
  if (!p || new Date() > p.ends_at) throw fail(400, 'This auction is closed');
  const [{ top }] = await q('select coalesce(max(amount),$2) top from bids where product_id=$1', [p.id, p.price]);
  if (amount < +top + +p.bid_increment) throw fail(400, `Bid at least ${+top + +p.bid_increment}`);
  await q('insert into bids(product_id,user_id,amount) values($1,$2,$3)', [p.id, req.user.id, amount]);
  res.json({ ok: true, amount });
}));
async function closeAuctions() { // winners get an order; run every minute
  const ended = await q("select * from products where sale_type='auction' and status='active' and ends_at<now()");
  for (const p of ended) {
    const [w] = await q('select * from bids where product_id=$1 order by amount desc limit 1', [p.id]);
    await q("update products set status='sold' where id=$1", [p.id]);
    if (!w) continue;
    const [{ value: rate }] = await q("select value from settings where key='default_commission'");
    const [o] = await q('insert into orders(buyer_id,checkout_id,store_id,total,commission) values($1,gen_random_uuid(),$2,$3,$4) returning id', [w.user_id, p.store_id, w.amount, (w.amount * rate / 100).toFixed(2)]);
    await q('insert into order_items values($1,$2,1,$3)', [o.id, p.id, w.amount]);
  }
}
setInterval(() => closeAuctions().catch(console.error), 60000);

// ---- Reviews, wishlist, messages
app.post('/api/products/:id/reviews', auth(), wrap(async (req, res) => {
  const { rating, body } = req.body; need(req.body, 'rating');
  const [p] = await q('select store_id from products where id=$1', [req.params.id]);
  await q('insert into reviews(user_id,product_id,store_id,rating,body) values($1,$2,$3,$4,$5)', [req.user.id, req.params.id, p.store_id, rating, body]);
  res.json({ ok: true });
}));
app.post('/api/wishlist/:id', auth(), wrap(async (req, res) => { await q('insert into wishlist values($1,$2) on conflict do nothing', [req.user.id, req.params.id]); res.json({ ok: true }); }));
app.post('/api/messages', auth(), wrap(async (req, res) => { await q('insert into messages(from_user,to_user,body) values($1,$2,$3)', [req.user.id, req.body.to_user, req.body.body]); res.json({ ok: true }); }));
app.get('/api/messages', auth(), wrap(async (req, res) => res.json(await q('select * from messages where from_user=$1 or to_user=$1 order by id desc limit 100', [req.user.id]))));

// ---- Admin
app.get('/api/admin/pending', auth('admin'), wrap(async (_, res) => res.json({
  stores: await q("select * from stores where status='pending'"), products: await q("select * from products where status='pending'") })));
app.post('/api/admin/stores/:id/:action', auth('admin'), wrap(async (req, res) => {
  const st = { approve: 'approved', suspend: 'suspended' }[req.params.action]; if (!st) throw fail(400, 'Unknown action');
  await q('update stores set status=$1 where id=$2', [st, req.params.id]); res.json({ ok: true });
}));
app.post('/api/admin/products/:id/:action', auth('admin'), wrap(async (req, res) => {
  const st = { approve: 'active', reject: 'rejected' }[req.params.action]; if (!st) throw fail(400, 'Unknown action');
  await q('update products set status=$1 where id=$2', [st, req.params.id]); res.json({ ok: true });
}));
app.put('/api/admin/commission', auth('admin'), wrap(async (req, res) => { await q("update settings set value=$1 where key='default_commission'", [req.body.rate]); res.json({ ok: true }); }));
app.post('/api/admin/coupons', auth('admin', 'seller'), wrap(async (req, res) => {
  const { code, percent_off, expires_at } = req.body; need(req.body, 'code', 'percent_off');
  await q('insert into coupons(code,percent_off,expires_at) values($1,$2,$3)', [code.toUpperCase(), percent_off, expires_at]); res.json({ ok: true });
}));
app.get('/api/admin/report', auth('admin'), wrap(async (_, res) => res.json((await q(
  "select count(*) orders, coalesce(sum(total),0) gmv, coalesce(sum(commission),0) revenue from orders where status<>'cancelled'"))[0])));

app.listen(process.env.PORT || 3000, () => console.log('Marketplace running on port ' + (process.env.PORT || 3000)));
