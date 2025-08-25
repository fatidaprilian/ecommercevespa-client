
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

  if (!priceInfo) {
    return <div className={`font-bold text-gray-900 ${className}`}>-</div>;
  }

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