"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { createListing } from "@/app/lib/createlisting";
import { generateListing } from "@/app/lib/generateListing";
type Product = {
  barcode: string;
  name: string;
  brand: string;
  category: string;
  image: string;
  suggestedPrice: number;
};

export default function BarcodeScanner({
  onCreateListing,
}: {
  onCreateListing?: (product: Product) => void;
}) {
  const [scanning, setScanning] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState<any>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!scanning) return;

    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: {
            width: 250,
            height: 120,
          },
        },
        async (decodedText) => {
          setBarcode(decodedText);

          try {
            const res = await fetch("/api/barcode", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                barcode: decodedText,
              }),
            });

            const data = await res.json();

           console.log("Barcode API:", data);

if (data.success) {
  const listing = generateListing(data.product);

  setProduct({
    ...data.product,
    ...listing,
  });
}
          } catch (err) {
            console.error(err);
          }

          scanner
            .stop()
            .then(() => {
              setScanning(false);
            })
            .catch(console.error);
        },
        () => {}
      )
      .catch(console.error);

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [scanning]);

  return (
    <div className="space-y-4 rounded-xl border p-6">
      <Button onClick={() => setScanning(true)}>
        📷 Scan Barcode
      </Button>

      {scanning && (
        <div
          id="reader"
          className="w-full overflow-hidden rounded-lg border"
        />
      )}
{product && (
  <div className="rounded-xl border bg-white p-4 shadow">
    <img
      src={product.image}
      alt={product.name}
      className="mb-4 h-40 w-full rounded-lg object-contain"
    />

    <h2 className="text-xl font-bold">
      {product.name}
    </h2>

    <p className="mt-2 text-gray-600">
      <strong>Brand:</strong> {product.brand}
    </p>

    <p className="text-gray-600">
      <strong>Category:</strong> {product.category}
    </p>

    <p className="mt-3 text-lg font-semibold text-green-600">
      Suggested Price: ${product.suggestedPrice}
    </p>

<Button
  className="mt-4 w-full"
  onClick={async () => {
    if (!product) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please log in first.");
      return;
    }

   const { data, error } = await createListing({
  userId: user.id,
  product: product.title,
  description: product.description,
  price: product.suggestedPrice,
  cost: 0,
  image: product.image,
  status: "Draft",
});

    if (error) {
      console.error(error);
      alert(JSON.stringify(error, null, 2));
      return;
    }

    alert("✅ Listing created!");
    console.log(data);
  }}
><div className="mt-4 rounded-lg bg-gray-100 p-4">
  <h3 className="font-bold text-lg">
    Listing Preview
  </h3>

  <p className="mt-3 font-semibold">
    Title
  </p>

  <p>{product.title}</p>

  <p className="mt-3 font-semibold">
    Description
  </p>

  <p className="whitespace-pre-wrap text-sm">
    {product.description}
  </p>

  <p className="mt-3">
    <strong>Condition:</strong> {product.condition}
  </p>
</div>
  ➕ Create Listing
</Button>
  </div>
)}
      {barcode && (
        <div className="rounded-lg bg-green-100 p-4">
          <p className="font-semibold">Barcode Found:</p>
          <p>{barcode}</p>
        </div>
      )}
    </div>
    
  );
}