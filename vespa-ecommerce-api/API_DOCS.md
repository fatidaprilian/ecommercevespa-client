# Vespa Ecommerce API Documentation

> **Base URL:** `http://localhost:3001/api/v1`

This document was generated automatically by parsing the API controllers.

---

## Endpoints

### Accurate

- **`GET`** `/accurate/authorize-url`  
  *Function: `UseGuards`*

- **`GET`** `/accurate/status`  
  *Function: `UseGuards`*

- **`GET`** `/accurate/callback`  
  *Function: `handleCallback`*

- **`GET`** `/accurate/databases`  
  *Function: `UseGuards`*

- **`POST`** `/accurate/open-database`  
  *Function: `UseGuards`*

- **`GET`** `/accurate/bank-accounts`  
  *Function: `UseGuards`*

- **`DELETE`** `/accurate/disconnect`  
  *Function: `UseGuards`*

- **`POST`** `/accurate/renew-webhook`  
  *Function: `UseGuards`*

### Accurate pricing

- **`GET`** `/accurate-pricing/categories`  
  *Function: `Roles`*

- **`DELETE`** `/accurate-pricing/categories/cache`  
  *Function: `Roles`*

- **`GET`** `/accurate-pricing/sync-customer-category/:customerNo`  
  *Function: `Roles`*

### Accurate sync

- **`POST`** `/accurate-sync/products`  
  *Function: `UseGuards`*

- **`POST`** `/accurate-sync/sync-rules`  
  *Function: `UseGuards`*

### Addresses

- **`POST`** `/addresses`  
  *Function: `create`*

- **`GET`** `/addresses`  
  *Function: `findAll`*

- **`PATCH`** `/addresses/:id`  
  *Function: `update`*

- **`DELETE`** `/addresses/:id`  
  *Function: `HttpCode`*

### App

- **`GET`** `/`  
  *Function: `getHello`*

### Auth

- **`POST`** `/auth/login`  
  *Function: `HttpCode`*

- **`POST`** `/auth/admin/login`  
  *Function: `HttpCode`*

- **`POST`** `/auth/register`  
  *Function: `register`*

- **`POST`** `/auth/verify-email`  
  *Function: `HttpCode`*

- **`POST`** `/auth/resend-verification`  
  *Function: `HttpCode`*

- **`POST`** `/auth/forgot-password`  
  *Function: `HttpCode`*

- **`POST`** `/auth/validate-reset-token`  
  *Function: `HttpCode`*

- **`POST`** `/auth/reset-password`  
  *Function: `HttpCode`*

- **`POST`** `/auth/logout`  
  *Function: `UseGuards`*

### Brands

- **`POST`** `/brands`  
  *Function: `Roles`*

- **`GET`** `/brands`  
  *Function: `findAll`*

- **`GET`** `/brands/:id`  
  *Function: `findOne`*

- **`PATCH`** `/brands/:id`  
  *Function: `Roles`*

- **`DELETE`** `/brands/:id`  
  *Function: `Roles`*

### Cart

- **`GET`** `/cart`  
  *Function: `getCart`*

- **`POST`** `/cart/items`  
  *Function: `addItem`*

- **`PATCH`** `/cart/items/:itemId`  
  *Function: `updateItem`*

- **`DELETE`** `/cart/items/:itemId`  
  *Function: `removeItem`*

### Categories

- **`POST`** `/categories`  
  *Function: `UseGuards`*

- **`GET`** `/categories`  
  *Function: `findAll`*

- **`GET`** `/categories/:id`  
  *Function: `findOne`*

- **`PATCH`** `/categories/:id`  
  *Function: `UseGuards`*

- **`DELETE`** `/categories/:id`  
  *Function: `UseGuards`*

### Cms pages

- **`GET`** `/pages/:slug`  
  *Function: `findOne`*

- **`POST`** `/pages`  
  *Function: `create`*

- **`GET`** `/pages`  
  *Function: `findAll`*

- **`PATCH`** `/pages/:slug`  
  *Function: `update`*

- **`DELETE`** `/pages/:slug`  
  *Function: `remove`*

### Discounts

- **`GET`** `/discounts/user/:userId`  
  *Function: `findDiscountsByUserId`*

- **`PATCH`** `/discounts/user/:userId/default`  
  *Function: `updateDefaultDiscount`*

- **`POST`** `/discounts/user/:userId/rules`  
  *Function: `addDiscountRule`*

- **`DELETE`** `/discounts/user/:userId/rules/:ruleId`  
  *Function: `HttpCode`*

### Homepage banners

- **`GET`** `/homepage-banners/active`  
  *Function: `findAllActive`*

- **`POST`** `/homepage-banners`  
  *Function: `UseGuards`*

- **`GET`** `/homepage-banners`  
  *Function: `UseGuards`*

- **`GET`** `/homepage-banners/:id`  
  *Function: `UseGuards`*

