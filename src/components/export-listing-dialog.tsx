"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Listing = {
  product: string;
  description: string;
  price: number;
};

export default function ExportListingDialog({
  listing,
}: {
  listing: Listing;
}) {
  const [marketplace, setMarketplace] = useState("ebay");

  const exportData = {
    ebay: {
      title: `${listing.product} | Fast Shipping`,
      description: `${listing.description}

✔ Fast postage
✔ Trusted seller
✔ Buy with confidence`,
    },

    facebook: {
      title: listing.product,
      description: `${listing.description}

Pickup available.
Happy to answer any questions.`,
    },

    vinted: {
      title: listing.product,
      description: `${listing.description}

#gaming #electronics #vinted`,
    },
  };

  async function copyTitle() {
    await navigator.clipboard.writeText(
      exportData[marketplace as keyof typeof exportData].title
    );

   toast.success("Title copied!");
  }

  async function copyDescription() {
    await navigator.clipboard.writeText(
      exportData[marketplace as keyof typeof exportData].description
    );

toast.success("Description copied!");
  }

  return (
    <Dialog>
      <DialogTrigger>
        <Button variant="outline">📤 Export</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Export Listing</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <select
            className="w-full rounded-lg border p-3"
            value={marketplace}
            onChange={(e) => setMarketplace(e.target.value)}
          >
            <option value="ebay">eBay</option>
            <option value="facebook">Facebook Marketplace</option>
            <option value="vinted">Vinted</option>
          </select>

          <div className="rounded-xl border bg-gray-50 p-4">
            <h3 className="mb-2 font-semibold">Preview</h3>

            <p className="font-bold">
              {exportData[marketplace as keyof typeof exportData].title}
            </p>

            <p className="mt-3 whitespace-pre-wrap">
              {exportData[marketplace as keyof typeof exportData].description}
            </p>

            <p className="mt-3 font-semibold">
              Price: ${listing.price.toFixed(2)}
            </p>

            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={copyTitle}
              >
                📋 Copy Title
              </Button>

              <Button
                className="flex-1"
                onClick={copyDescription}
              >
                📄 Copy Description
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}