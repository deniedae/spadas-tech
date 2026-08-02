"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { supabase } from "@/app/lib/supabase";
import { createListing } from "@/app/lib/createlisting";
import { toast } from "sonner";
import { generateListing } from "@/app/lib/generateListing";

type Product = {
  barcode: string;
  name: string;
  brand: string;
  category: string;
  image: string;
  suggestedPrice: number;
  title?: string;
  description?: string;
  condition?: string;
};

export default function BarcodeScanner({
  onCreateListing,
}: {
  onCreateListing?: (product: Product) => void;
}) {
  const [scanning, setScanning] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [manualBarcode, setManualBarcode] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      if ((scanner as Html5Qrcode & { isScanning?: () => boolean }).isScanning?.()) {
        await scanner.stop();
      }
    } catch {
      // Ignore stop errors when the camera is unavailable or the scanner never started.
    } finally {
      scannerRef.current = null;
    }
  }, []);

  const handleBarcodeLookup = useCallback(async (decodedText: string) => {
    setBarcode(decodedText);
    setScanError(null);

    try {
      const res = await fetch("/api/barcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ barcode: decodedText }),
      });

      const data = await res.json();

      if (!data.success) {
        setScanError(data.message || "Barcode not found.");
        return;
      }

      const listing = generateListing(data.product);
      const merged = {
        ...data.product,
        ...listing,
      } as Product;

      onCreateListing?.(merged);
      setProduct(merged);
      await stopScanner();
      setScanning(false);
    } catch (err) {
      console.error(err);
      setScanError("Could not look up that barcode.");
    }
  }, [onCreateListing, stopScanner]);

  useEffect(() => {
    if (!scanning) {
      void stopScanner();
      return;
    }

    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;

    const startScanner = async () => {
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 15, qrbox: 250 },
          async (decodedText) => {
            await handleBarcodeLookup(decodedText);
          },
          () => {}
        );
      } catch (error) {
        console.error("Barcode scanner start failed:", error);
        setScanError("No camera was found. Enter the barcode manually below instead.");
        setScanning(false);
        await stopScanner();
      }
    };

    void startScanner();

    return () => {
      void stopScanner();
    };
  }, [handleBarcodeLookup, scanning, stopScanner]);

  const handleManualSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = manualBarcode.trim();

    if (!trimmed) {
      toast.error("Enter a barcode first.");
      return;
    }

    await handleBarcodeLookup(trimmed);
  };

  return (
    <div className="space-y-4 rounded-xl border p-6">
      <Button
        onClick={async () => {
          setProduct(null);
          setBarcode("");
          setScanError(null);
          if (scanning) {
            setScanning(false);
            return;
          }
          setScanning(true);
        }}
      >
        📷 Scan Barcode
      </Button>

      {scanError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {scanError}
        </div>
      )}

      {scanning && (
        <div
          id="reader"
          className="w-full overflow-hidden rounded-lg border"
        />
      )}

      <form onSubmit={handleManualSubmit} className="space-y-2">
        <label htmlFor="manual-barcode" className="text-sm font-medium text-muted-foreground">
          Or enter barcode manually
        </label>
        <div className="flex gap-2">
          <input
            id="manual-barcode"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            placeholder="e.g. 9780143127550"
            className="h-11 flex-1 rounded-lg border border-input bg-background px-3 text-sm shadow-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
          <Button type="submit" variant="outline">
            Lookup
          </Button>
        </div>
      </form>

      {product && (
        <div className="rounded-xl border bg-white p-6 shadow-lg">
          <img
            src={product.image}
            alt={product.name}
            className="mx-auto mb-6 h-48 w-full rounded-lg object-contain"
          />

          <h2 className="text-2xl font-bold">
            {product.name}
          </h2>

          <div className="mt-4 space-y-2 text-gray-700">
            <p>
              <strong>Brand:</strong> {product.brand}
            </p>

            <p>
              <strong>Category:</strong> {product.category}
            </p>

            <p className="text-lg font-semibold text-green-600">
              Suggested Price: ${product.suggestedPrice}
            </p>
          </div>

          <div className="mt-6 rounded-lg bg-gray-100 p-4">
            <h3 className="text-lg font-bold">
              📝 Listing Preview
            </h3>

            <div className="mt-4">
              <p className="font-semibold">Title</p>
              <p>{product.title}</p>
            </div>

            <div className="mt-4">
              <p className="font-semibold">Description</p>

              <p className="whitespace-pre-wrap text-sm">
                {product.description}
              </p>
            </div>

            <div className="mt-4">
              <strong>Condition:</strong> {product.condition}
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setProduct(null);
                setBarcode("");
                setScanning(false);
              }}
            >
              ❌ Close
            </Button>

            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setProduct(null);
                setBarcode("");
                setScanError(null);
                setScanning(true);
              }}
            >
              🔄 Scan Again
            </Button>
          </div>

          <Button
            className="mt-4 w-full"
            onClick={async () => {
              const {
                data: { user },
              } = await supabase.auth.getUser();

              if (!user) {
                toast.error("Please log in first.");
                return;
              }

              const title = product.title ?? product.name;
              const description = product.description ?? "";

              const { data, error } = await createListing({
                userId: user.id,
                product: title,
                description,
                price: product.suggestedPrice,
                cost: 0,
                image: product.image,
                status: "Draft",
              });

              if (error) {
                console.error(error);
                toast.error(error.message || "Failed to create listing.");
                return;
              }

              toast.success("Listing created successfully!");
              setProduct(null);
              setBarcode("");
              setScanning(false);
              console.log(data);
            }}
          >
            ➕ Create Listing
          </Button>
        </div>
      )}
    </div>
  );
}