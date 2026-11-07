# API summary (all under /api, JSON, Bearer token)
Auth: POST /auth/register, POST /auth/login
Catalog: GET /categories, GET /products?search&category&min&max&sale_type&store&sort, GET /products/:id
Buyer: GET/POST /cart, DELETE /cart/:id, POST /checkout {coupon,payment_method}, GET /orders, POST /orders/:id/confirm,
       POST /products/:id/bids {amount}, POST /products/:id/reviews, POST /wishlist/:id, GET/POST /messages
Seller: POST /stores, POST /products (sale_type fixed|auction|flash, tiers[]), GET /seller/orders, POST /seller/orders/:id/ship, GET /seller/stats
Admin: GET /admin/pending, POST /admin/stores/:id/(approve|suspend), POST /admin/products/:id/(approve|reject),
       PUT /admin/commission {rate}, POST /admin/coupons, GET /admin/report
