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
  className = 'text-2xl',
  originalPriceClassName = 'text-lg',
}: PriceDisplayProps) {

  // 👇 **START OF CHANGES** 👇
  // Defensive check: If priceInfo is missing, fall back to a simple display
  if (!priceInfo) {
    // This will now handle cases where the base price is available but priceInfo is not.
    // We assume the component is used within a product context.
    // If you pass a product prop, you can use product.price here.
    // For now, we'll return a placeholder to avoid crashing.
    return <div className={`font-bold text-gray-900 ${className}`}>-</div>;
  }
  // 👆 **END OF CHANGES** 👆

  if (priceInfo.finalPrice >= priceInfo.originalPrice) {
    return (
      <p className={`font-bold text-gray-900 ${className}`}>
        {formatPrice(priceInfo.finalPrice)}
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <p className={`font-bold text-red-600 ${className}`}>
        {formatPrice(priceInfo.finalPrice)}
      </p>
      <div className="flex flex-col">
        <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-md">
          {priceInfo.discountPercentage}% OFF
        </span>
      </div>
    </div>
  );
}