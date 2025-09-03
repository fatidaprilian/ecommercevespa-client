-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "public"."Address"("userId");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "public"."CartItem"("cartId");

-- CreateIndex
CREATE INDEX "CartItem_productId_idx" ON "public"."CartItem"("productId");

-- CreateIndex
CREATE INDEX "ErpSyncLog_productId_idx" ON "public"."ErpSyncLog"("productId");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "public"."Order"("userId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "public"."OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "public"."OrderItem"("productId");

-- CreateIndex
CREATE INDEX "Payment_manualPaymentMethodId_idx" ON "public"."Payment"("manualPaymentMethodId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "public"."Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_brandId_idx" ON "public"."Product"("brandId");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "public"."ProductImage"("productId");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "public"."Review"("userId");

-- CreateIndex
CREATE INDEX "Review_productId_idx" ON "public"."Review"("productId");

-- CreateIndex
CREATE INDEX "User_resellerTierId_idx" ON "public"."User"("resellerTierId");

-- CreateIndex
CREATE INDEX "UserCategoryDiscount_userId_idx" ON "public"."UserCategoryDiscount"("userId");

-- CreateIndex
CREATE INDEX "UserCategoryDiscount_categoryId_idx" ON "public"."UserCategoryDiscount"("categoryId");

-- CreateIndex
CREATE INDEX "UserProductDiscount_userId_idx" ON "public"."UserProductDiscount"("userId");

-- CreateIndex
CREATE INDEX "UserProductDiscount_productId_idx" ON "public"."UserProductDiscount"("productId");

-- CreateIndex
CREATE INDEX "Wishlist_userId_idx" ON "public"."Wishlist"("userId");

-- CreateIndex
CREATE INDEX "Wishlist_productId_idx" ON "public"."Wishlist"("productId");
