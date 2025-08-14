// file: vespa-ecommerce-web/app/checkout/_components/OrderSummary.tsx
'use client';

import { useCartStore } from '@/store/cart';

// Helper untuk format harga
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(price);
};

// Receive shippingCost as a prop
export function OrderSummary({ shippingCost }: { shippingCost: number | null }) {
  const { cart, selectedItems } = useCartStore();
  
  const selectedCartItems = cart?.items?.filter(item => selectedItems.has(item.id)) || [];
  const subtotal = selectedCartItems.reduce((total, item) => total + Number(item.product.price) * item.quantity, 0);
  const totalItems = selectedCartItems.reduce((total, item) => total + item.quantity, 0);

  // Calculate the final total using the shippingCost prop
  const finalTotal = subtotal + (shippingCost || 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 sticky top-28">
      <h2 className="text-xl font-bold border-b pb-4 mb-4">Ringkasan Pesanan</h2>
      
      <div className="space-y-3 max-h-60 overflow-y-auto pr-2 mb-4">
        {selectedCartItems.length > 0 ? selectedCartItems.map(item => (
          <div key={item.id} className="flex justify-between text-sm items-center">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <img src={item.product.images?.[0]?.url || 'https://placehold.co/100x100'} alt={item.product.name} className="w-12 h-12 object-cover rounded-md" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{item.product.name}</p>
                <p className="text-gray-500">{formatPrice(Number(item.product.price))} x {item.quantity}</p>
              </div>
            </div>
            <span className="font-medium pl-2">{formatPrice(Number(item.product.price) * item.quantity)}</span>
          </div>
        )) : <p className="text-sm text-gray-500 text-center py-4">Tidak ada item yang dipilih.</p>}
      </div>

      <div className="border-t mt-4 pt-4 space-y-2">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal ({totalItems} item)</span>
          <span className="font-semibold">{formatPrice(subtotal)}</span>
        </div>
        
        <div className="flex justify-between text-gray-600">
          <span>Ongkos Kirim</span>
          <span className="font-semibold">
            {shippingCost !== null ? formatPrice(shippingCost) : 'Pilih alamat & kurir'}
          </span>
        </div>

        <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
          <span>Total</span>
          <span>{formatPrice(finalTotal)}</span>
        </div>
      </div>
    </div>
  );
}