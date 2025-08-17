// file: app/components/molecules/PriceDisplay.tsx

import { PriceInfo } from "@/types";

// Helper untuk format harga
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(price);
};

interface PriceDisplayProps {
  priceInfo: PriceInfo;
  className?: string;
  originalPriceClassName?: string;
}

export default function PriceDisplay({
  priceInfo,
  className = 'text-2xl',
  originalPriceClassName = 'text-lg',
}: PriceDisplayProps) {

  // ✅ PERBAIKAN: Pemeriksaan defensif untuk mencegah crash
  if (!priceInfo) {
    // Tampilkan placeholder atau tidak sama sekali jika data tidak ada
    return <div className={`font-bold text-gray-900 ${className}`}>-</div>;
  }

  // Jika tidak ada diskon (harga final sama dengan atau lebih besar dari harga asli)
  if (priceInfo.finalPrice >= priceInfo.originalPrice) {
    return (
      <p className={`font-bold text-gray-900 ${className}`}>
        {formatPrice(priceInfo.finalPrice)}
      </p>
    );
  }

  // Jika ada diskon, tampilkan harga final, harga asli (dicoret), dan label diskon
  return (
    <div className="flex items-center gap-3">
      <p className={`font-bold text-red-600 ${className}`}>
        {formatPrice(priceInfo.finalPrice)}
      </p>
      <div className="flex flex-col">
        <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-md">
          {priceInfo.discountPercentage}% OFF
        </span>
        <p className={`font-medium text-gray-500 line-through ${originalPriceClassName}`}>
          {formatPrice(priceInfo.originalPrice)}
        </p>
      </div>
    </div>
  );
}