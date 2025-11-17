// app/components/molecules/PriceDisplay.tsx

import { PriceInfo } from "@/types";

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
  className = 'text-[22px]', // <-- DIUBAH: Asli 24px, dikecilkan 2px (~1.5pt)
  originalPriceClassName = 'text-base', // <-- Disesuaikan jadi 16px
}: PriceDisplayProps) {

  if (!priceInfo) {
    return <div className={`font-bold text-gray-900 ${className}`}>-</div>;
  }

  // Jika tidak ada diskon, tampilkan harga normal
  if (priceInfo.finalPrice >= priceInfo.originalPrice) {
    return (
      <p className={`font-bold text-gray-900 ${className}`}>
        {formatPrice(priceInfo.finalPrice)}
      </p>
    );
  }

  // Jika ada diskon, tampilkan harga diskon dengan warna hitam
  return (
    <div className="flex items-center gap-3">
      <p className={`font-bold text-gray-900 ${className}`}>
        {formatPrice(priceInfo.finalPrice)}
      </p>
      {/* Elemen untuk menampilkan persentase diskon dihapus */}
    </div>
  );
}