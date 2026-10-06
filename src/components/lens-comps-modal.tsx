"use client";

import React, { useState, useMemo, useEffect, useDeferredValue, startTransition, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ExternalLink,
  X,
  ShoppingBag,
  Tag,
  Sliders,
  ShieldCheck,
  Sparkles,
  Zap,
  Droplets,
  Globe,
  Search,
  Loader2,
  Camera,
  Plus,
  Trash2,
  Store,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  Package,
  BarChart3,
  ArrowUpRight,
  Layers,
} from "lucide-react";
import { track } from "@vercel/analytics";
import { scannerAudio } from "@/lib/scanner-audio";
import { fmtMoney, formatAUD } from "@/app/lib/listings";
import { createListing } from "@/app/lib/createlisting";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";
import { compressFileToDataUrl } from "@/lib/image-preprocessor";
import { generateEbayPrefillUrl } from "@/app/lib/marketplaces/ebay-prefill";
import {
  cleanBrandText,
  cleanCategoryText,
  cleanConditionText,
  isBulkOrLotTitle,
  isMeaningfulMeta,
} from "@/lib/lens-utils";
import { triggerTactileHaptic, syncProfitToAndroidWidget, openExternalUrlSafely } from "@/lib/android-bridge";
import {
  estimateCategoryShippingCost,
  detectThriftTrap,
  calculateThriftCopVerdict,
} from "@/lib/thrift-cop-engine";
import {
  AUSPOST_PARCEL_RATES,
  USPS_PARCEL_RATES,
  EBAY_AU_FEE_RATE,
  EBAY_AU_FIXED_FEE,
  EBAY_US_FEE_RATE,
  EBAY_US_FIXED_FEE,
  type AusPostParcelTier,
} from "@/lib/fee-engine";
import { calculateSalesVelocity } from "@/lib/turnover-velocity-engine";
import {
  calculateConditionValuation,
  type PhysicalConditionTier,
  CONDITION_MULTIPLIERS,
} from "@/lib/condition-haircut-engine";
import { calculateSpectralComps } from "@/lib/comps-volatility-engine";
import { calculateSeasonalityProfile } from "@/lib/seasonal-velocity-engine";
import { ensureVerifiedSoldComps } from "@/components/AuditCompsLedger";
import { estimateAustralianMarketValue } from "@/lib/valuation-heuristics";
import {
  isFragranceOrLiquid,
  detectFragranceAttributes,
  calculateFragranceLiquidMultiplier,
  sanitizeCompsForUsedCondition,
} from "@/lib/fragrance-liquid-engine";
import type { DetectedHit, ActiveScanItem, RawSoldComp } from "@/types/lens";

// Dynamic lazy import for non-critical modal drawer to reduce initial bundle and improve INP
const LensCopilotDrawer = dynamic(() => import("@/components/lens-copilot-drawer"), {
  ssr: false,
});

interface LensCompsModalProps {
  isOpen: boolean;
  item: DetectedHit | ActiveScanItem | null;
  frozenFrameUrl?: string | null;
  currency?: string;
  onClose: () => void;
  onResumeScan: () => void;
  onListEbay?: (item: DetectedHit | ActiveScanItem) => void;
  onDeepVerify?: (item: DetectedHit | ActiveScanItem) => void;
  onTriggerBarcodeScan?: () => void;
}

