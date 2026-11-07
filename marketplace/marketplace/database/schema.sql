create extension if not exists pgcrypto;
create table users(
  id uuid primary key default gen_random_uuid(),
  email text unique not null, password_hash text not null, name text not null,
  role text not null default 'buyer' check (role in ('buyer','seller','admin')),
  locale text default 'en', currency text default 'XAF', created_at timestamptz default now());
create table stores(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid unique references users(id), name text not null, description text,
  location text, status text default 'pending' check (status in ('pending','approved','suspended')),
  commission_rate numeric(5,2), created_at timestamptz default now());
create table categories(id serial primary key, name text unique not null, parent_id int references categories(id));
create table products(
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade, category_id int references categories(id),
  title text not null, description text, image_url text,
  sale_type text not null default 'fixed' check (sale_type in ('fixed','auction','flash')),
  price numeric(12,2) not null, currency text not null default 'XAF' check (currency = 'XAF'),
  stock int default 1, variants jsonb default '{}',
  flash_price numeric(12,2), starts_at timestamptz, ends_at timestamptz,
  bid_increment numeric(12,2) default 1,
  status text default 'pending' check (status in ('pending','active','rejected','sold')),
  created_at timestamptz default now());
create table bulk_tiers(product_id uuid references products(id) on delete cascade, min_qty int, unit_price numeric(12,2), primary key(product_id,min_qty));
create table bids(id serial primary key, product_id uuid references products(id), user_id uuid references users(id), amount numeric(12,2), created_at timestamptz default now());
create table coupons(code text primary key, percent_off numeric(5,2), store_id uuid references stores(id), expires_at timestamptz, active boolean default true);
create table wishlist(user_id uuid references users(id), product_id uuid references products(id), primary key(user_id,product_id));
create table cart_items(user_id uuid references users(id), product_id uuid references products(id), qty int default 1, primary key(user_id,product_id));
create table orders(
  id uuid primary key default gen_random_uuid(), buyer_id uuid references users(id),
  checkout_id uuid not null, store_id uuid references stores(id),
  total numeric(12,2), commission numeric(12,2), coupon text,
  payment_method text default 'card', escrow_status text default 'held' check (escrow_status in ('held','released','refunded')),
  status text default 'placed' check (status in ('placed','shipped','delivered','cancelled','refunded')),
  created_at timestamptz default now());
create table order_items(order_id uuid references orders(id) on delete cascade, product_id uuid references products(id), qty int, unit_price numeric(12,2));
create table reviews(id serial primary key, user_id uuid references users(id), product_id uuid references products(id), store_id uuid references stores(id), rating int check (rating between 1 and 5), body text, created_at timestamptz default now());
create table messages(id serial primary key, from_user uuid references users(id), to_user uuid references users(id), body text, created_at timestamptz default now());
create table payouts(id serial primary key, store_id uuid references stores(id), amount numeric(12,2), status text default 'requested', created_at timestamptz default now());
create table settings(key text primary key, value text);
insert into settings values('default_commission','10');
insert into categories(name) values('Electronics'),('Fashion'),('Home'),('Food & Farm'),('Beauty');
create index on products(status,sale_type); create index on orders(store_id); create index on bids(product_id);
