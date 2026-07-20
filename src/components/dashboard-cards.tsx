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
    <div className="grid gap-4 md:grid-cols-4">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">📦 Total Listings</p>
        <h2 className="mt-2 text-4xl font-bold">{totalListings}</h2>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">💰 Total Profit</p>
        <h2 className="mt-2 text-4xl font-bold text-green-600">
          ${totalProfit.toFixed(2)}
        </h2>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">💵 Inventory Value</p>
        <h2 className="mt-2 text-4xl font-bold">
          ${inventoryValue.toFixed(2)}
        </h2>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">✅ Sold Listings</p>
        <h2 className="mt-2 text-4xl font-bold text-blue-600">
          {soldListings}
        </h2>
      </div>
    </div>
  );
}