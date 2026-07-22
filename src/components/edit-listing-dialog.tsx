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
    const { error } = await supabase
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
      .eq("id", listing.id);

    if (error) {
      alert(error.message);
      return;
    }

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
              <input
                className="w-full rounded-lg border p-3"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="Product"
              />

              <input
                className="w-full rounded-lg border p-3"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Price"
              />

              <input
                className="w-full rounded-lg border p-3"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="Cost"
              />

              <input
                className="w-full rounded-lg border p-3"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="Purchase Price"
              />

              <input
                className="w-full rounded-lg border p-3"
                value={soldPrice}
                onChange={(e) => setSoldPrice(e.target.value)}
                placeholder="Sold Price"
              />

              <input
                className="w-full rounded-lg border p-3"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
                placeholder="Shipping Cost"
              />

              <input
                className="w-full rounded-lg border p-3"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                placeholder="Fees"
              />

              <select
                className="w-full rounded-lg border p-3"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option>Active</option>
                <option>Sold</option>
              </select>

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