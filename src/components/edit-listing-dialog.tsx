"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";

type Listing = {
  id: number;
  product: string;
  price: number;
  cost: number;

  purchase_price: number;
  sold_price: number;
 shipping_cost: number;
  fees: number;

  status: string;
};

type Props = {
  listing: Listing;
  onUpdated: () => void;
};

export default function EditListingDialog({
  listing,
  onUpdated,
}: Props) {
  const [open, setOpen] = useState(false);

  const [product, setProduct] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");

  const [purchasePrice, setPurchasePrice] = useState("");
  const [soldPrice, setSoldPrice] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [fees, setFees] = useState("");

  const [status, setStatus] = useState("");

  useEffect(() => {
    setProduct(listing.product);
    setPrice(String(listing.price));
    setCost(String(listing.cost));

    setPurchasePrice(String(listing.purchase_price ?? 0));
    setSoldPrice(String(listing.sold_price ?? 0));
    setShippingCost(String(listing.shipping_cost ?? 0));
    setFees(String(listing.fees ?? 0));

    setStatus(listing.status);
  }, [listing]);

  async function saveChanges() {
  console.log("Editing listing:", listing);
  

  const { data, error } = await supabase
    .from("listings")
    .update({
      product,
      price: Number(price),
      cost: Number(cost),
      purchase_price: Number(purchasePrice),
      sold_price: Number(soldPrice),
      shipping_cost: Number(shippingCost),
      fees: Number(fees),
      status,
    })
    .eq("id", listing.id)
    .select();


  console.log("Updated rows:", data);

  if (error) {
    console.error("Supabase update failed:", error);
    alert(error.message);
    return;
  }

  console.log("Saved successfully!");
  setOpen(false);
  onUpdated();
}

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        ✏️ Edit
      </button>

      {open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-2xl font-bold">
              Edit Listing
            </h2>

            <div className="space-y-4">
            <div>
  <label className="mb-1 block text-sm font-medium text-gray-700">
    Product
  </label>

  <input
    className="w-full rounded-lg border p-3"
    value={product}
    onChange={(e) => setProduct(e.target.value)}
    placeholder="Product"
  />
</div>

              <div>
  <label className="mb-1 block text-sm font-medium text-gray-700">
    Listing Price
  </label>

  <input
    className="w-full rounded-lg border p-3"
    value={price}
    onChange={(e) => setPrice(e.target.value)}
    placeholder="Price"
  />
</div>

              <input
                className="w-full rounded-lg border p-3"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="Cost"
              />

            <div>
  <label className="mb-1 block text-sm font-medium text-gray-700">
    Purchase Price
  </label>

  <input
    className="w-full rounded-lg border p-3"
    value={purchasePrice}
    onChange={(e) => setPurchasePrice(e.target.value)}
    placeholder="Purchase Price"
  />
</div>
{status === "Sold" && (
  <div className="space-y-4">
    <hr className="my-4" />

    <h3 className="text-lg font-semibold text-gray-800">
      Sale Details
    </h3>

    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Sold Price
      </label>

      <input
        className="w-full rounded-lg border p-3"
        value={soldPrice}
        onChange={(e) => setSoldPrice(e.target.value)}
        placeholder="Sold Price"
      />
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Shipping Cost
      </label>

      <input
        className="w-full rounded-lg border p-3"
        value={shippingCost}
        onChange={(e) => setShippingCost(e.target.value)}
        placeholder="Shipping Cost"
      />
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Marketplace Fees
      </label>

      <input
        className="w-full rounded-lg border p-3"
        value={fees}
        onChange={(e) => setFees(e.target.value)}
        placeholder="Marketplace Fees"
      />
    </div>
  </div>
)}
             <div>
  <label className="mb-1 block text-sm font-medium text-gray-700">
    Status
  </label>

  <select
    className="w-full rounded-lg border p-3"
    value={status}
    onChange={(e) => setStatus(e.target.value)}
  >
    <option>Draft</option>
    <option>Sold</option>
  </select>
</div>

              <div className="flex gap-2">
                <button
                  onClick={saveChanges}
                  className="flex-1 rounded-lg bg-green-600 p-3 text-white"
                >
                  Save Changes
                </button>

                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-lg bg-gray-300 p-3"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}