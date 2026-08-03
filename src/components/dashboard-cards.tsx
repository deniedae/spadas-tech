import {
  Package,
  DollarSign,
  TrendingUp,
  ShoppingCart,
} from "lucide-react";
import { fmtMoney } from "@/app/lib/listings";

type Props = {
  totalListings: number;
  soldListings: number;
  totalProfit: number;
  inventoryValue: number;
};

export default function DashboardCards({
  totalListings,
  soldListings,
  totalProfit,
  inventoryValue,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-2 xl:grid-cols-4">
      <Card
        title="Total Listings"
        value={totalListings}
        subtitle="Items in inventory"
        icon={<Package className="h-5 w-5 sm:h-7 sm:w-7 text-blue-600" />}
        iconBg="bg-gradient-to-tr from-blue-200 to-blue-100"
      />

      <Card
        title="Total Profit"
        value={fmtMoney(totalProfit)}
        subtitle="Profit from sales"
        icon={<TrendingUp className="h-5 w-5 sm:h-7 sm:w-7 text-green-600" />}
        iconBg="bg-gradient-to-tr from-green-200 to-green-100"
      />

      <Card
        title="Inventory Value"
        value={fmtMoney(inventoryValue)}
        subtitle="Inventory worth"
        icon={<DollarSign className="h-5 w-5 sm:h-7 sm:w-7 text-amber-600" />}
        iconBg="bg-gradient-to-tr from-amber-200 to-amber-100"
      />

      <Card
        title="Sold Listings"
        value={soldListings}
        subtitle="Completed sales"
        icon={<ShoppingCart className="h-5 w-5 sm:h-7 sm:w-7 text-purple-600" />}
        iconBg="bg-gradient-to-tr from-purple-200 to-purple-100"
      />
    </div>
  );
}

function Card({
  title,
  value,
  subtitle,
  icon,
  iconBg,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={`${title}: ${value}`}
      className="group rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-base font-semibold text-gray-600 truncate">{title}</p>
          <h2 className="mt-1 sm:mt-3 text-xl sm:text-4xl font-extrabold text-gray-900 tabular-nums truncate">
            {value}
          </h2>
          <p className="mt-1 text-[11px] sm:text-sm text-gray-400 truncate">{subtitle}</p>
        </div>
        <div
          className={`${iconBg} rounded-xl p-2.5 sm:p-4 flex items-center justify-center shadow-md flex-shrink-0`}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
