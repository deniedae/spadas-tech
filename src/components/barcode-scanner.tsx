"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";

export default function BarcodeScanner() {
  const [scanning, setScanning] = useState(false);
  const [barcode, setBarcode] = useState("");
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
        (decodedText) => {
          setBarcode(decodedText);

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
      if (
        scannerRef.current &&
        scannerRef.current.isScanning
      ) {
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

      {barcode && (
        <div className="rounded-lg bg-green-100 p-4">
          <p className="font-semibold">Barcode Found:</p>
          <p>{barcode}</p>
        </div>
      )}
    </div>
  );
}