- **`PATCH`** `/homepage-banners/:id`  
  *Function: `UseGuards`*

- **`DELETE`** `/homepage-banners/:id`  
  *Function: `UseGuards`*

### Dashboard

- **`GET`** `/dashboard/stats`  
  *Function: `getStats`*

### Orders

- **`POST`** `/orders`  
  *Function: `create`*

- **`GET`** `/orders`  
  *Function: `findAll`*

- **`GET`** `/orders/:id`  
  *Function: `findOne`*

- **`PATCH`** `/orders/:id/status`  
  *Function: `Roles`*

### Payment mappings

- **`POST`** `/payment-mappings`  
  *Function: `create`*

- **`GET`** `/payment-mappings`  
  *Function: `findAll`*

- **`GET`** `/payment-mappings/:id`  
  *Function: `findOne`*

- **`PATCH`** `/payment-mappings/:id`  
  *Function: `update`*

- **`DELETE`** `/payment-mappings/:id`  
  *Function: `remove`*

### Payment methods

- **`POST`** `/payment-methods`  
  *Function: `UseGuards`*

- **`GET`** `/payment-methods/all`  
  *Function: `UseGuards`*

- **`GET`** `/payment-methods`  
  *Function: `findAllActive`*

- **`GET`** `/payment-methods/:id`  
  *Function: `UseGuards`*

- **`PATCH`** `/payment-methods/:id`  
  *Function: `UseGuards`*

- **`DELETE`** `/payment-methods/:id`  
  *Function: `UseGuards`*

### Payments

- **`POST`** `/payments/midtrans-webhook`  
  *Function: `HttpCode`*

- **`POST`** `/payments/order/:orderId/retry`  
  *Function: `UseGuards`*

### Products

- **`POST`** `/products`  
  *Function: `UseGuards`*

- **`GET`** `/products`  
  *Function: `findAll`*

- **`GET`** `/products/featured`  
  *Function: `findFeatured`*

- **`GET`** `/products/search`  
  *Function: `searchProducts`*

- **`GET`** `/products/:id`  
  *Function: `findOne`*

- **`GET`** `/products/:id/related`  
  *Function: `findRelated`*

- **`PATCH`** `/products/bulk-visible`  
  *Function: `UseGuards`*

- **`PATCH`** `/products/:id`  
  *Function: `UseGuards`*

- **`DELETE`** `/products/:id`  
  *Function: `UseGuards`*

### Settings

- **`GET`** `/settings/ppn`  
  *Function: `getVat`*

- **`PATCH`** `/settings/ppn`  
  *Function: `Roles`*

- **`GET`** `/settings`  
  *Function: `Roles`*

- **`GET`** `/settings/:key`  
  *Function: `Roles`*

- **`PUT`** `/settings/:key`  
  *Function: `Roles`*

- **`POST`** `/settings/batch-update`  
  *Function: `Roles`*

### Shipments

- **`POST`** `/shipments/order/:orderId`  
  *Function: `Roles`*

### Shipping

- **`GET`** `/shipping/areas`  
  *Function: `Public`*

- **`POST`** `/shipping/cost`  
  *Function: `UseGuards`*

- **`GET`** `/shipping/track/:waybillId/:courierCode`  
  *Function: `Public`*

### Upload

- **`POST`** `/upload/image`  
  *Function: `Roles`*

- **`POST`** `/upload/payment-proof/:orderId`  
  *Function: `Roles`*

### Users

- **`GET`** `/users/profile`  
  *Function: `Roles`*

- **`PATCH`** `/users/profile`  
  *Function: `Roles`*

- **`GET`** `/users`  
  *Function: `Roles`*

- **`GET`** `/users/inactive`  
  *Function: `Roles`*

- **`GET`** `/users/:id`  
  *Function: `Roles`*

- **`PATCH`** `/users/:id`  
  *Function: `Roles`*

- **`PATCH`** `/users/:id/role`  
  *Function: `Roles`*

- **`PATCH`** `/users/:id/sync-category`  
  *Function: `Roles`*

- **`PATCH`** `/users/:id/force-reset-category`  
  *Function: `Roles`*

- **`PATCH`** `/users/:id/toggle-active`  
  *Function: `Roles`*

- **`DELETE`** `/users/:id`  
  *Function: `Roles`*

### Webhooks

- **`POST`** `/webhooks/accurate`  
  *Function: `HttpCode`*

- **`POST`** `/webhooks/biteship`  
  *Function: `HttpCode`*

### Wishlist

- **`GET`** `/wishlist`  
  *Function: `getWishlist`*

- **`GET`** `/wishlist/ids`  
  *Function: `getWishlistProductIds`*

- **`POST`** `/wishlist`  
  *Function: `addToWishlist`*

- **`DELETE`** `/wishlist/:productId`  
  *Function: `HttpCode`*

