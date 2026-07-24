"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";

type Listing = {
  id: number;
  product: string;
  price: number;
  cost: number;
  purchase_price: number;
  sold_price: number;
  shipping_cost: number;
  fees: number;
  sold_at: string | null;
  status: string;
};

type Props = {
  listing: Listing;
  onUpdated: () => void;
};

export default function EditListingDialog({ listing, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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
  }, [listing.id]);

  async function saveChanges() {
    if (!product.trim()) {
      toast.error("Product name is required.");
      return;
    }

    setSaving(true);
    try {
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
          sold_at:
            status === "Sold"
              ? listing.sold_at ?? new Date().toISOString()
              : null,
        })
        .eq("id", listing.id);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Listing updated successfully!");
      setOpen(false);
      onUpdated();
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        ✏️ Edit
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setOpen(false)}
            onKeyDown={handleKeyDown}
            role="dialog"
            aria-modal="true"
            aria-label="Edit listing"
          >
            <div
              className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-4 text-2xl font-bold">Edit Listing</h2>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="edit-product"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Product
                  </label>
                  <input
                    id="edit-product"
                    className="w-full rounded-lg border p-3"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    placeholder="Product"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-price"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Listing Price
                  </label>
                  <input
                    id="edit-price"
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border p-3"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Price"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-cost"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Cost
                  </label>
                  <input
                    id="edit-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border p-3"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="Cost"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-purchase-price"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Purchase Price
                  </label>
                  <input
                    id="edit-purchase-price"
                    type="number"
                    min="0"
                    step="0.01"
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
                      <label
                        htmlFor="edit-sold-price"
                        className="mb-1 block text-sm font-medium text-gray-700"
                      >
                        Sold Price
                      </label>
                      <input
                        id="edit-sold-price"
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-lg border p-3"
                        value={soldPrice}
                        onChange={(e) => setSoldPrice(e.target.value)}
                        placeholder="Sold Price"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="edit-shipping"
                        className="mb-1 block text-sm font-medium text-gray-700"
                      >
                        Shipping Cost
                      </label>
                      <input
                        id="edit-shipping"
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-lg border p-3"
                        value={shippingCost}
                        onChange={(e) => setShippingCost(e.target.value)}
                        placeholder="Shipping Cost"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="edit-fees"
                        className="mb-1 block text-sm font-medium text-gray-700"
                      >
                        Marketplace Fees
                      </label>
                      <input
                        id="edit-fees"
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-lg border p-3"
                        value={fees}
                        onChange={(e) => setFees(e.target.value)}
                        placeholder="Marketplace Fees"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="edit-status"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Status
                  </label>
                  <select
                    id="edit-status"
                    className="w-full rounded-lg border p-3"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option>Draft</option>
                    <option>Active</option>
                    <option>Sold</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={saveChanges}
                    disabled={saving}
                    className="flex-1 rounded-lg bg-green-600 p-3 text-white disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
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
          </div>,
          document.body,
        )}
    </>
  );
}
