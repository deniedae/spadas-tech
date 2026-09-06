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
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 md:grid-cols-2 xl:grid-cols-4">
      <Card
        title="Total Units"
        value={totalListings}
        subtitle="Catalog inventory"
        icon={<Package className="h-4 w-4 text-[#F97316]" />}
        iconBg="bg-[#161922] border border-zinc-800"
      />

      <Card
        title="Realized Profit"
        value={fmtMoney(totalProfit)}
        subtitle="Net after fees"
        valueColor="text-[#22C55E]"
        icon={<TrendingUp className="h-4 w-4 text-[#22C55E]" />}
        iconBg="bg-[#22C55E]/10 border border-[#22C55E]/30"
      />

      <Card
        title="Inventory Worth"
        value={fmtMoney(inventoryValue)}
        subtitle="Current valuation"
        icon={<DollarSign className="h-4 w-4 text-[#F97316]" />}
        iconBg="bg-[#161922] border border-zinc-800"
      />

      <Card
        title="Units Dispatched"
        value={soldListings}
        subtitle="Settled sales"
        icon={<ShoppingCart className="h-4 w-4 text-[#22C55E]" />}
        iconBg="bg-[#161922] border border-zinc-800"
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
  valueColor = "text-zinc-100",
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  valueColor?: string;
}) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={`${title}: ${value}`}
      className="specimen-card bg-[#0E1118] border border-zinc-800 p-3 sm:p-4 rounded-lg relative overflow-hidden focus:outline-none focus:border-[#F97316] transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase font-bold text-zinc-400 truncate tracking-wider">{title}</p>
          <h2 className={`mt-1 sm:mt-2 text-xl sm:text-2xl font-mono font-black tabular-nums tracking-tight data-readout truncate ${valueColor}`}>
            {value}
          </h2>
          <p className="mt-0.5 font-mono text-[10px] text-zinc-500 truncate">{subtitle}</p>
        </div>
        <div
          className={`${iconBg} rounded-md p-1.5 sm:p-2 flex items-center justify-center shrink-0`}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