export default function LensCompsModal({
  isOpen,
  item,
  frozenFrameUrl,
  currency,
  onClose,
  onResumeScan,
  onListEbay,
  onDeepVerify,
  onTriggerBarcodeScan,
}: LensCompsModalProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const mountTimeRef = useRef<number>(0);

  // Smoothly fade out top floating pill bar when Valuation Modal mounts/opens
  useEffect(() => {
    if (!isOpen) return;
    mountTimeRef.current = Date.now();
    document.body.setAttribute("data-comps-open", "true");
    document.body.classList.add("valuation-modal-open");
    return () => {
      document.body.removeAttribute("data-comps-open");
      document.body.classList.remove("valuation-modal-open");
    };
  }, [isOpen]);

  // UI state: Collapsible P&L, Comps view mode (carousel vs list), expanded comps, and advanced analytics
  const [isPlExpanded, setIsPlExpanded] = useState<boolean>(false);
  const [compsViewMode, setCompsViewMode] = useState<"carousel" | "list">("carousel");
  const [showAllComps, setShowAllComps] = useState<boolean>(false);
  const [isAdvancedAnalyticsOpen, setIsAdvancedAnalyticsOpen] = useState<boolean>(false);

  // Condition & restoration states for advanced analytics
  const [conditionTier, setConditionTier] = useState<PhysicalConditionTier>("used_excellent");
  const [isRestorationApplied, setIsRestorationApplied] = useState<boolean>(false);

  const title = (item as any)?.name || (item as any)?.productName || (item as any)?.title || "Scanned Item";
  const brand = cleanBrandText(item?.brand, "Unbranded") || "Unbranded";
  const category = cleanCategoryText(item?.category, "General Resale") || "General Resale";
  const condition = cleanConditionText(item?.condition, "Used - Good");

  const categoryEstimate = useMemo(
    () => estimateAustralianMarketValue({ title, brand, category, condition }),
    [title, brand, category, condition]
  );

  // In-aisle interactive tag price & valuation
  const initialEstValue = item && Number(item.estimatedValue) && Number(item.estimatedValue) > 0
    ? Number(item.estimatedValue)
    : categoryEstimate.estimatedMedian;

  const initialTagCost = item
    ? Number(item.tagPrice || item.estCost) || categoryEstimate.typicalOpShopCost
    : categoryEstimate.typicalOpShopCost;

  const [customTagCost, setCustomTagCost] = useState<number>(initialTagCost);
  // Manual AusPost parcel-tier override — null means "Auto" (heuristic)
  const [customPostageTier, setCustomPostageTier] = useState<AusPostParcelTier | null>(null);

  // Resale Price Adjuster State (User can adjust listing price or pick quick presets)
  const [customResalePrice, setCustomResalePrice] = useState<number | null>(null);

  // 1 to 5 Multi-Photo Management directly in the dialog
  const initialPhotos = useMemo(() => {
    const p: string[] = [];
    if (frozenFrameUrl) p.push(frozenFrameUrl);
    else if ((item as any)?.image) p.push((item as any).image);
    if (Array.isArray((item as any)?.photos)) {
      for (const photo of (item as any).photos) {
        if (photo && !p.includes(photo)) p.push(photo);
      }
    }
    return p.slice(0, 5);
  }, [frozenFrameUrl, item]);

  const [listingPhotos, setListingPhotos] = useState<string[]>(initialPhotos);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Comps segmented view: "sold" vs "active"
  const [compsMarketTab, setCompsMarketTab] = useState<"sold" | "active">("sold");

  // 1-Tap Live Publish to eBay state
  const [isPublishingEbay, setIsPublishingEbay] = useState<boolean>(false);
  const [ebayPublishSuccess, setEbayPublishSuccess] = useState<boolean>(false);
  const [liveEbayListingUrl, setLiveEbayListingUrl] = useState<string | null>(null);

  useEffect(() => {
    setListingPhotos(initialPhotos);
    setCustomResalePrice(null);
    setEbayPublishSuccess(false);
    setLiveEbayListingUrl(null);
  }, [item, initialPhotos]);

  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const availableSlots = 5 - listingPhotos.length;
    if (availableSlots <= 0) {
      toast.info("Maximum 5 photos per listing.");
      return;
    }
    const toProcess = Array.from(files).slice(0, availableSlots);
    toast.info("Processing photos...", { duration: 1000 });
    const compressed = await Promise.all(
      toProcess.map((f) => compressFileToDataUrl(f, { maxDimension: 850, quality: 0.75 }))
    );
    const valid = compressed.filter((u) => u && u.length > 2000);
    if (valid.length > 0) {
      setListingPhotos((prev) => [...prev, ...valid].slice(0, 5));
      triggerTactileHaptic("success");
      toast.success(`Added ${valid.length} photo(s)! (${listingPhotos.length + valid.length}/5)`);
    }
  };

  const handleRemovePhoto = (idx: number) => {
    setListingPhotos((prev) => prev.filter((_, i) => i !== idx));
    triggerTactileHaptic("light");
  };

  // Fragrance & Liquid Fill-Level Engine Detection
  const isLiquidOrFragrance = useMemo(() => {
    const liquidCategories = [
      "Fragrance", "Perfume", "Cologne", "Beauty", "Liquids", "Liquid",
      "Eau de", "EDP", "EDT", "Parfum", "Aftershave", "Body Mist", "Skincare"
    ];
    const catLower = (category || "").toLowerCase();
    const titleLower = (title || "").toLowerCase();
    const hitTitleLower = (((item as any)?.title || (item as any)?.name || "") as string).toLowerCase();

    const matchesKeyword = liquidCategories.some((cat) => {
      const lower = cat.toLowerCase();
      return (
        catLower.includes(lower) ||
        titleLower.includes(lower) ||
        hitTitleLower.includes(lower)
      );
    });

    return matchesKeyword || isFragranceOrLiquid(title, category);
  }, [category, title, item]);

  const autoFragranceAttrs = useMemo(
    () => detectFragranceAttributes(title, condition, (item as any)?.defectNotes || []),
    [title, condition, item]
  );

  const [isFragranceActive, setIsFragranceActive] = useState<boolean>(isLiquidOrFragrance);
  const [fillLevel, setFillLevel] = useState<number>(autoFragranceAttrs.fillLevelPercent);
  const [hasCap, setHasCap] = useState<boolean>(autoFragranceAttrs.hasCap);
  const [isTester, setIsTester] = useState<boolean>(autoFragranceAttrs.isTester);
  const [hasBox, setHasBox] = useState<boolean>(autoFragranceAttrs.hasBox);

  // INP Optimization: Decouple high-frequency slider states using useDeferredValue
  const deferredFillLevel = useDeferredValue(fillLevel);
  const deferredTagCost = useDeferredValue(customTagCost);
  const deferredConditionTier = useDeferredValue(conditionTier);

  // 60fps (~16ms) RAF Throttled update handlers for continuous slider inputs
  const fillThrottleRef = useRef<number | null>(null);
  const handleFillLevelChange = useCallback((newVal: number) => {
    if (fillThrottleRef.current) {
      cancelAnimationFrame(fillThrottleRef.current);
    }
    fillThrottleRef.current = requestAnimationFrame(() => {
      setFillLevel(newVal);
      fillThrottleRef.current = null;
    });
    triggerTactileHaptic("light");
  }, []);

  const handlePresetFill = useCallback((val: number) => {
    startTransition(() => {
      setFillLevel(val);
    });
    triggerTactileHaptic("selection");
  }, []);

  const tagCostThrottleRef = useRef<number | null>(null);
  const handleTagCostChange = useCallback((val: number) => {
    if (tagCostThrottleRef.current) {
      cancelAnimationFrame(tagCostThrottleRef.current);
    }
    tagCostThrottleRef.current = requestAnimationFrame(() => {
      setCustomTagCost(val);
      tagCostThrottleRef.current = null;
    });
  }, []);

  const handlePresetTagCost = useCallback((val: number) => {
    startTransition(() => {
      setCustomTagCost(val);
    });
    triggerTactileHaptic("light");
  }, []);

  const handleConditionTierChange = useCallback((tier: PhysicalConditionTier) => {
    startTransition(() => {
      setConditionTier(tier);
    });
    triggerTactileHaptic("selection");
  }, []);

  // Sync state whenever scanned item changes
  useEffect(() => {
    if (item) {
      setIsFragranceActive(isLiquidOrFragrance);
      const attrs = detectFragranceAttributes(title, condition, (item as any)?.defectNotes || []);
      setFillLevel(attrs.fillLevelPercent);
      setHasCap(attrs.hasCap);
      setIsTester(attrs.isTester);
      setHasBox(attrs.hasBox);
      // Reset postage override for each new scan
      setCustomPostageTier(null);
      const newCost = Number(item.tagPrice || item.estCost) || categoryEstimate.typicalOpShopCost;
      setCustomTagCost(newCost);
    }
  }, [item, title, category, condition, isLiquidOrFragrance, categoryEstimate.typicalOpShopCost]);

  const fragranceMultiplier = useMemo(() => {
    if (!isLiquidOrFragrance || !isFragranceActive) return 1.0;
    return calculateFragranceLiquidMultiplier({
      fillLevelPercent: deferredFillLevel,
      hasCap,
      isTester,
      hasBox,
    });
  }, [isLiquidOrFragrance, isFragranceActive, deferredFillLevel, hasCap, isTester, hasBox]);

  // 1. Unbranded & Low-Confidence Comps Guardrail
  const hasBrandOrModel = Boolean(
    (item as any)?.has_brand_or_model ??
    (brand &&
     brand.toLowerCase() !== "unbranded" &&
     brand.toLowerCase() !== "generic" &&
     brand.toLowerCase() !== "unknown" &&
     brand.trim().length > 1)
  );

  // Extract raw comps and ensure 3 to 5 verified recent sold listings
  const rawComps: RawSoldComp[] = useMemo(() => {
    if (!item) return [];
    return ensureVerifiedSoldComps(
      (item as any).rawComps,
      title,
      initialEstValue,
      condition,
      brand
    );
  }, [item, title, initialEstValue, condition, brand]);

  // Condition-aware & fragrance fill-level sanitized comps
  // When condition is detected or toggled to Used: Exclude listings containing keywords: BNIB, NIB, Sealed, Brand New
  const isTargetUsed = !condition || !/\b(brand new|new with tags|nwt|sealed|bnib|nib)\b/i.test(condition) || conditionTier.startsWith("used_");
  const effectiveComps: RawSoldComp[] = useMemo(() => {
    const sanitized = sanitizeCompsForUsedCondition(rawComps, condition, fragranceMultiplier);
    if (isTargetUsed) {
      const preOwnedOnly = sanitized.filter(
        (c) => !/\b(bnib|nib|sealed|brand new|factory sealed|shrink wrapped|nwt|new in box|unopened)\b/i.test(c.title)
      );
      if (preOwnedOnly.length > 0) {
        return preOwnedOnly;
      }
    }
    return sanitized;
  }, [rawComps, condition, fragranceMultiplier, isTargetUsed]);

  const compsRange = useMemo(() => {
    const baseDefault = (isLiquidOrFragrance && isFragranceActive)
      ? Math.max(2, Math.round(initialEstValue * fragranceMultiplier * 100) / 100)
      : initialEstValue;

    if (!item) return { min: Math.round(baseDefault * 0.7), max: Math.round(baseDefault * 1.3), median: baseDefault };

    const isTargetLot = isBulkOrLotTitle(title);
    const nonLotComps = isTargetLot ? effectiveComps : effectiveComps.filter((c) => !isBulkOrLotTitle(c.title, title));
    const candidateComps = nonLotComps.length > 0 ? nonLotComps : effectiveComps;

    const compPrices = candidateComps.map((c) => c.price).filter((p) => p > 0).sort((a, b) => a - b);
    let maxIqrAllowed = Infinity;
    let minIqrAllowed = 1;
    if (compPrices.length >= 3) {
      const q1 = compPrices[Math.floor(compPrices.length * 0.25)];
      const q3 = compPrices[Math.floor(compPrices.length * 0.75)];
      const iqr = q3 - q1;
      if (iqr > 0) {
        maxIqrAllowed = q3 + 1.5 * iqr;
        minIqrAllowed = Math.max(1, q1 - 1.5 * iqr);
      }
    }

    const medianComp = compPrices.length > 0 ? compPrices[Math.floor(compPrices.length / 2)] : baseDefault;
    if (medianComp > 0) {
      maxIqrAllowed = Math.min(maxIqrAllowed, Math.round(medianComp * 2.2 * 100) / 100);
    }

    const filteredPrices = compPrices.filter((p) => p <= maxIqrAllowed && p >= minIqrAllowed);

    const baseRange = (item as any).compsRange ? {
      min: Math.max(1, Math.round(((item as any).compsRange.min || 1) * fragranceMultiplier * 100) / 100),
      max: Math.max(1, Math.round(((item as any).compsRange.max || 1) * fragranceMultiplier * 100) / 100),
      median: Math.max(1, Math.round(((item as any).compsRange.median || baseDefault) * fragranceMultiplier * 100) / 100),
    } : {
      min: (item as any).suggestedPriceMin ? Math.round((item as any).suggestedPriceMin * fragranceMultiplier * 100) / 100 : (filteredPrices.length > 0 ? filteredPrices[0] : Math.max(1, Math.round(baseDefault * 0.72))),
      max: (item as any).suggestedPriceMax ? Math.round((item as any).suggestedPriceMax * fragranceMultiplier * 100) / 100 : (filteredPrices.length > 0 ? filteredPrices[filteredPrices.length - 1] : Math.round(baseDefault * 1.28)),
      median: baseDefault,
    };

    const rawMax = filteredPrices.length > 0 ? filteredPrices[filteredPrices.length - 1] : baseRange.max;
    const rawMin = filteredPrices.length > 0 ? filteredPrices[0] : baseRange.min;
    const rawMedian = filteredPrices.length > 0 ? filteredPrices[Math.floor(filteredPrices.length / 2)] : baseRange.median;

    const cappedMax = isFinite(maxIqrAllowed) ? Math.min(rawMax, Math.round(maxIqrAllowed * 100) / 100) : rawMax;
    const cappedMin = Math.max(rawMin, minIqrAllowed);

    return {
      min: cappedMin,
      max: Math.max(cappedMin, cappedMax),
      median: Math.min(cappedMax, Math.max(cappedMin, rawMedian)),
    };
  }, [item, initialEstValue, effectiveComps, title, isLiquidOrFragrance, isFragranceActive, fragranceMultiplier]);

  const isUsMarket = Boolean(
    currency === "USD" ||
    (item as any)?.currency === "USD" ||
    (item as any)?.isUsMarketOnly ||
    effectiveComps.some((c) => (c as any).isUsComp) ||
    (typeof window !== "undefined" && localStorage.getItem("spadas_selected_currency") === "USD")
  );
  const parcelRates = isUsMarket ? USPS_PARCEL_RATES : AUSPOST_PARCEL_RATES;
  const targetCurrency = isUsMarket ? "USD" : "AUD";

  // ── Active Asks vs Sold Comps Splits & Realistic Resale Price Engine ───────
  const activeCompsList: RawSoldComp[] = useMemo(() => {
    if (Array.isArray((item as any)?.activeComps) && (item as any).activeComps.length > 0) {
      return (item as any).activeComps;
    }
    return effectiveComps.filter((c) => c.soldDate === "Active Ask" || (c as any).isActiveAsk || (c as any).is_active_ask);
  }, [item, effectiveComps]);

  const soldCompsList: RawSoldComp[] = useMemo(() => {
    const sold = effectiveComps.filter((c) => c.soldDate !== "Active Ask" && !(c as any).isActiveAsk && !(c as any).is_active_ask);
    return sold.length > 0 ? sold : effectiveComps;
  }, [effectiveComps]);

  const rawActiveMedian = (item as any)?.activeMedian ?? (activeCompsList.length > 0 ? activeCompsList[0].price : 0);
  const rawSoldMedian = (item as any)?.soldMedian ?? compsRange.median ?? initialEstValue;
  const activeCompCount = (item as any)?.activeCount ?? activeCompsList.length;
  const soldCompCount = (item as any)?.soldCount ?? soldCompsList.length;

  const rawActiveMin = (item as any)?.activeMin ?? (rawActiveMedian > 0 ? Math.round(rawActiveMedian * 0.75) : 0);
  const rawActiveMax = (item as any)?.activeMax ?? (rawActiveMedian > 0 ? Math.round(rawActiveMedian * 1.35) : 0);
  const rawSoldMin = (item as any)?.soldMin ?? compsRange.min;
  const rawSoldMax = (item as any)?.soldMax ?? compsRange.max;

  // Realistic selling price on eBay: calibrated high-liquidity flip target
  const recommendedQuickSellPrice = useMemo(() => {
    if ((item as any)?.recommendedPrice && Number((item as any).recommendedPrice) > 0) {
      return Number((item as any).recommendedPrice);
    }
    if (rawSoldMedian > 0) {
      // 5% below median sold comps for instant liquidity
      return Math.max(5, Math.round(rawSoldMedian * 0.95 * 100) / 100);
    }
    if (rawActiveMedian > 0) {
      return Math.max(5, Math.round(rawActiveMedian * 0.92 * 100) / 100);
    }
    return Math.max(5, Math.round(compsRange.median * 0.95 * 100) / 100);
  }, [item, rawSoldMedian, rawActiveMedian, compsRange.median]);

  // Dynamic active resale price (user override or recommended quick-sell price with fragrance adjustments)
  const activeResalePrice = customResalePrice !== null
    ? customResalePrice
    : (isLiquidOrFragrance && isFragranceActive)
      ? Math.round(recommendedQuickSellPrice * fragranceMultiplier * 100) / 100
      : recommendedQuickSellPrice;

  const effectiveTagCost = Math.max(0, Math.round(deferredTagCost * 100) / 100);
  const autoShipping = estimateCategoryShippingCost(category, title, targetCurrency);
  const estShipping = customPostageTier !== null
    ? parcelRates[customPostageTier]
    : autoShipping;
  detectThriftTrap(title, activeResalePrice, brand);

  const confidenceScore = (item as any)?.confidenceScore || (item as any)?.confidence || 0.96;
  const requiresSecondaryVerification = Boolean((item as any)?.requiresSecondaryVerification);

  // Strict algorithmic cop verdict based on dynamic target price and regional fees
  const copEstimate = useMemo(() => {
    return calculateThriftCopVerdict({
      resalePrice: activeResalePrice,
      customCost: effectiveTagCost,
      category,
      productName: title,
      brand,
      shippingCost: estShipping,
      platformFeeRate: isUsMarket ? EBAY_US_FEE_RATE : EBAY_AU_FEE_RATE,
      fixedFee: isUsMarket ? EBAY_US_FIXED_FEE : EBAY_AU_FIXED_FEE,
      confidenceScore,
      needsVerification: requiresSecondaryVerification,
    });
  }, [activeResalePrice, effectiveTagCost, category, title, brand, estShipping, isUsMarket, confidenceScore, requiresSecondaryVerification]);

  const {
    netProfit,
    roiPercentage: roi,
    copVerdict,
    platformFees: platformFee,
  } = copEstimate;

  const isGrail = copVerdict === "MUST_COP" || Boolean((item as any)?.isGrail);
  const isUsMarketOnly = Boolean((item as any)?.isUsMarketOnly || effectiveComps.some((c) => (c as any).isUsComp));
  const usMedianUsd = (item as any)?.usMedianUsd;
  const arbitrageSignal = (item as any)?.arbitrageSignal;

  // Recommendation: PASS, FLIP, or HIGH PROFIT
  const recommendation: "PASS" | "FLIP" | "HIGH PROFIT" = useMemo(() => {
    if (netProfit <= 0 || copVerdict === "PASS_RISKY") {
      return "PASS";
    }
    // Guardrail: Unbranded with < 5 comps and low margin defaults to PASS
    if (!hasBrandOrModel && effectiveComps.length < 5 && netProfit < 15) {
      return "PASS";
    }
    if ((roi >= 200 && netProfit >= 25) || copVerdict === "MUST_COP" || isGrail) {
      return "HIGH PROFIT";
    }
    return "FLIP";
  }, [netProfit, copVerdict, hasBrandOrModel, effectiveComps.length, roi, isGrail]);

  const ebayDomain = isUsMarket ? "ebay.com" : "ebay.com.au";
  const cleanSearchQuery = encodeURIComponent(title.replace(/[^\w\s-]/g, "").trim());
  const ebayActiveSearchUrl = `https://www.${ebayDomain}/sch/i.html?_nkw=${cleanSearchQuery}`;

  // ── Advanced Analytics Calculations ──────────────────────────────────────
  const marketplaceArbitrage = useMemo(() => {
    const ebayGross = activeResalePrice;
    const ebayFees = Math.round((ebayGross * 0.134 + 0.30) * 100) / 100;
    const ebayNet = Math.max(0, Math.round((ebayGross - effectiveTagCost - ebayFees - estShipping) * 100) / 100);

    const depopGross = Math.round(activeResalePrice * 0.96);
    const depopFees = Math.round(depopGross * 0.10 * 100) / 100;
    const depopNet = Math.max(0, Math.round((depopGross - effectiveTagCost - depopFees - estShipping) * 100) / 100);

    const gumtreeGross = Math.round(activeResalePrice * 0.90);
    const gumtreeNet = Math.max(0, Math.round((gumtreeGross - effectiveTagCost) * 100) / 100);

    const fbGross = Math.round(activeResalePrice * 0.88);
    const fbNet = Math.max(0, Math.round((fbGross - effectiveTagCost) * 100) / 100);

    const channels = [
      { name: "eBay AU", gross: ebayGross, fees: ebayFees, net: ebayNet, code: "EBAY" },
      { name: "Depop AU", gross: depopGross, fees: depopFees, net: depopNet, code: "DEPOP" },
      { name: "Gumtree AU", gross: gumtreeGross, fees: 0, net: gumtreeNet, code: "GUMTREE" },
      { name: "FB Marketplace", gross: fbGross, fees: 0, net: fbNet, code: "FB" },
    ];
    channels.sort((a, b) => b.net - a.net);
    return { channels, bestChannel: channels[0] };
  }, [activeResalePrice, effectiveTagCost, estShipping]);

  const conditionEvaluation = useMemo(() => {
    return calculateConditionValuation({
      baselineMedianPrice: compsRange.median || initialEstValue,
      conditionTier: deferredConditionTier,
      conditionText: condition,
      flawNotes: (item as any)?.defectNotes || (item as any)?.wearInspection || "",
      productName: title,
      category,
    });
  }, [compsRange.median, initialEstValue, deferredConditionTier, condition, item, title, category]);

  const spectralComps = useMemo(() => {
    const mappedPoints = effectiveComps.map((c) => ({
      title: c.title,
      price: c.price,
      dateSold: c.soldDate,
    }));
    return calculateSpectralComps(mappedPoints, activeResalePrice);
  }, [effectiveComps, activeResalePrice]);

  const salesVelocity = useMemo(() => {
    return calculateSalesVelocity({
      productName: title,
      category,
      brand,
    });
  }, [title, category, brand]);

  const seasonalityProfile = useMemo(() => {
    return calculateSeasonalityProfile({
      productName: title,
      category,
      estimatedResalePrice: activeResalePrice,
      thriftCost: effectiveTagCost,
    });
  }, [title, category, activeResalePrice, effectiveTagCost]);

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard against synthetic/queued keystrokes immediately upon modal mount
      if (Date.now() - mountTimeRef.current < 600) return;

      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === "input" || targetTag === "textarea") {
        if (e.key === "Escape") (e.target as HTMLElement)?.blur();
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.code === "Space" || e.key === "n" || e.key === "N") {
        e.preventDefault();
        triggerTactileHaptic("selection");
        onResumeScan();
      } else if ((e.key === "l" || e.key === "L") && onListEbay && item) {
        e.preventDefault();
        triggerTactileHaptic("medium");
        onListEbay(item);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onResumeScan, onListEbay, item]);

  // Telemetry event + procedural audio feedback on modal reveal
  useEffect(() => {
    if (isOpen && item) {
      scannerAudio.play(isGrail ? "grail" : "lock");
      try {
        track("lens_comp_modal_opened", {
          name: title,
          brand,
          category,
          estimatedValue: activeResalePrice,
          netProfit,
        });
      } catch {}
    }
  }, [isOpen, item, isGrail, title, brand, category, activeResalePrice, netProfit]);

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please sign in to save inventory drafts.");
        router.push("/login?redirect=/lens");
        return;
      }

      const primaryImage = listingPhotos[0] || frozenFrameUrl || (item as any)?.image || undefined;

      const { error } = await createListing({
        userId: user.id,
        product: title,
        description: `Sourced via Spadas Cognitive Lens Engine. Category: ${category}. Condition: ${condition}${isLiquidOrFragrance && isFragranceActive ? ` (${fillLevel}% Fill, ${hasCap ? "With Cap" : "No Cap"}${isTester ? ", Tester" : ""})` : ""}. Target Value: ${formatAUD(activeResalePrice)}. Realized sold comps source: eBay AU/US.`,
        price: activeResalePrice,
        cost: effectiveTagCost,
        status: "Draft",
        image: primaryImage,
      });

      if (error) throw error;

      setIsSaved(true);
      triggerTactileHaptic("success");
      syncProfitToAndroidWidget(netProfit, 1);
      toast.success(`Saved "${title.slice(0, 24)}..." (+$${netProfit} Net Profit)!`);

      try {
        track("lens_comp_draft_saved", {
          title,
          brand,
          category,
          netProfit,
          roi,
        });
      } catch {}
    } catch (err: any) {
      console.error("Save draft error:", err);
      toast.error(err.message || "Failed to save draft.");
    } finally {
      setIsSaving(false);
    }
  };

  // 1-Tap Direct Publish to eBay with frictionless fallback to eBay prefill flow
  const handle1TapPublishEbay = async () => {
    setIsPublishingEbay(true);
    try {
      triggerTactileHaptic("medium");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const payload = {
        product: title,
        description: `Sourced via Spadas Cognitive Lens Engine.\n\nBrand: ${brand}\nCategory: ${category}\nCondition: ${condition}\nTarget Sale Price: ${formatAUD(activeResalePrice)}\nComp Verification: eBay Secondary Market.`,
        price: activeResalePrice,
        currency: targetCurrency,
        condition,
        brand,
        category,
        imageUrls: listingPhotos.length > 0 ? listingPhotos : previewImageSrc ? [previewImageSrc] : [],
        forceLive: true,
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/marketplaces/ebay/publish", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && data.listingUrl) {
        setEbayPublishSuccess(true);
        setLiveEbayListingUrl(data.listingUrl);
        triggerTactileHaptic("success");
        toast.success("Listing published live to eBay!");
        openExternalUrlSafely(data.listingUrl, title);
        return;
      }

      // If auth required or eBay credentials not connected, smooth prefill fallback
      if (res.status === 401 || data.error?.includes("log in") || data.error?.includes("eBay token") || data.error?.includes("connect")) {
        const prefillUrl = generateEbayPrefillUrl({
          title,
          price: activeResalePrice,
          currency: targetCurrency,
          brand,
          category,
        });
        triggerTactileHaptic("success");
        toast.info("Opening eBay listing wizard pre-populated with your comps & pricing!");
        openExternalUrlSafely(prefillUrl, title);
        return;
      }

      throw new Error(data.error || "Unable to publish directly to eBay.");
    } catch (err: any) {
      console.error("1-Tap eBay Publish notice:", err);
      const prefillUrl = generateEbayPrefillUrl({
        title,
        price: activeResalePrice,
        currency: targetCurrency,
        brand,
        category,
      });
      toast.info("Opening eBay listing flow...");
      openExternalUrlSafely(prefillUrl, title);
    } finally {
      setIsPublishingEbay(false);
    }
  };

  const previewImageSrc = frozenFrameUrl || (item as any)?.image || null;

  const isZeroSoldActive =
    Boolean((item as any)?.isActiveAskOnly) ||
    (item as any)?.compsSource === "browse_api" ||
    (item as any)?.compsSource === "active_listings" ||
    (effectiveComps.length > 0 && effectiveComps.every((c) => c.soldDate === "Active Ask" || (c as any).isActiveAsk || (c as any).is_active_ask));

  const activeCount = (item as any)?.activeCompsCount || (item as any)?.activeMarketSupply?.activeCount || effectiveComps.length;

  // Trust line calculation with unbranded & low-comp data guardrails
  const trustLineText = useMemo(() => {
    if (isZeroSoldActive) {
      return `0 sold (past 90d) · ${activeCount} active on market`;
    }
    if (effectiveComps.length === 0) {
      return "0 sold comps · algorithmic appraisal";
    }
    if (effectiveComps.length < 5) {
      return "Insufficient Comp Data (Low Confidence)";
    }
    return `${effectiveComps.length} sold comps · last 5 days`;
  }, [isZeroSoldActive, activeCount, effectiveComps.length]);

  const top3Comps = effectiveComps.slice(0, 3);
  const visibleComps = showAllComps ? effectiveComps : top3Comps;
  const remainingCount = Math.max(0, effectiveComps.length - 3);

  // 2. Metric Overflow Glitches Bounding Check: Only render IRR badge if realistic
  const renderIrrBadge = useMemo(() => {
    const irr = seasonalityProfile.annualizedIrrQuickFlip;
    if (isNaN(irr) || !isFinite(irr) || irr < -100 || irr > 1000 || irr <= 0) {
      return null;
    }
    return (
      <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] flex items-center justify-between">
        <span className="text-zinc-400">Fast-Flip IRR:</span>
        <span className="text-cyan-400 font-bold tabular-nums">~{irr}%/yr</span>
      </div>
    );
  }, [seasonalityProfile.annualizedIrrQuickFlip]);

  if (!isOpen || !item) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none"
      style={{ transform: "translate3d(0,0,0)", willChange: "transform" }}
      onClick={(e) => {
        // Explicit Dismissal Rule: Never close the comps modal on backdrop click or background touches.
        // The modal must stay up solidly until the user explicitly taps 'Scan Next', 'Save Draft', 'List on eBay', or the 'X' button.
      }}
    >
      <div
        className="relative w-full max-w-md max-h-[92dvh] sm:max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-100 overflow-hidden shadow-2xl pt-[max(16px,env(safe-area-inset-top))] sm:pt-0"
        style={{ transform: "translate3d(0,0,0)", willChange: "transform" }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-zinc-700 sm:hidden shrink-0" />

        {/* ── Top Header / Item Identifier ──────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2.5 min-w-0">
            {previewImageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewImageSrc}
                alt={title}
                className="h-9 w-9 rounded-lg object-cover border border-zinc-800 shrink-0 bg-zinc-900"
              />
            ) : (
              <div className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                <ShoppingBag className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-white truncate max-w-[240px] sm:max-w-xs">
                {title}
              </h2>
              {/* Metadata Pills: Brand / Unbranded Warning + Category + Confidence Score + Regional Comps Status */}
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                {isUsMarket ? (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="font-mono text-[9px] px-1 bg-emerald-500/20 rounded">US</span>
                    <span>eBay US Comps</span>
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                    <span className="font-mono text-[9px] px-1 bg-emerald-500/20 rounded">AU</span>
                    <span>Strict AU Comps</span>
                  </span>
                )}
                {hasBrandOrModel ? (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-zinc-850 text-zinc-300 border border-zinc-750">
                    {brand}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Unbranded Visual Comp
                  </span>
                )}
                {isMeaningfulMeta(category) && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800">
                    {category}
                  </span>
                )}
                {isLiquidOrFragrance && isFragranceActive && fragranceMultiplier < 0.98 && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 tabular-nums">
                    {fillLevel}% Fill{!hasCap ? " · No Cap" : ""}{isTester ? " · Tester" : ""}
                  </span>
                )}
                <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 tabular-nums">
                  {Math.round(confidenceScore * 100)}% Match
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose || onResumeScan}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable Body Content (Aisle-Ready Mode) ────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y divide-y divide-zinc-800/80 custom-scrollbar">
          {/* ── 1. HERO NET PROFIT & RECOMMENDATION ──────────────────────────── */}
          <div className="p-4 space-y-3 min-h-[110px]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className={`text-[36px] sm:text-[40px] leading-none font-bold tabular-nums flex items-baseline gap-1.5 min-h-[44px] ${
                  netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}>
                  <span>{formatAUD(netProfit)}</span>
                  <span className={`text-base font-semibold ${netProfit >= 0 ? "text-emerald-300/80" : "text-rose-300/80"}`}>Net</span>
                </div>
                <div className="text-xs text-zinc-400 mt-1">Take-home profit after fees & shipping</div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums border ${
                    roi > 0
                      ? "bg-zinc-800 text-emerald-400 border-zinc-700"
                      : roi === 0
                      ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                      : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                  }`}
                >
                  {roi > 0 ? `+${Math.round(roi)}% ROI` : `${Math.round(roi)}% ROI`}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    recommendation === "HIGH PROFIT"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : recommendation === "FLIP"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  }`}
                >
                  {recommendation}
                </span>
              </div>
            </div>

            {/* Cross-Border US Arbitrage & Scarcity Callout Card */}
            {isUsMarketOnly && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/35 text-xs space-y-1.5 animate-fade-in shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Cross-Border US Arbitrage Opportunity</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/25 text-amber-200 border border-amber-500/40">
                    High US Liquidity
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  {arbitrageSignal || `No AU sales recorded. High US liquidity (~$${Math.round(usMedianUsd || (activeResalePrice / 1.54))} USD). Profitable for international export or domestic scarcity pricing in Australia.`}
                </p>
                <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-amber-500/20 font-mono">
                  <span>US Median: ${Math.round(usMedianUsd || (activeResalePrice / 1.54))} USD</span>
                  <span>Tracked Air Friction: ~$25 AUD</span>
                </div>
              </div>
            )}

            {/* In-Store Tag Price Selector (Top Fold, Directly Actionable) */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center gap-1.5 shrink-0">
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-medium text-zinc-300">Tag:</span>
                <div className="flex items-center gap-0.5 text-xs text-amber-300 font-bold">
                  <span>$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={customTagCost || ""}
                    onChange={(e) => handleTagCostChange(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-14 rounded-md bg-zinc-950 border border-zinc-700 px-1.5 py-0.5 text-right text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400 tabular-nums"
                  />
                </div>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto py-0.5 custom-scrollbar">
                {[2, 5, 8, 10, 15, 20].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetTagCost(preset)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer tabular-nums ${
                      customTagCost === preset
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700/50"
                    }`}
                  >
                    ${preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Regional Parcel Tier Override Picker */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center gap-1.5 shrink-0">
                <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-300">Post:</span>
                <span className="text-xs text-zinc-400 tabular-nums">${estShipping.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto py-0.5 custom-scrollbar">
                {/* Auto (heuristic) */}
                <button
                  type="button"
                  onClick={() => { startTransition(() => { setCustomPostageTier(null); }); triggerTactileHaptic("light"); }}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer tabular-nums ${
                    customPostageTier === null
                      ? "bg-zinc-700 text-white border border-zinc-600"
                      : "bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700/50"
                  }`}
                >
                  Auto
                </button>
                {([
                  { tier: "small" as AusPostParcelTier, label: `S $${parcelRates.small.toFixed(2)}` },
                  { tier: "medium" as AusPostParcelTier, label: `M $${parcelRates.medium.toFixed(2)}` },
                  { tier: "large" as AusPostParcelTier, label: `L $${parcelRates.large.toFixed(2)}` },
                  { tier: "extraLarge" as AusPostParcelTier, label: `XL $${parcelRates.extraLarge.toFixed(2)}` },
                ] as const).map(({ tier, label }) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => { startTransition(() => { setCustomPostageTier(tier); }); triggerTactileHaptic("light"); }}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer tabular-nums ${
                      customPostageTier === tier
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700/50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {isLiquidOrFragrance && (
              isFragranceActive ? (
                <div className="p-3 rounded-2xl bg-zinc-900 border border-cyan-500/30 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                        <Droplets className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                          <span>Bottle Fill Level & Condition</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 tabular-nums">
                            {fillLevel}%
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate">
                          Normalized comp factor: <span className="text-cyan-300 font-semibold">{fragranceMultiplier}x</span> ({Math.round((1 - fragranceMultiplier) * 100)}% discount vs sealed)
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsFragranceActive(false);
                        triggerTactileHaptic("light");
                      }}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 transition cursor-pointer shrink-0"
                      title="Hide liquid controls"
                    >
                      Dismiss
                    </button>
                  </div>

                  {/* Fill-level Slider & Numeric Indicator (Throttled to 60fps) */}
                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={fillLevel}
                        onChange={(e) => handleFillLevelChange(Number(e.target.value))}
                        className="flex-1 accent-cyan-400 h-1.5 bg-zinc-950 rounded-lg cursor-pointer"
                      />
                      <span className="text-xs font-bold text-cyan-300 tabular-nums w-10 text-right shrink-0">
                        {fillLevel}%
                      </span>
                    </div>

                    {/* Preset Buttons */}
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { label: "100% Full", val: 100 },
                        { label: "75%", val: 75 },
                        { label: "Half (50%)", val: 50 },
                        { label: "Low (30%)", val: 30 },
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => handlePresetFill(preset.val)}
                          className={`py-1 px-1 rounded-lg text-[10px] font-semibold transition cursor-pointer border text-center tabular-nums ${
                            fillLevel === preset.val
                              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                              : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Condition Flags: Partial / No Cap / Tester / Box */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <button
                      type="button"
                      onClick={() => handlePresetFill(fillLevel <= 50 ? 100 : 50)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer border ${
                        fillLevel < 100
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                          : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                      }`}
                    >
                      Partial {fillLevel < 100 ? `(${fillLevel}%)` : ""}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        startTransition(() => {
                          setHasCap(!hasCap);
                        });
                        triggerTactileHaptic("light");
                      }}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer border ${
                        !hasCap
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                      }`}
                    >
                      {!hasCap ? "No Cap (-15%)" : "With Cap"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        startTransition(() => {
                          setIsTester(!isTester);
                        });
                        triggerTactileHaptic("light");
                      }}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer border ${
                        isTester
                          ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                          : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                      }`}
                    >
                      {isTester ? "Tester (-20%)" : "Retail Bottle"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        startTransition(() => {
                          setHasBox(!hasBox);
                        });
                        triggerTactileHaptic("light");
                      }}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer border ${
                        !hasBox
                          ? "bg-zinc-800 text-zinc-300 border-zinc-700"
                          : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                      }`}
                    >
                      {hasBox ? "Boxed" : "No Box (-10%)"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFragranceActive(true);
                      triggerTactileHaptic("selection");
                    }}
                    className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-cyan-300 transition cursor-pointer"
                  >
                    <Droplets className="w-3 h-3 text-cyan-400" />
                    <span>Adjust Bottle Fill-Level & Cap</span>
                  </button>
                </div>
              )
            )}

            {/* P&L breakdown collapsed by default */}
            <div>
              <button
                type="button"
                onClick={() => setIsPlExpanded(!isPlExpanded)}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
              >
                <span>P&L Breakdown</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${isPlExpanded ? "rotate-180" : ""}`}
                />
              </button>

              {isPlExpanded && (
                <div className="mt-2 text-xs text-zinc-300 tabular-nums bg-zinc-900 rounded-xl p-3 border border-zinc-800 space-y-2">
                  <div className="flex items-center flex-wrap gap-1.5 leading-relaxed">
                    <span>Sold {fmtMoney(activeResalePrice)}</span>
                    <span className="text-zinc-500">−</span>
                    <span>Tag {fmtMoney(effectiveTagCost)}</span>
                    <span className="text-zinc-500">−</span>
                    <span>Fees {fmtMoney(platformFee)}</span>
                    <span className="text-zinc-500">−</span>
                    <span>Post {fmtMoney(estShipping)}</span>
                    <span className="text-zinc-500">=</span>
                    <span className="text-emerald-400 font-bold">
                      {formatAUD(netProfit)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── 2. 3-PILLAR RESELLER VALUATION INTELLIGENCE ───────────────────── */}
          <div className="p-4 space-y-3 min-h-[92px]">
            <div className="grid grid-cols-3 gap-2">
              {/* Pillar 1: Live Active Competitor Asks */}
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Active Asks
                </div>
                <div className="text-lg sm:text-xl font-bold text-white tabular-nums my-0.5">
                  {fmtMoney(rawActiveMedian || compsRange.median)}
                </div>
                <div className="text-[10px] text-zinc-500 tabular-nums truncate">
                  {activeCompCount} on market
                </div>
              </div>

              {/* Pillar 2: Realized Sold Comps */}
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Sold Comps
                </div>
                <div className="text-lg sm:text-xl font-bold text-emerald-400 tabular-nums my-0.5">
                  {fmtMoney(rawSoldMedian || compsRange.median)}
                </div>
                <div className="text-[10px] text-zinc-500 tabular-nums truncate">
                  {soldCompCount} verified sold
                </div>
              </div>

              {/* Pillar 3: Realistic Quick-Sell Price on eBay */}
              <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                  Quick-Sell Target
                </div>
                <div className="text-lg sm:text-xl font-bold text-emerald-300 tabular-nums my-0.5">
                  {fmtMoney(recommendedQuickSellPrice)}
                </div>
                <div className="text-[10px] text-emerald-400/80 truncate">
                  High liquidity flip
                </div>
              </div>
            </div>

            {/* In-Depth Comp Reliability & Price Range Callout */}
            <div className="flex items-center justify-between text-xs px-1 text-zinc-400">
              <span className="tabular-nums">
                Range: {fmtMoney(compsRange.min)} – {fmtMoney(compsRange.max)}
              </span>
              <span className="text-[11px] text-zinc-500">{trustLineText}</span>
            </div>

            {/* ── Interactive Resale Price Adjuster (Direct Control & 1-Tap Presets) ── */}
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Adjust Listing Resale Price</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-zinc-400">$</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={activeResalePrice || ""}
                    onChange={(e) => {
                      const val = Math.max(1, parseFloat(e.target.value) || 0);
                      setCustomResalePrice(val);
                      triggerTactileHaptic("light");
                    }}
                    className="w-16 rounded-lg bg-zinc-950 border border-zinc-700 px-2 py-0.5 text-right text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 tabular-nums"
                  />
                </div>
              </div>

              {/* 3 Quick Resale Presets */}
              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const price = Math.max(1, Math.round((rawSoldMedian || recommendedQuickSellPrice) * 0.95));
                    setCustomResalePrice(price);
                    triggerTactileHaptic("selection");
                  }}
                  className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer border text-center tabular-nums ${
                    activeResalePrice === Math.max(1, Math.round((rawSoldMedian || recommendedQuickSellPrice) * 0.95))
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white"
                  }`}
                >
                  Fast-Flip (-5%)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const price = Math.round(rawSoldMedian || compsRange.median);
                    setCustomResalePrice(price);
                    triggerTactileHaptic("selection");
                  }}
                  className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer border text-center tabular-nums ${
                    activeResalePrice === Math.round(rawSoldMedian || compsRange.median)
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white"
                  }`}
                >
                  Sold Median
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const price = Math.round(rawActiveMedian || rawSoldMedian || compsRange.median);
                    setCustomResalePrice(price);
                    triggerTactileHaptic("selection");
                  }}
                  className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer border text-center tabular-nums ${
                    activeResalePrice === Math.round(rawActiveMedian || rawSoldMedian || compsRange.median)
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white"
                  }`}
                >
                  Match Asks
                </button>
              </div>
            </div>

            {/* ── Multi-Photo Intake Tray (1 to 5 Photos) ────────────────────── */}
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Listing Photos ({listingPhotos.length}/5)</span>
                </div>
                <span className="text-[10px] text-zinc-400">
                  Multiple angles boost search rank
                </span>
              </div>

              {/* Photo Strip */}
              <div className="flex items-center gap-2 overflow-x-auto py-1 custom-scrollbar">
                {listingPhotos.map((photo, idx) => (
                  <div
                    key={idx}
                    className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-950 group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo}
                      alt={`Angle ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] font-medium text-center text-zinc-300 py-0.5">
                      {idx === 0 ? "Cover" : `Angle ${idx + 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 p-0.5 rounded-full bg-black/80 text-zinc-300 hover:text-rose-400 hover:bg-black transition cursor-pointer"
                      title="Remove photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {listingPhotos.length < 5 && (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="h-16 w-16 shrink-0 rounded-lg border border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-950 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-white transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-[9px] font-medium">+ Angle</span>
                  </button>
                )}

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAddPhotos}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* ── 3. SEGMENTED COMPS INTELLIGENCE (Sold vs Active Asks) ──────────── */}
          <div className="p-4 space-y-2.5 min-h-[240px]">
            {/* Segmented Controller: Verified Sold Comps vs Live Active Asks */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center rounded-lg bg-zinc-900 border border-zinc-800 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setCompsMarketTab("sold")}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                    compsMarketTab === "sold"
                      ? "bg-zinc-800 text-white font-bold shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Verified Sold ({soldCompCount})
                </button>
                <button
                  type="button"
                  onClick={() => setCompsMarketTab("active")}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                    compsMarketTab === "active"
                      ? "bg-zinc-800 text-white font-bold shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Active Asks ({activeCompCount})
                </button>
              </div>

              {/* View Mode Toggle: Carousel vs List */}
              <div className="flex items-center rounded-lg bg-zinc-900 border border-zinc-800 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setCompsViewMode("carousel")}
                  className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                    compsViewMode === "carousel"
                      ? "bg-zinc-800 text-white shadow-xs font-bold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Carousel
                </button>
                <button
                  type="button"
                  onClick={() => setCompsViewMode("list")}
                  className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                    compsViewMode === "list"
                      ? "bg-zinc-800 text-white shadow-xs font-bold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  List
                </button>
              </div>
            </div>

            {/* Display active tab comps */}
            {(() => {
              const currentList = compsMarketTab === "sold" ? soldCompsList : activeCompsList;
              const displayComps = showAllComps ? currentList : currentList.slice(0, 3);
              const remaining = Math.max(0, currentList.length - 3);

              if (currentList.length === 0) {
                return (
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center space-y-1.5">
                    <div className="text-sm font-semibold text-zinc-200">
                      No direct {compsMarketTab === "sold" ? "sold" : "active"} comps found
                    </div>
                    <div className="text-xs text-zinc-400">
                      Market valuation estimated using category heuristics and market depth.
                    </div>
                    <button
                      type="button"
                      onClick={(e) => openExternalUrlSafely(ebayActiveSearchUrl, title, e)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-xs text-cyan-300 hover:bg-cyan-500/20 pt-1 cursor-pointer font-semibold transition mt-1"
                    >
                      <span>Search live {isUsMarket ? "eBay US" : "eBay AU"} listings</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                );
              }

              return (
                <>
                  {compsViewMode === "carousel" ? (
                    <div className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory py-1 custom-scrollbar min-h-[210px]">
                      {displayComps.map((comp, idx) => {
                        const isCompActiveAsk = comp.soldDate === "Active Ask" || compsMarketTab === "active";
                        const compImg = comp.thumbnail || (idx === 0 ? previewImageSrc : null);
                        const conditionText = comp.condition ? cleanConditionText(comp.condition) : "Pre-Owned";

                        return (
                          <div
                            key={comp.id || idx}
                            className="w-44 sm:w-48 shrink-0 snap-start bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden p-2.5 flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              {/* Thumbnail */}
                              <div className="relative h-28 w-full rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800/80">
                                {compImg ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={compImg}
                                    alt={comp.title}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-zinc-600">
                                    <ShoppingBag className="w-8 h-8" />
                                  </div>
                                )}
                                <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-medium text-zinc-300 tabular-nums backdrop-blur-xs">
                                  {isCompActiveAsk ? "Active Ask" : comp.soldDate && comp.soldDate !== "Active Ask" ? comp.soldDate : "Recent"}
                                </span>
                              </div>

                              {/* Price */}
                              <div>
                                <div className="text-base font-bold text-white tabular-nums">
                                  {fmtMoney(comp.price)}
                                </div>
                                <div className="text-[11px] text-zinc-300 font-medium truncate mt-0.5">
                                  {conditionText} · {comp.matchPercentage ?? 98}% match
                                </div>
                                <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                                  {comp.title}
                                </div>
                              </div>
                            </div>

                            {/* Link Out */}
                            <div className="pt-2 border-t border-zinc-800/80 mt-2 flex items-center justify-between text-[11px]">
                              <span className="text-zinc-500">{isCompActiveAsk ? "Active Listing" : "Sold Comp"}</span>
                              <button
                                type="button"
                                onClick={(e) => openExternalUrlSafely(comp.url || ebayActiveSearchUrl, comp.title || title, e)}
                                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                                title="View on eBay"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {displayComps.map((comp, idx) => {
                        const isCompActiveAsk = comp.soldDate === "Active Ask" || compsMarketTab === "active";
                        const compImg = comp.thumbnail || (idx === 0 ? previewImageSrc : null);
                        const conditionText = comp.condition ? cleanConditionText(comp.condition) : "Pre-Owned";

                        return (
                          <div
                            key={comp.id || idx}
                            className="min-h-[64px] p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3"
                          >
                            <div className="h-12 w-12 rounded-lg bg-zinc-950 border border-zinc-800 shrink-0 overflow-hidden">
                              {compImg ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={compImg}
                                  alt={comp.title}
                                  loading="lazy"
                                  decoding="async"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-zinc-600">
                                  <ShoppingBag className="w-5 h-5" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold text-white tabular-nums">
                                  {fmtMoney(comp.price)}
                                </span>
                                <span className="text-[10px] text-zinc-400">
                                  · {conditionText} ({comp.matchPercentage ?? 98}%)
                                </span>
                              </div>
                              <div className="text-xs text-zinc-400 truncate mt-0.5">
                                {comp.title}
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-2">
                              <span className="text-xs tabular-nums text-zinc-400">
                                {isCompActiveAsk ? "Active" : comp.soldDate || "Sold"}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => openExternalUrlSafely(comp.url || ebayActiveSearchUrl, comp.title || title, e)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                                title="View on eBay"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {remaining > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAllComps(!showAllComps)}
                      className="w-full py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>{showAllComps ? "Show top 3 comps only" : `Show ${remaining} more comps`}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllComps ? "rotate-180" : ""}`} />
                    </button>
                  )}
                </>
              );
            })()}
          </div>

          {/* ── 4. FOLD DOWN ACCORDION: ADVANCED ANALYTICS ───────────────────── */}
          <div className="p-4 space-y-3">
            <button
              type="button"
              onClick={() => setIsAdvancedAnalyticsOpen(!isAdvancedAnalyticsOpen)}
              className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-xs font-medium text-zinc-300 transition flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Advanced Analytics (Multi-Platform, Forensics, Velocity)</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                  isAdvancedAnalyticsOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isAdvancedAnalyticsOpen && (
              <div className="space-y-3 pt-1 animate-fade-in">
                {/* 1. Multi-Platform Net Realization */}
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">Multi-Platform Net Take-Home</span>
                    <span className="text-[10px] text-emerald-400 font-bold">
                      Best: {marketplaceArbitrage.bestChannel.name} (+${marketplaceArbitrage.bestChannel.net})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {marketplaceArbitrage.channels.map((ch) => (
                      <div
                        key={ch.name}
                        className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs flex items-center justify-between"
                      >
                        <span className="text-zinc-400 flex items-center gap-1.5">
                          <span className="text-[9px] font-mono font-bold px-1 rounded bg-zinc-800 text-zinc-300">{ch.code}</span>
                          <span>{ch.name}</span>
                        </span>
                        <span className="font-bold text-white tabular-nums">+${ch.net}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Physical Condition Multipliers & Restoration Arbitrage */}
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">Condition Multipliers</span>
                    <span className="text-[10px] text-cyan-400 tabular-nums font-bold">
                      {conditionEvaluation.tierLabel} ({conditionEvaluation.tierFactor}x)
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(Object.keys(CONDITION_MULTIPLIERS) as PhysicalConditionTier[]).map((tierKey) => {
                      const conf = CONDITION_MULTIPLIERS[tierKey];
                      const isSelected = conditionTier === tierKey;
                      return (
                        <button
                          key={tierKey}
                          type="button"
                          onClick={() => handleConditionTierChange(tierKey)}
                          className={`py-1 px-1.5 rounded-lg text-[10px] transition cursor-pointer border text-center ${
                            isSelected
                              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold"
                              : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white"
                          }`}
                        >
                          <span className="block truncate">{conf.label.split(" / ")[0]}</span>
                          <span className="text-[9px] opacity-70 tabular-nums">{conf.factor}x</span>
                        </button>
                      );
                    })}
                  </div>

                  {conditionEvaluation.restorationOpportunity && (
                    <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs mt-1">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-emerald-300 text-[11px]">
                          Restoration: +${conditionEvaluation.restorationOpportunity.netValueAddAud} Net
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsRestorationApplied(!isRestorationApplied)}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-black cursor-pointer"
                      >
                        {isRestorationApplied ? "Applied" : "+ Apply"}
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Turnover Velocity, Market Depth & Fixed Bounded IRR */}
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                  <div className="text-xs font-semibold text-white">Turnover Velocity & Depth</div>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Est Days to Sell</span>
                      <span className="text-xs font-bold text-cyan-300">{salesVelocity.estDaysToSell}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Demand Score</span>
                      <span className="text-xs font-bold text-emerald-400 tabular-nums">{salesVelocity.demandScore}/100</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Sell-Through</span>
                      <span className="text-xs font-bold text-amber-300 tabular-nums">{salesVelocity.sellThroughRate}% sold</span>
                    </div>
                  </div>

                  {/* Market Depth */}
                  <div className="grid grid-cols-3 gap-1.5 text-center pt-1">
                    <div className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-[9px] text-zinc-500 block">Auction Floor</span>
                      <span className="text-xs font-bold text-amber-300 tabular-nums">{fmtMoney(spectralComps.liquidationFloor)}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-[9px] text-zinc-500 block">EMA Fair Value</span>
                      <span className="text-xs font-bold text-cyan-300 tabular-nums">{fmtMoney(spectralComps.emaFairMarketValue)}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-[9px] text-zinc-500 block">Patient BIN</span>
                      <span className="text-xs font-bold text-emerald-300 tabular-nums">{fmtMoney(spectralComps.patientBinCeiling)}</span>
                    </div>
                  </div>

                  {/* Bounded IRR badge: Only displayed when realistic */}
                  {renderIrrBadge}
                </div>

                {/* 4. Forensic Inspection Checklist */}
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>In-Aisle Inspection Checklist</span>
                  </div>
                  <ul className="text-[11px] text-zinc-400 space-y-1 pl-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-cyan-400">•</span>
                      <span>Inspect for hairline cracks, chips, scuffs, or missing accessories.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-cyan-400">•</span>
                      <span>Check manufacturer hallmarks, labels, and serial numbers.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-cyan-400">•</span>
                      <span>Verify recent completed sold dates are within 14–30 days.</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Floating Chat Action Button on bottom right of the Valuation Card: [Ask Copilot] */}
        <div className="absolute bottom-[70px] sm:bottom-[76px] right-3 sm:right-4 z-30 pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              setIsCopilotOpen(true);
              triggerTactileHaptic("selection");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500 text-black font-bold text-xs shadow-lg shadow-cyan-500/25 hover:bg-cyan-400 active:scale-95 transition cursor-pointer border border-cyan-400/40"
          >
            <Sparkles className="w-3.5 h-3.5 fill-black" />
            <span>Ask Copilot</span>
          </button>
        </div>

        {/* ── 5. STICKY ACTIONS (Bottom, Equal Height 48px, No Gradient, No Glow) ── */}
        <div className="shrink-0 p-3 sm:p-4 border-t border-zinc-800 bg-zinc-950 z-20 pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))]">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={onResumeScan}
              className="h-12 flex items-center justify-center rounded-xl bg-cyan-500 text-black font-semibold text-sm hover:bg-cyan-400 active:scale-[0.98] transition cursor-pointer"
            >
              Scan Next
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving || isSaved}
              className="h-12 flex items-center justify-center rounded-xl border border-zinc-600 text-white font-medium text-sm hover:bg-zinc-800 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
            >
              {isSaved ? "Saved" : isSaving ? "Saving..." : "Save Draft"}
            </button>
            <button
              type="button"
              onClick={handle1TapPublishEbay}
              disabled={isPublishingEbay}
              className={`h-12 flex items-center justify-center gap-1.5 rounded-xl text-white font-medium text-sm active:scale-[0.98] transition cursor-pointer disabled:opacity-50 ${
                ebayPublishSuccess
                  ? "bg-emerald-600/30 border border-emerald-500 text-emerald-300"
                  : "border border-zinc-600 hover:bg-zinc-800"
              }`}
            >
              {isPublishingEbay ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Publishing...</span>
                </>
              ) : ebayPublishSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Live on eBay</span>
                </>
              ) : (
                <>
                  <Store className="w-4 h-4 text-emerald-400" />
                  <span>1-Tap Publish</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Contextual In-App AI Reseller Copilot Chat Drawer */}
      <LensCopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        itemContext={{
          title,
          brand,
          category,
          condition,
          mediaFormat: (item as any)?.mediaFormat,
          tagPrice: effectiveTagCost,
          fairMarketPrice: activeResalePrice,
          estimatedNet: netProfit,
          comps: effectiveComps.slice(0, 3),
          liquidNotes: (isLiquidOrFragrance && isFragranceActive) ? `${fillLevel}% Fill, ${hasCap ? "With Cap" : "No Cap"}${isTester ? ", Tester" : ""}` : undefined,
          thumbnail: previewImageSrc,
          isUsMarketOnly,
          usMedianUsd,
          arbitrageSignal,
          sellThroughRate: (item as any)?.salesVelocity?.sell_through_rate || "N/A",
          liquiditySpeed: (item as any)?.salesVelocity?.sell_speed,
        }}
      />
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
}
