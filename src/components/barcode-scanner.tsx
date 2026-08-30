"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { supabase } from "@/app/lib/supabase";
import { createListing } from "@/app/lib/createlisting";
import { toast } from "sonner";
import { generateListing } from "@/app/lib/generateListing";
import {
  isNativeBarcodeDetectorSupported,
  createNativeBarcodeScanner,
  playScanBeep,
  triggerScanHaptic,
  toggleCameraTorch,
} from "@/lib/barcode-detector";
import {
  syncProfitToAndroidWidget,
  triggerTactileHaptic,
} from "@/lib/android-bridge";
import {
  calculateThriftCopVerdict,
  ThriftPricingEstimate,
} from "@/lib/thrift-cop-engine";
import {
  Zap,
  Flashlight,
  Volume2,
  VolumeX,
  PackagePlus,
  Trash2,
  CheckCircle2,
  Layers,
  ArrowRight,
  RefreshCw,
  Camera,
  X,
  TrendingUp,
  DollarSign,
} from "lucide-react";

export type Product = {
  barcode: string;
  name: string;
  brand: string;
  category: string;
  image: string;
  suggestedPrice: number;
  title?: string;
  description?: string;
  condition?: string;
  timestamp?: number;
  copEstimate?: ThriftPricingEstimate;
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

  // Turbo Batch Mode State
  const [batchMode, setBatchMode] = useState(false);
  const [scannedBatch, setScannedBatch] = useState<Product[]>([]);
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  // Hardware Controls
  const [torchOn, setTorchOn] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hasNativeDetector, setHasNativeDetector] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeScannerRef = useRef<{ start: () => void; stop: () => void } | null>(null);
  const html5ScannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const lastScannedBarcodeRef = useRef<string | null>(null);
  const lastScanTimestampRef = useRef<number>(0);

  useEffect(() => {
    setHasNativeDetector(isNativeBarcodeDetectorSupported());
  }, []);

  const stopAllScanners = useCallback(async () => {
    // 1. Stop Native Scanner
    if (nativeScannerRef.current) {
      nativeScannerRef.current.stop();
      nativeScannerRef.current = null;
    }

    // 2. Stop HTML5 Scanner
    if (html5ScannerRef.current) {
      try {
        if (html5ScannerRef.current.isScanning) {
          await html5ScannerRef.current.stop();
        }
      } catch {
        // Ignore fallback stop error
      } finally {
        html5ScannerRef.current = null;
      }
    }

    // 3. Stop MediaStream Tracks & Torch
    if (streamRef.current) {
      try {
        await toggleCameraTorch(streamRef.current, false);
      } catch {}
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setTorchOn(false);
  }, []);

  const handleBarcodeLookup = useCallback(
    async (decodedText: string) => {
      const now = Date.now();
      // Debounce identical scans within 2.5 seconds to prevent spamming
      if (
        isProcessingRef.current ||
        (lastScannedBarcodeRef.current === decodedText && now - lastScanTimestampRef.current < 2500)
      ) {
        return;
      }

      isProcessingRef.current = true;
      lastScannedBarcodeRef.current = decodedText;
      lastScanTimestampRef.current = now;

      setBarcode(decodedText);
      setScanError(null);

      // Sound & Haptic Feedback
      if (soundEnabled) playScanBeep();
      triggerScanHaptic([40, 25, 40]);

      try {
        const res = await fetch("/api/barcode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ barcode: decodedText }),
        });

        const data = await res.json();

        if (
          !data.success ||
          !data.product ||
          !(data.product.name || "").trim() ||
          data.product.name.toLowerCase() === "unknown product" ||
          data.product.name.toLowerCase() === "unknown title"
        ) {
          setScanError(
            data?.message ||
              `Barcode (${decodedText}) detected, but product details were not found in the global catalog.`
          );
          if (!batchMode) {
            setScanning(false);
            await stopAllScanners();
          }
          return;
        }

        const listing = generateListing(data.product);
        const copEstimate = calculateThriftCopVerdict({
          resalePrice: Number(data.product.suggestedPrice) || 30,
          category: data.product.category,
        });

        const merged: Product = {
          ...data.product,
          ...listing,
          copEstimate,
          timestamp: Date.now(),
        };

        if (batchMode) {
          // Add to continuous batch list
          setScannedBatch((prev) => [merged, ...prev]);
          triggerTactileHaptic(copEstimate.copVerdict === "MUST_COP" ? "grail" : "success");
          toast.success(
            `⚡ Scanned: ${merged.name.slice(0, 28)}... (+$${copEstimate.netProfit.toFixed(0)} Profit)`
          );
        } else {
          setProduct(merged);
          await stopAllScanners();
          setScanning(false);
        }
      } catch (err) {
        console.error(err);
        setScanError("Network error during barcode lookup. Please try again.");
      } finally {
        isProcessingRef.current = false;
      }
    },
    [batchMode, soundEnabled, stopAllScanners]
  );

  const startScanner = useCallback(async () => {
    setScanError(null);
    await stopAllScanners();

    if (hasNativeDetector && videoRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const nativeScanner = createNativeBarcodeScanner(
          videoRef.current,
          (result) => {
            if (result.rawValue) {
              void handleBarcodeLookup(result.rawValue);
            }
          },
          { fpsThrottle: 45 }
        );

        nativeScannerRef.current = nativeScanner;
        nativeScanner.start();
        return;
      } catch (err) {
        console.warn("[BarcodeScanner] Native stream failed, falling back to Html5Qrcode:", err);
      }
    }

    // Fallback: Html5Qrcode
    try {
      const scanner = new Html5Qrcode("reader");
      html5ScannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 24, qrbox: { width: 280, height: 280 } },
        async (decodedText) => {
          await handleBarcodeLookup(decodedText);
        },
        () => {}
      );
    } catch (error) {
      console.error("Barcode scanner initialization failed:", error);
      setScanError("Camera access was blocked or is unavailable. Please type barcode manually.");
      setScanning(false);
      await stopAllScanners();
    }
  }, [handleBarcodeLookup, hasNativeDetector, stopAllScanners]);

  useEffect(() => {
    if (scanning) {
      void startScanner();
    } else {
      void stopAllScanners();
    }

    return () => {
      void stopAllScanners();
    };
  }, [scanning, startScanner, stopAllScanners]);

  const handleTorchToggle = async () => {
    if (!streamRef.current) return;
    const nextState = !torchOn;
    const ok = await toggleCameraTorch(streamRef.current, nextState);
    if (ok) setTorchOn(nextState);
  };

  const handleManualSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = manualBarcode.trim();
    if (!trimmed) {
      toast.error("Please enter a barcode number first.");
      return;
    }
    await handleBarcodeLookup(trimmed);
  };

  const handleBulkSaveBatch = async () => {
    if (scannedBatch.length === 0) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Please log in to save listings.");
      return;
    }

    setIsBulkSaving(true);
    let successCount = 0;
    let totalProjectedProfit = 0;

    for (const item of scannedBatch) {
      try {
        const estProfit = item.copEstimate?.netProfit || (item.suggestedPrice * 0.7);
        totalProjectedProfit += estProfit;

        const { error } = await createListing({
          userId: user.id,
          product: item.title || item.name,
          description: item.description || "",
          price: item.suggestedPrice,
          cost: item.copEstimate?.estimatedThriftCost || 0,
          image: item.image,
          status: "Draft",
        });

        if (!error) successCount++;
      } catch (err) {
        console.error("Failed to save item:", item.name, err);
      }
    }

    setIsBulkSaving(false);
    triggerTactileHaptic("success");
    syncProfitToAndroidWidget(totalProjectedProfit, successCount);

    toast.success(`🎉 Successfully created ${successCount} listings from your batch!`);
    setScannedBatch([]);
  };

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-md transition-all">
      {/* Top Header & Hardware Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={async () => {
              setProduct(null);
              setBarcode("");
              setScanError(null);
              setScanning(!scanning);
            }}
            className={`font-bold transition-all shadow-md ${
              scanning
                ? "bg-rose-600 hover:bg-rose-500 text-white"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white"
            }`}
          >
            {scanning ? (
              <>
                <X className="mr-1.5 h-4 w-4" /> Stop Camera
              </>
            ) : (
              <>
                <Camera className="mr-1.5 h-4 w-4" /> Start Barcode Scanner
              </>
            )}
          </Button>

          {/* Turbo Batch Mode Toggle */}
          <button
            type="button"
            onClick={() => setBatchMode(!batchMode)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-all border ${
              batchMode
                ? "bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm"
                : "bg-muted text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <Zap className={`h-3.5 w-3.5 ${batchMode ? "text-amber-400 fill-amber-400" : ""}`} />
            <span>Turbo Batch {batchMode ? "ON" : "OFF"}</span>
          </button>
        </div>

        {/* Action Controls: Torch & Sound */}
        <div className="flex items-center gap-1.5">
          {hasNativeDetector && scanning && (
            <button
              type="button"
              onClick={handleTorchToggle}
              title="Toggle Flashlight"
              className={`rounded-xl p-2 border transition-all ${
                torchOn
                  ? "bg-amber-500 text-black border-amber-400 shadow-md"
                  : "bg-muted text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              <Flashlight className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title="Toggle Scan Beep Sound"
            className="rounded-xl p-2 border border-border bg-muted text-muted-foreground hover:text-foreground transition-all"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {hasNativeDetector && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-400 border border-cyan-500/20">
              ⚡ 60 FPS GPU
            </span>
          )}
        </div>
      </div>

      {/* Error Notice */}
      {scanError && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-sm text-amber-300 flex items-start gap-2">
          <div className="mt-0.5 text-base">⚠️</div>
          <div>{scanError}</div>
        </div>
      )}

      {/* Live Viewfinder Viewport */}
      {scanning && (
        <div className="relative w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 aspect-video max-h-[340px] flex items-center justify-center shadow-inner">
          {hasNativeDetector ? (
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="h-full w-full object-cover"
            />
          ) : (
            <div id="reader" className="w-full h-full object-cover" />
          )}

          {/* AR Target Reticle Overlay */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-44 w-64 rounded-xl border-2 border-dashed border-cyan-400/80 bg-cyan-500/5 shadow-[0_0_20px_rgba(6,182,212,0.25)] flex flex-col items-center justify-between p-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-cyan-300">
                {batchMode ? "⚡ Continuous Scan Reticle" : "Align Barcode"}
              </div>
              <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
              <div className="text-[10px] text-cyan-400/70 font-mono">Spadas Hardware Lens</div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Barcode Input */}
      <form onSubmit={handleManualSubmit} className="space-y-2">
        <label htmlFor="manual-barcode" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Or Enter Barcode Manually
        </label>
        <div className="flex gap-2">
          <input
            id="manual-barcode"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            placeholder="e.g. 0194252033005"
            className="h-11 flex-1 rounded-xl border border-input bg-background px-3.5 text-sm shadow-sm placeholder:text-muted-foreground focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
          <Button type="submit" variant="outline" className="font-bold">
            Lookup
          </Button>
        </div>
      </form>

      {/* Turbo Batch Queue Drawer */}
      {batchMode && scannedBatch.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-400" />
              <h4 className="text-sm font-extrabold text-foreground">
                Active Scanned Batch ({scannedBatch.length} Items)
              </h4>
            </div>
            <Button
              size="sm"
              onClick={handleBulkSaveBatch}
              disabled={isBulkSaving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              {isBulkSaving ? (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <PackagePlus className="mr-1.5 h-3.5 w-3.5" />
              )}
              Save All to Inventory
            </Button>
          </div>

          <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
            {scannedBatch.map((item, idx) => {
              const cop = item.copEstimate || calculateThriftCopVerdict({
                resalePrice: item.suggestedPrice,
                category: item.category,
              });

              return (
                <div
                  key={`${item.barcode}-${idx}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-2.5 text-xs"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <img
                      src={item.image || "/icon-192.png"}
                      alt={item.name}
                      className="h-9 w-9 rounded-lg object-contain bg-slate-900 border border-slate-800 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">{item.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${cop.badgeStyle.bg} ${cop.badgeStyle.text} ${cop.badgeStyle.border}`}>
                          {cop.copVerdict === "MUST_COP" ? "🔥 COP" : cop.copVerdict === "QUICK_FLIP" ? "⚡ FLIP" : "MARGIN"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{item.barcode}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-extrabold text-emerald-500">+${cop.netProfit.toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold">
                      Sell: ${item.suggestedPrice}
                    </p>
                    <button
                      type="button"
                      onClick={() => setScannedBatch((b) => b.filter((_, i) => i !== idx))}
                      className="text-muted-foreground hover:text-rose-400 text-[10px] block ml-auto mt-0.5"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Single Item Result Preview */}
      {!batchMode && product && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4 animate-scale-in">
          {/* Top Verdict Pill */}
          {(() => {
            const cop = product.copEstimate || calculateThriftCopVerdict({
              resalePrice: product.suggestedPrice,
              category: product.category,
            });

            return (
              <div className="space-y-4">
                <div className={`p-3 rounded-xl border flex items-center justify-between ${cop.badgeStyle.bg} ${cop.badgeStyle.border}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black uppercase ${cop.badgeStyle.text}`}>
                      {cop.verdictLabel}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-foreground">
                    +{cop.roiPercentage}% Projected ROI
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                  <img
                    src={product.image || "/icon-192.png"}
                    alt={product.name}
                    className="h-40 w-40 rounded-xl object-contain bg-slate-950 border border-border p-2"
                  />
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3" /> Catalog Matched
                    </span>
                    <h2 className="text-xl font-extrabold text-foreground">{product.name}</h2>
                    
                    <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                      <div className="p-2 rounded-lg bg-muted/50 border border-border text-center">
                        <p className="text-[10px] text-muted-foreground font-semibold">Resale Value</p>
                        <p className="font-extrabold text-foreground text-sm">${product.suggestedPrice}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50 border border-border text-center">
                        <p className="text-[10px] text-muted-foreground font-semibold">Est. Thrift Cost</p>
                        <p className="font-extrabold text-muted-foreground text-sm">${cop.estimatedThriftCost}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                        <p className="text-[10px] text-emerald-400 font-semibold">Net Profit</p>
                        <p className="font-extrabold text-emerald-400 text-sm">+${cop.netProfit.toFixed(2)}</p>
                      </div>
                    </div>

                    {cop.sourcingTip && (
                      <p className="text-[11px] text-cyan-400/90 font-medium pt-1 text-left">
                        {cop.sourcingTip}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="rounded-xl bg-muted/60 p-3.5 text-xs space-y-1">
            <p className="font-bold text-foreground">Listing Title:</p>
            <p className="text-muted-foreground">{product.title}</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setProduct(null);
                setBarcode("");
                setScanning(false);
              }}
            >
              Close
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              onClick={async () => {
                const {
                  data: { user },
                } = await supabase.auth.getUser();

                if (!user) {
                  toast.error("Please log in first.");
                  return;
                }

                const cop = product.copEstimate || calculateThriftCopVerdict({
                  resalePrice: product.suggestedPrice,
                  category: product.category,
                });

                const { error } = await createListing({
                  userId: user.id,
                  product: product.title || product.name,
                  description: product.description || "",
                  price: product.suggestedPrice,
                  cost: cop.estimatedThriftCost,
                  image: product.image,
                  status: "Draft",
                });

                if (error) {
                  toast.error(error.message || "Failed to create listing.");
                  return;
                }

                triggerTactileHaptic("success");
                syncProfitToAndroidWidget(cop.netProfit, 1);

                toast.success("Listing created in your inventory!");
                onCreateListing?.(product);
                setProduct(null);
                setBarcode("");
                setScanning(false);
              }}
            >
              ➕ Create Listing
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}