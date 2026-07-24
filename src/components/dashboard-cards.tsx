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
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      <Card
        title="Total Listings"
        value={totalListings}
        subtitle="Items in your inventory"
        icon={<Package className="h-6 w-6 text-blue-600" />}
        iconBg="bg-blue-100"
      />

      <Card
        title="Total Profit"
        value={fmtMoney(totalProfit)}
        subtitle="Profit from sold items"
        icon={<TrendingUp className="h-6 w-6 text-green-600" />}
        iconBg="bg-green-100"
      />

      <Card
        title="Inventory Value"
        value={fmtMoney(inventoryValue)}
        subtitle="Current inventory worth"
        icon={<DollarSign className="h-6 w-6 text-amber-600" />}
        iconBg="bg-amber-100"
      />

      <Card
        title="Sold Listings"
        value={soldListings}
        subtitle="Completed sales"
        icon={<ShoppingCart className="h-6 w-6 text-purple-600" />}
        iconBg="bg-purple-100"
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
    <div className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">
            {title}
          </p>

          <h2 className="mt-3 text-4xl font-bold text-gray-900">
            {value}
          </h2>

          <p className="mt-3 text-sm text-gray-400">
            {subtitle}
          </p>
        </div>

        <div className={`rounded-xl p-3 ${iconBg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
