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
  AlertTriangle,
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
  buildCleanListingSubject,
  buildCleanListingDescription,
} from "@/lib/lens-utils";
import { isUSGeo, isUKGeo } from "@/app/lib/currency-routing";
import { EBAY_RESTRICTION_NOTICE, isEbayAccountRestrictedError } from "@/app/lib/marketplaces/ebay";
import { triggerTactileHaptic, syncProfitToAndroidWidget, openExternalUrlSafely } from "@/lib/android-bridge";
import {
  estimateCategoryShippingCost,
  detectThriftTrap,
  calculateThriftCopVerdict,
} from "@/lib/thrift-cop-engine";
import {
  AUSPOST_PARCEL_RATES,
  USPS_PARCEL_RATES,
  ROYAL_MAIL_PARCEL_RATES,
  EBAY_AU_FEE_RATE,
  EBAY_AU_FIXED_FEE,
  EBAY_US_FEE_RATE,
  EBAY_US_FIXED_FEE,
  EBAY_UK_FEE_RATE,
  EBAY_UK_FIXED_FEE,
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
import type { DetectedHit, ActiveScanItem, RawSoldComp, LensModalItem } from "@/types/lens";
import { evaluateCompsEvidence, type CompsEvidence } from "@/lib/comps-evidence-engine";

// Dynamic lazy import for non-critical modal drawer to reduce initial bundle and improve INP
const LensCopilotDrawer = dynamic(() => import("@/components/lens-copilot-drawer"), {
  ssr: false,
});

interface LensCompsModalProps {
  isOpen: boolean;
  item: LensModalItem | null;
  frozenFrameUrl?: string | null;
  currency?: string;
  isUserBookmarked?: boolean;
  onClose: () => void;
  onResumeScan: () => void;
  onListEbay?: (item: DetectedHit | ActiveScanItem) => void;
  onDeepVerify?: (item: DetectedHit | ActiveScanItem) => void;
  onTriggerBarcodeScan?: () => void;
  onSaveDraftSuccess?: (item: DetectedHit | ActiveScanItem) => void;
}

export default function LensCompsModal({
  isOpen,
  item,
  frozenFrameUrl,
  currency,
  isUserBookmarked = false,
  onClose,
  onResumeScan,
  onListEbay,
  onDeepVerify,
  onTriggerBarcodeScan,
  onSaveDraftSuccess,
}: LensCompsModalProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [explicitlySavedIds, setExplicitlySavedIds] = useState<Set<string>>(() => new Set());
  const [accountBlockedNotice, setAccountBlockedNotice] = useState<string | null>(null);
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
  const [compsViewMode, setCompsViewMode] = useState<"carousel" | "list">("list");
  const [showAllComps, setShowAllComps] = useState<boolean>(false);
  const [isAdvancedAnalyticsOpen, setIsAdvancedAnalyticsOpen] = useState<boolean>(false);
  const [showMethodologyModal, setShowMethodologyModal] = useState<boolean>(false);

  // Condition & restoration states for advanced analytics
  const [conditionTier, setConditionTier] = useState<PhysicalConditionTier>("used_excellent");
  const [isRestorationApplied, setIsRestorationApplied] = useState<boolean>(false);

  const currentItemId = item?.id ? String(item.id) : null;
  const prevItemIdRef = useRef<string | null>(null);
  const prevFragranceItemIdRef = useRef<string | null>(null);
  const prevActiveItemIdRef = useRef<string | null>(null);
  const activeCompsCacheRef = useRef<Map<string, RawSoldComp[]>>(new Map());
  const soldCompsCacheRef = useRef<Map<string, RawSoldComp[]>>(new Map());
  const resolvedItemIdsRef = useRef<Set<string>>(new Set());

  const title = item?.name || item?.productName || item?.title || "Scanned Item";
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
    else if (item?.image) p.push(item.image);
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
  const [publishedSku, setPublishedSku] = useState<string | null>(null);
  const [isLiveListing, setIsLiveListing] = useState<boolean>(false);
  const [liveActiveComps, setLiveActiveComps] = useState<RawSoldComp[]>([]);
  const [isLoadingActiveComps, setIsLoadingActiveComps] = useState(false);
  const [activeCompsError, setActiveCompsError] = useState<string | null>(null);
  const [compsResolutionTimedOut, setCompsResolutionTimedOut] = useState(false);

  // Auto-resolve pending comps after 3.5s fail-safe timeout so comps dialog is never trapped in loading skeletons
  useEffect(() => {
    if (!isOpen || !currentItemId) {
      setCompsResolutionTimedOut(false);
      return;
    }
    setCompsResolutionTimedOut(false);
    const timer = setTimeout(() => {
      setCompsResolutionTimedOut(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, [isOpen, currentItemId]);

  useEffect(() => {
    if (!currentItemId) return;
    if (prevItemIdRef.current === currentItemId) {
      // Intentionally preserve user-modified inputs and publish status on the active item
      const isExplicitlySaved = explicitlySavedIds.has(currentItemId);
      setIsSaved(Boolean(isUserBookmarked || isExplicitlySaved));
      return;
    }
    prevItemIdRef.current = currentItemId;

    setListingPhotos(initialPhotos);
    setCustomResalePrice(null);
    setEbayPublishSuccess(false);
    setLiveEbayListingUrl(null);
    setPublishedSku(null);
    setIsLiveListing(false);
    setIsSaving(false);
    setAccountBlockedNotice(null);

    const isExplicitlySaved = explicitlySavedIds.has(currentItemId);
    setIsSaved(Boolean(isUserBookmarked || isExplicitlySaved));
  }, [currentItemId, initialPhotos, isUserBookmarked, explicitlySavedIds]);

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
    const hitTitleLower = ((item?.title || item?.name || item?.productName || "") as string).toLowerCase();

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
    () => detectFragranceAttributes(title, condition, item?.defectNotes || []),
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
    if (!item || !currentItemId) return;
    if (prevFragranceItemIdRef.current === currentItemId) {
      // Intentionally preserve user adjustments to tag cost and postage overrides on intra-item re-renders
      return;
    }
    prevFragranceItemIdRef.current = currentItemId;

    setIsFragranceActive(isLiquidOrFragrance);
    const attrs = detectFragranceAttributes(title, condition, item?.defectNotes || []);
    setFillLevel(attrs.fillLevelPercent);
    setHasCap(attrs.hasCap);
    setIsTester(attrs.isTester);
    setHasBox(attrs.hasBox);
    // Reset postage override for each new scan
    setCustomPostageTier(null);
    const newCost = Number(item.tagPrice || item.estCost) || categoryEstimate.typicalOpShopCost;
    setCustomTagCost(newCost);
  }, [currentItemId, item, title, category, condition, isLiquidOrFragrance, categoryEstimate.typicalOpShopCost]);

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
    item?.has_brand_or_model ??
    (brand &&
     brand.toLowerCase() !== "unbranded" &&
     brand.toLowerCase() !== "generic" &&
     brand.toLowerCase() !== "unknown" &&
     brand.trim().length > 1)
  );

  // Extract raw comps and ensure 3 to 5 verified recent sold listings
  const rawComps: RawSoldComp[] = useMemo(() => {
    if (!item) return [];
    const directComps = item.rawComps || item.comps || (item as any).raw_sold_comps || (item as any).rawSoldComps || [];
    const verified = ensureVerifiedSoldComps(
      directComps,
      title,
      initialEstValue,
      condition,
      brand
    );
    if (verified.length > 0 && currentItemId) {
      soldCompsCacheRef.current.set(currentItemId, verified);
      return verified;
    }
    if (currentItemId && soldCompsCacheRef.current.has(currentItemId)) {
      return soldCompsCacheRef.current.get(currentItemId)!;
    }
    return verified;
  }, [currentItemId, item?.rawComps, item?.comps, (item as any)?.raw_sold_comps, (item as any)?.rawSoldComps, title, initialEstValue, condition, brand]);

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

  // Hold initial valuation rendering with skeleton while comps and profit waterfall are resolving
  const isResolvingValuation = useMemo(() => {
    if (!item) return false;
    if (compsResolutionTimedOut) {
      return false;
    }
    if (currentItemId && resolvedItemIdsRef.current.has(currentItemId)) {
      return false;
    }
    if (effectiveComps.length > 0) {
      if (currentItemId) resolvedItemIdsRef.current.add(currentItemId);
      return false;
    }

    const itemStatus = item?.status;
    const isPendingStatus = itemStatus === "fetching_comps" || itemStatus === "analyzing" || itemStatus === "pending";
    const isCompsPending = Boolean(item?.is_comps_pending || item?.isCompsPending);

    // If neither status is pending, comps resolution is complete
    if (!isPendingStatus && !isCompsPending) {
      if (currentItemId) resolvedItemIdsRef.current.add(currentItemId);
      return false;
    }

    return isPendingStatus || isCompsPending;
  }, [
    currentItemId,
    effectiveComps.length,
    compsResolutionTimedOut,
    item?.status,
    item?.is_comps_pending,
    item?.isCompsPending,
    item?.noMarketData,
    item?.isActiveAskOnly,
    item?.compsSource,
    item?.estimatedValue,
  ]);

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
  }, [currentItemId, initialEstValue, effectiveComps, title, isLiquidOrFragrance, isFragranceActive, fragranceMultiplier]);

  const isUsMarket = Boolean(
    currency === "USD" ||
    (item as any)?.currency === "USD" ||
    (item as any)?.isUsMarketOnly ||
    effectiveComps.some((c) => (c as any).isUsComp) ||
    (typeof window !== "undefined" && isUSGeo()) ||
    (typeof window !== "undefined" && localStorage.getItem("spadas_selected_currency") === "USD")
  );
  const isUkMarket = Boolean(
    !isUsMarket && (
      currency === "GBP" ||
      (item as any)?.currency === "GBP" ||
      (typeof window !== "undefined" && isUKGeo()) ||
      (typeof window !== "undefined" && localStorage.getItem("spadas_selected_currency") === "GBP")
    )
  );
  const parcelRates = isUkMarket ? ROYAL_MAIL_PARCEL_RATES : isUsMarket ? USPS_PARCEL_RATES : AUSPOST_PARCEL_RATES;
  const targetCurrency = isUkMarket ? "GBP" : isUsMarket ? "USD" : "AUD";

  const compsEvidence: CompsEvidence = useMemo(() => {
    return evaluateCompsEvidence({
      rawComps: effectiveComps,
      compsSource: (item as any)?.compsSource,
      isCachedFallback: Boolean((item as any)?.isCachedFallback),
      targetTitle: title,
      brand,
      condition,
      category,
      currency: targetCurrency,
      isUsMarket,
      fallbackPrice: initialEstValue,
    });
  }, [effectiveComps, item, title, brand, condition, category, targetCurrency, isUsMarket, initialEstValue]);

  const stableSearchQuery = useMemo(() => {
    return [brand, title].filter(Boolean).join(" ").trim().toLowerCase();
  }, [brand, title]);

  const activeCacheKey = `${currentItemId || ""}_${targetCurrency}_${stableSearchQuery}`;

  useEffect(() => {
    if (!isOpen || !currentItemId || !title.trim()) {
      setIsLoadingActiveComps(false);
      return;
    }

    const isNewItem = prevActiveItemIdRef.current !== currentItemId;
    prevActiveItemIdRef.current = currentItemId;

    // SWR Cache retention: check cache first (keepPreviousData)
    const cachedListings = activeCompsCacheRef.current.get(activeCacheKey);
    if (cachedListings && cachedListings.length > 0) {
      setLiveActiveComps(cachedListings);
      setIsLoadingActiveComps(false);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ q: [brand, title].filter(Boolean).join(" "), currency: targetCurrency });

    // Only display loading skeletons if we don't already have live comps (keepPreviousData)
    if (isNewItem) {
      setLiveActiveComps([]);
      setIsLoadingActiveComps(true);
    } else if (liveActiveComps.length === 0) {
      setIsLoadingActiveComps(true);
    }
    setActiveCompsError(null);

    // Fail-safe 6s client timeout so live comps never get stuck in loading skeleton
    const timeoutId = setTimeout(() => {
      controller.abort();
      setIsLoadingActiveComps(false);
      setActiveCompsError("Live eBay active listings timed out.");
    }, 6000);

    void fetch(`/api/ebay-active-listings?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        clearTimeout(timeoutId);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Live listings lookup failed.");
        const listings = Array.isArray(data.listings) ? data.listings : [];
        const verified = listings
          .filter((listing: RawSoldComp) => listing && Number(listing.price) > 0)
          .map((listing: RawSoldComp) => ({
            ...listing,
            isActiveAsk: true,
            soldDate: "Active Ask",
          }));
        activeCompsCacheRef.current.set(activeCacheKey, verified);
        setLiveActiveComps(verified);
      })
      .catch((error: unknown) => {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") return;
        // Keep existing active comps on transient error
        setActiveCompsError(error instanceof Error ? error.message : "Live listings lookup failed.");
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setIsLoadingActiveComps(false);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
      setIsLoadingActiveComps(false);
    };
  }, [isOpen, currentItemId, activeCacheKey, targetCurrency]);

  // ── Active Asks vs Sold Comps Splits & Realistic Resale Price Engine ───────
  const activeCompsList = liveActiveComps;

  const soldCompsList: RawSoldComp[] = useMemo(() => {
    const sold = effectiveComps.filter((c) => c.soldDate !== "Active Ask" && !(c as any).isActiveAsk && !(c as any).is_active_ask);
    return sold;
  }, [effectiveComps]);

  const activePrices = activeCompsList.map((comp) => comp.price).filter((price) => price > 0).sort((a, b) => a - b);
  const rawActiveMedian = activePrices.length
    ? activePrices.length % 2
      ? activePrices[Math.floor(activePrices.length / 2)]
      : (activePrices[activePrices.length / 2 - 1] + activePrices[activePrices.length / 2]) / 2
    : 0;
  const soldPrices = soldCompsList.map((comp) => comp.price).filter((price) => price > 0).sort((a, b) => a - b);
  const rawSoldMedian = soldPrices.length
    ? soldPrices.length % 2
      ? soldPrices[Math.floor(soldPrices.length / 2)]
      : (soldPrices[soldPrices.length / 2 - 1] + soldPrices[soldPrices.length / 2]) / 2
    : 0;
  const activeCompCount = activeCompsList.length;
  const soldCompCount = soldCompsList.length;

  const displaySoldMedian = rawSoldMedian;
  const displayActiveMedian = rawActiveMedian;
  const displayActiveCount = activeCompCount;
  const displaySoldCount = soldCompCount;

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
    return Math.max(5, Math.round(initialEstValue * 0.95 * 100) / 100);
  }, [item, rawSoldMedian, rawActiveMedian, initialEstValue]);

  const displayQuickSell = recommendedQuickSellPrice > 0 ? recommendedQuickSellPrice : Math.round(initialEstValue * 0.95);

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
      platformFeeRate: isUkMarket ? EBAY_UK_FEE_RATE : isUsMarket ? EBAY_US_FEE_RATE : EBAY_AU_FEE_RATE,
      fixedFee: isUkMarket ? EBAY_UK_FIXED_FEE : isUsMarket ? EBAY_US_FIXED_FEE : EBAY_AU_FIXED_FEE,
      confidenceScore,
      needsVerification: requiresSecondaryVerification,
    });
  }, [activeResalePrice, effectiveTagCost, category, title, brand, estShipping, isUsMarket, isUkMarket, confidenceScore, requiresSecondaryVerification]);

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

  const ebayDomain = isUkMarket ? "ebay.co.uk" : isUsMarket ? "ebay.com" : "ebay.com.au";
  const cleanSearchQuery = encodeURIComponent(title.replace(/[^\w\s-]/g, "").trim());
  const ebayActiveSearchUrl = `https://www.${ebayDomain}/sch/i.html?_nkw=${cleanSearchQuery}`;

  // ── Advanced Analytics Calculations ──────────────────────────────────────
  const marketplaceArbitrage = useMemo(() => {
    const ebayGross = activeResalePrice;
    const feeRate = isUkMarket ? EBAY_UK_FEE_RATE : isUsMarket ? EBAY_US_FEE_RATE : EBAY_AU_FEE_RATE;
    const fixedFee = isUkMarket ? EBAY_UK_FIXED_FEE : isUsMarket ? EBAY_US_FIXED_FEE : EBAY_AU_FIXED_FEE;
    const ebayFees = Math.round((ebayGross * feeRate + fixedFee) * 100) / 100;
    const ebayNet = Math.max(0, Math.round((ebayGross - effectiveTagCost - ebayFees - estShipping) * 100) / 100);

    const secondMarketGross = Math.round(activeResalePrice * 0.96);
    const secondMarketFeeRate = isUkMarket ? 0.0 : 0.10;
    const secondMarketFees = Math.round(secondMarketGross * secondMarketFeeRate * 100) / 100;
    const secondMarketNet = Math.max(0, Math.round((secondMarketGross - effectiveTagCost - secondMarketFees - estShipping) * 100) / 100);

    const gumtreeGross = Math.round(activeResalePrice * 0.90);
    const gumtreeNet = Math.max(0, Math.round((gumtreeGross - effectiveTagCost) * 100) / 100);

    const fbGross = Math.round(activeResalePrice * 0.88);
    const fbNet = Math.max(0, Math.round((fbGross - effectiveTagCost) * 100) / 100);

    const channels = isUkMarket
      ? [
          { name: "eBay UK", gross: ebayGross, fees: ebayFees, net: ebayNet, code: "EBAY" },
          { name: "Vinted UK", gross: secondMarketGross, fees: 0, net: secondMarketNet, code: "VINTED" },
          { name: "Depop UK", gross: secondMarketGross, fees: Math.round(secondMarketGross * 0.10 * 100) / 100, net: Math.max(0, Math.round((secondMarketGross - effectiveTagCost - (secondMarketGross * 0.10) - estShipping) * 100) / 100), code: "DEPOP" },
          { name: "FB Marketplace", gross: fbGross, fees: 0, net: fbNet, code: "FB" },
        ]
      : isUsMarket
      ? [
          { name: "eBay US", gross: ebayGross, fees: ebayFees, net: ebayNet, code: "EBAY" },
          { name: "Poshmark", gross: secondMarketGross, fees: Math.round(secondMarketGross * 0.20 * 100) / 100, net: Math.max(0, Math.round((secondMarketGross - effectiveTagCost - (secondMarketGross * 0.20)) * 100) / 100), code: "POSH" },
          { name: "Mercari US", gross: gumtreeGross, fees: Math.round(gumtreeGross * 0.10 * 100) / 100, net: Math.max(0, Math.round((gumtreeGross - effectiveTagCost - (gumtreeGross * 0.10)) * 100) / 100), code: "MERCARI" },
          { name: "FB Marketplace", gross: fbGross, fees: 0, net: fbNet, code: "FB" },
        ]
      : [
          { name: "eBay AU", gross: ebayGross, fees: ebayFees, net: ebayNet, code: "EBAY" },
          { name: "Depop AU", gross: secondMarketGross, fees: secondMarketFees, net: secondMarketNet, code: "DEPOP" },
          { name: "Gumtree AU", gross: gumtreeGross, fees: 0, net: gumtreeNet, code: "GUMTREE" },
          { name: "FB Marketplace", gross: fbGross, fees: 0, net: fbNet, code: "FB" },
        ];
    channels.sort((a, b) => b.net - a.net);
    return { channels, bestChannel: channels[0] };
  }, [activeResalePrice, effectiveTagCost, estShipping, isUkMarket, isUsMarket]);

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

  // Telemetry event + subtle tactile feedback on modal reveal
  useEffect(() => {
    if (isOpen && item) {
      triggerTactileHaptic("light");
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
      const safeBrandForSave = cleanBrandText(brand, "Unbranded") || "Unbranded";
      const cleanSubject = buildCleanListingSubject(safeBrandForSave, title);
      const cleanSaveDesc = buildCleanListingDescription({
        title,
        brand: safeBrandForSave,
        category,
        condition,
        price: activeResalePrice,
        currency: targetCurrency,
        extraNotes: isLiquidOrFragrance && isFragranceActive
          ? `${fillLevel}% Fill, ${hasCap ? "With Cap" : "No Cap"}${isTester ? ", Tester" : ""}`
          : undefined,
      });

      const { error } = await createListing({
        userId: user.id,
        product: cleanSubject,
        description: cleanSaveDesc,
        price: activeResalePrice,
        cost: effectiveTagCost,
        status: "Draft",
        image: primaryImage,
      });

      if (error) throw error;

      const currentItemId = (item as any)?.id ? String((item as any).id) : null;
      if (currentItemId) {
        setExplicitlySavedIds((prev) => new Set(prev).add(currentItemId));
      }
      setIsSaved(true);
      triggerTactileHaptic("success");
      syncProfitToAndroidWidget(netProfit, 1);
      toast.success(`Saved "${cleanSubject.slice(0, 24)}..." (+$${netProfit} Net Profit)!`);

      if (onSaveDraftSuccess && item) {
        onSaveDraftSuccess(item);
      }

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

  const handleOpenEbayEditor = () => {
    if (!onListEbay || !item) return;
    const primaryBlob =
      listingPhotos[0]?.trim() || previewImageSrc?.trim() || (item as any)?.image?.trim() || undefined;
    const safeBrand = cleanBrandText(brand, "Unbranded") || "Unbranded";
    const safeCond = cleanConditionText(condition, "Used - Good");
    const stableSessionId =
      (item as any)?.sessionId || (item as any)?.id || `session_${(item as any)?.timestamp || Date.now()}`;
    const enrichedItem = {
      ...item,
      productName: title,
      name: title,
      brand: safeBrand,
      category,
      condition: safeCond,
      estimatedValue: activeResalePrice,
      price: activeResalePrice,
      currency: targetCurrency,
      image: primaryBlob,
      imageUrls: listingPhotos.length > 0 ? listingPhotos : primaryBlob ? [primaryBlob] : undefined,
      sessionId: stableSessionId,
    };
    onListEbay(enrichedItem as any);
  };

  // Strict 1-Tap Live Publish to eBay AU:
  // Mirrors exact payload verification and live syncing from EbayListingModal
  const handle1TapPublishEbay = async () => {
    if (isPublishingEbay) return;

    // 1. Strict Primary Photo Verification:
    const primaryBlob =
      listingPhotos[0]?.trim() || previewImageSrc?.trim() || (item as any)?.image?.trim() || null;

    if (!primaryBlob || primaryBlob.includes("unsplash.com") || primaryBlob.includes("placeholder")) {
      toast.warning("No active scan capture photo found. Please capture or attach a photo before syncing to eBay AU.", {
        id: "empty-primary-photo-warning",
      });
      return;
    }

    // Filter secondary gallery photos (guaranteeing no duplicates of primaryBlob)
    const validGallery = listingPhotos.filter(
      (img) => typeof img === "string" && img.trim().length > 0 && img.trim() !== primaryBlob
    );

    // Final payload array: Index [0] is GUARANTEED to be the active scan capture photo
    const submissionImageUrls = [primaryBlob, ...validGallery];

    const safeBrand = cleanBrandText(brand, "Unbranded") || "Unbranded";
    const safeCond = cleanConditionText(condition, "Used - Good");
    const stableSessionId =
      (item as any)?.sessionId || (item as any)?.id || `session_${(item as any)?.timestamp || Date.now()}`;
    const targetRegionLabel = isUkMarket ? "eBay UK" : isUsMarket ? "eBay US" : "eBay AU";
    const targetDomain = isUkMarket ? "ebay.co.uk" : isUsMarket ? "ebay.com" : "ebay.com.au";

    const cleanSubject = buildCleanListingSubject(safeBrand, title);
    const itemDescription = buildCleanListingDescription({
      title,
      brand: safeBrand,
      category,
      condition: safeCond,
      price: Number(activeResalePrice),
      currency: targetCurrency,
    });

    const payload = {
      product: cleanSubject.slice(0, 80),
      brand: safeBrand,
      price: Number(activeResalePrice),
      currency: targetCurrency,
      condition: safeCond,
      category,
      description: itemDescription,
      imageUrls: submissionImageUrls,
      sessionId: stableSessionId,
      publishMode: "live", // Force active publish action rather than draft-save
      forceLive: true,
    };

    setIsPublishingEbay(true);
    setAccountBlockedNotice(null);
    try {
      triggerTactileHaptic("medium");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/marketplaces/ebay/publish", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      // Photo upload to Supabase Storage failed before eBay was even called
      if (data.image_upload_failed) {
        throw new Error(
          data.error ||
            "Photo upload to Supabase Storage failed. Make sure the 'listing-images' bucket exists and is public in your Supabase project."
        );
      }

      const errText = String(data.error || data.message || "");

      // Catch eBay selling restrictions or account blocks
      if (data.accountRestricted || isEbayAccountRestrictedError(data, errText)) {
        setAccountBlockedNotice(EBAY_RESTRICTION_NOTICE);
        toast.error("Listing Blocked: Your eBay account currently has selling restrictions. Please check eBay Seller Hub.", {
          duration: 7000,
        });
        return;
      }

      // If user is not authenticated or needs to connect eBay account:
      const needsConnection =
        res.status === 401 || (res.status === 400 && /connect|ebay seller account|token|reconnect/i.test(errText));

      if (needsConnection) {
        if (onListEbay) {
          toast.info(`Please link your ${targetRegionLabel} account to publish live. Opening listing manager...`, {
            duration: 4000,
          });
          handleOpenEbayEditor();
          return;
        } else {
          const prefillUrl = generateEbayPrefillUrl({
            title,
            priceAud: Number(activeResalePrice),
            brand: safeBrand,
            currency: targetCurrency,
          });
          openExternalUrlSafely(prefillUrl, title);
          toast.info(`Opened ${targetRegionLabel} Sell wizard with prefilled details.`, { duration: 5000 });
          return;
        }
      }

      // Force Live Sync: Ensure submission targets active publish action
      if (!res.ok || !data.success || !data.isLive) {
        throw new Error(errText || `Failed to publish live listing to ${targetRegionLabel}.`);
      }

      if (data.success && data.isLive) {
        const liveUrl = data.listingUrl || `https://www.${targetDomain}/sh/lst/active`;
        setLiveEbayListingUrl(liveUrl);
        setPublishedSku(data.sku || null);
        setIsLiveListing(true);
        setEbayPublishSuccess(true);
        triggerTactileHaptic("success");

        // Also save to Spadas AI local listings with status "Active"
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            await createListing({
              userId: user.id,
              product: title,
              price: Number(activeResalePrice),
              cost: effectiveTagCost,
              description: itemDescription,
              status: "Active",
              image: primaryBlob,
            });
          }
        } catch (syncErr) {
          console.warn("Local inventory sync error after live eBay publish:", syncErr);
        }

        toast.success(`🚀 Live on ${targetRegionLabel}! Listing published successfully with verified scan photo.`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Publish request failed";
      console.error("1-Tap eBay Publish error:", err);
      toast.error(message);
    } finally {
      setIsPublishingEbay(false);
    }
  };

  const previewImageSrc = frozenFrameUrl || (item as any)?.image || null;

  const isZeroSoldActive =
    Boolean((item as any)?.isActiveAskOnly) ||
    (item as any)?.compsSource === "browse_api" ||
    (item as any)?.compsSource === "active_listings" ||
    (liveActiveComps.length > 0 && soldCompsList.length === 0) ||
    (effectiveComps.length > 0 && effectiveComps.every((c) => c.soldDate === "Active Ask" || (c as any).isActiveAsk || (c as any).is_active_ask));

  const activeCount = liveActiveComps.length;

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

  const valuationState = useMemo(() => {
    if (isResolvingValuation) {
      return {
        label: "Comps Pending",
        detail: "Item identified. Pulling marketplace sold evidence now.",
        className: "bg-cyan-500/10 border-cyan-500/30 text-cyan-300",
      };
    }

    if (requiresSecondaryVerification) {
      return {
        label: "Verify First",
        detail: (item as any)?.verificationReason || "A secondary angle, tag, barcode, or detail check is recommended before trusting this result.",
        className: "bg-amber-500/10 border-amber-500/30 text-amber-300",
      };
    }

    if (Boolean((item as any)?.noMarketData)) {
      return {
        label: "No Market Data",
        detail: "No solid sold evidence was found for this item. Treat the price as guidance, not a verified resale market.",
        className: "bg-zinc-800 border-zinc-700 text-zinc-300",
      };
    }

    if (isZeroSoldActive) {
      return {
        label: "Active Asks Only",
        detail: "This view is grounded by current asking prices, not completed sold listings.",
        className: "bg-violet-500/10 border-violet-500/30 text-violet-300",
      };
    }

    return {
      label: "Verified Sold Comps",
      detail: "This valuation is grounded by recent sold listings after cleanup and outlier trimming.",
      className: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
    };
  }, [isResolvingValuation, requiresSecondaryVerification, item, isZeroSoldActive]);

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
        <span className="text-zinc-200 font-bold tabular-nums">~{irr}%/yr</span>
      </div>
    );
  }, [seasonalityProfile.annualizedIrrQuickFlip]);

  if (!isOpen || !item) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 select-none"
      style={{ transform: "translate3d(0,0,0)", willChange: "transform" }}
      onClick={(e) => {
        // Modal must stay open until explicit dismissal
      }}
    >
      <div
        className="relative w-full max-w-md max-h-[92dvh] sm:max-h-[88vh] flex flex-col rounded-t-xl sm:rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 overflow-hidden pt-[max(12px,env(safe-area-inset-top))] sm:pt-0"
        style={{ transform: "translate3d(0,0,0)", willChange: "transform" }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="mx-auto mt-2 h-1 w-8 rounded-full bg-zinc-800 sm:hidden shrink-0" />

        {/* ── Top Header / Item Identifier ──────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2.5 min-w-0">
            {previewImageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewImageSrc}
                alt={title}
                className="h-8 w-8 rounded-md object-cover border border-zinc-800 shrink-0 bg-zinc-900"
              />
            ) : (
              <div className="h-8 w-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                <ShoppingBag className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-zinc-100 truncate max-w-[220px] sm:max-w-xs">
                {title}
              </h2>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-900 text-zinc-300 border border-zinc-800">
                  {isUkMarket ? "UK comps" : isUsMarket ? "US comps" : "AU comps"}
                </span>
                {hasBrandOrModel ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-900 text-zinc-300 border border-zinc-800">
                    {brand}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800">
                    Unbranded
                  </span>
                )}
                {isMeaningfulMeta(category) && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800">
                    {category}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose || onResumeScan}
            className="h-11 w-11 flex items-center justify-center text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-zinc-800 transition cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable Body Content (Valuation First Mode) ────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y divide-y divide-zinc-800 custom-scrollbar">
          {/* ── 1. Valuation Evidence & Provenance Card ────────────────── */}
          <div className="p-4 space-y-3 bg-zinc-950">
            {/* eBay Account Restriction Warning Banner */}
            {accountBlockedNotice && (
              <div className="p-3.5 rounded-lg border border-rose-500/50 bg-rose-950/40 text-xs text-rose-200 flex flex-col gap-2">
                <div className="flex items-start gap-2 font-bold text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{accountBlockedNotice}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-zinc-400">Review selling restrictions &amp; verify account</span>
                  <a
                    href={`https://www.${isUsMarket ? "ebay.com" : "ebay.com.au"}/sh/ovw`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => openExternalUrlSafely(`https://www.${isUsMarket ? "ebay.com" : "ebay.com.au"}/sh/ovw`, "eBay Seller Hub", e)}
                    className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px] flex items-center gap-1 shrink-0"
                  >
                    <span>Open Seller Hub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-3">
              {isResolvingValuation ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs text-cyan-300 font-medium block">
                        Locking live sold comps…
                      </span>
                      <div className="mt-2 h-9 w-32 rounded bg-zinc-800 animate-pulse" />
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                        Verifying
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 leading-snug">
                    We identified the item. Final price evidence is loading from marketplace sold listings now.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs text-zinc-400 font-medium block">
                        {compsEvidence.valuationTitle}
                      </span>
                      <div className="text-3xl font-black text-white font-mono tracking-tight mt-0.5 tabular-nums">
                        {compsEvidence.formattedValue}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 border border-zinc-700 text-zinc-200">
                        {compsEvidence.sourceBadge}
                      </span>
                      <span className="block text-[10px] text-zinc-500 font-mono mt-0.5">
                        {compsEvidence.currency}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 leading-snug">
                    {compsEvidence.evidenceSubtitle}
                  </p>

                  <div className={`rounded-lg border px-3 py-2 text-xs ${valuationState.className}`}>
                    <div className="font-semibold">{valuationState.label}</div>
                    <div className="mt-1 text-[11px] leading-relaxed text-zinc-300">{valuationState.detail}</div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">Sold evidence</div>
                      <div className="mt-1 text-sm font-semibold text-white tabular-nums">{displaySoldCount}</div>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">Active asks</div>
                      <div className="mt-1 text-sm font-semibold text-white tabular-nums">{displayActiveCount}</div>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">Confidence</div>
                      <div className="mt-1 text-sm font-semibold text-white tabular-nums">{Math.round(confidenceScore * 100)}%</div>
                    </div>
                  </div>
                </>
              )}

              {/* Evidence Provenance Table */}
              <div className="pt-2.5 border-t border-zinc-800/80 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-zinc-400">
                  <span>Typical range</span>
                  <span className="text-zinc-100 font-medium">{compsEvidence.typicalRangeFormatted}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Sold median</span>
                  <span className="text-zinc-100 font-medium">{compsEvidence.soldMedianFormatted}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Market</span>
                  <span className="text-zinc-100 font-medium">{compsEvidence.marketName}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Condition match</span>
                  <span className="text-zinc-100 font-medium">{compsEvidence.conditionMatch}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Evidence window</span>
                  <span className="text-zinc-100 font-medium">{compsEvidence.evidenceWindowText}</span>
                </div>
              </div>

              {/* Evidence Action Buttons */}
              <div className="flex items-center gap-2 pt-2.5 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setCompsMarketTab("sold");
                    setShowAllComps(true);
                    const el = document.getElementById("market-evidence-section");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="flex-1 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium text-zinc-100 text-center transition cursor-pointer"
                >
                  Review sold evidence ({compsEvidence.cleanListings.length})
                </button>
                <button
                  type="button"
                  onClick={() => setShowMethodologyModal(!showMethodologyModal)}
                  className="py-2 px-3 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-zinc-200 text-center transition cursor-pointer"
                >
                  How this estimate is calculated
                </button>
              </div>

              {/* Methodology Explanation Drawer */}
              {showMethodologyModal && (
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs space-y-2 mt-2">
                  <div className="flex items-center justify-between font-bold text-zinc-200">
                    <span>Valuation Methodology</span>
                    <button
                      type="button"
                      onClick={() => setShowMethodologyModal(false)}
                      className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-zinc-300 leading-relaxed font-sans text-[11px]">
                    {compsEvidence.methodologySummary}
                  </p>
                  <div className="pt-2 border-t border-zinc-800 text-[10px] font-mono text-zinc-400 grid grid-cols-2 gap-1.5">
                    <div>Raw comps: {compsEvidence.methodologyDetails.rawCount}</div>
                    <div>Usable comps: {compsEvidence.methodologyDetails.cleanedCount}</div>
                    <div>Outliers trimmed: {compsEvidence.methodologyDetails.outliersTrimmed}</div>
                    <div>Bulk lots excluded: {compsEvidence.methodologyDetails.lotsExcluded}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── 2. Market Evidence Listings ─────────────────────────────────── */}
          <div id="market-evidence-section" className="p-4 space-y-3 bg-zinc-950">
            <div className="flex items-center justify-between gap-2">
              {/* Segmented Controller: Verified Sold Comps vs Live Active Asks */}
              <div className="flex items-center rounded-lg bg-zinc-900 border border-zinc-800 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setCompsMarketTab("sold")}
                  className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                    compsMarketTab === "sold"
                      ? "bg-zinc-800 text-white font-bold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Sold listings ({soldCompCount})
                </button>
                <button
                  type="button"
                  onClick={() => setCompsMarketTab("active")}
                  className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                    compsMarketTab === "active"
                      ? "bg-zinc-800 text-white font-bold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Active asking prices ({activeCompCount > 0 ? activeCompCount : isLoadingActiveComps ? "…" : 0})
                </button>
              </div>

              {/* View Mode Toggle: List vs Carousel */}
              <div className="flex items-center rounded-lg bg-zinc-900 border border-zinc-800 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setCompsViewMode("list")}
                  className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                    compsViewMode === "list"
                      ? "bg-zinc-800 text-white font-bold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setCompsViewMode("carousel")}
                  className={`px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                    compsViewMode === "carousel"
                      ? "bg-zinc-800 text-white font-bold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Carousel
                </button>
              </div>
            </div>

            {/* Display comps list or empty state */}
            {(() => {
              const currentList = compsMarketTab === "sold" ? soldCompsList : activeCompsList;
              const displayComps = showAllComps ? currentList : currentList.slice(0, 3);
              const remaining = Math.max(0, currentList.length - 3);

              if (currentList.length === 0) {
                const isTabResolving =
                  compsMarketTab === "sold"
                    ? isResolvingValuation && soldCompsList.length === 0
                    : isLoadingActiveComps && activeCompsList.length === 0;

                if (isTabResolving) {
                  return (
                    <div className="space-y-2">
                      {[0, 1, 2].map((idx) => (
                        <div
                          key={idx}
                          className="min-h-[64px] p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3 animate-pulse"
                        >
                          <div className="h-12 w-12 rounded-md bg-zinc-800 shrink-0" />
                          <div className="flex-1 space-y-1.5 min-w-0">
                            <div className="h-4 w-20 bg-zinc-800 rounded" />
                            <div className="h-3 w-36 bg-zinc-800/60 rounded" />
                          </div>
                          <div className="h-3 w-12 bg-zinc-800/40 rounded shrink-0" />
                        </div>
                      ))}
                    </div>
                  );
                }

                return (
                  <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 text-center space-y-1.5">
                    <div className="text-sm font-semibold text-zinc-200">
                      {compsMarketTab === "active" && activeCompsError
                        ? "Live eBay listings unavailable"
                        : `No ${compsMarketTab === "sold" ? "verified sold" : "live active"} listings found`}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {compsMarketTab === "active" && activeCompsError
                        ? activeCompsError
                        : compsMarketTab === "active"
                          ? "No current eBay listings matched this item. Sold comps remain separate."
                          : "No verified completed sales were returned for this item on eBay."}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => openExternalUrlSafely(ebayActiveSearchUrl, title, e)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 hover:bg-zinc-700 cursor-pointer font-medium transition mt-1"
                    >
                      <span>Search {isUkMarket ? "eBay UK" : isUsMarket ? "eBay US" : "eBay Australia"} listings</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                );
              }

              return (
                <>
                  {compsViewMode === "list" ? (
                    <div className="space-y-2">
                      {displayComps.map((comp, idx) => {
                        const isCompActiveAsk = comp.soldDate === "Active Ask" || compsMarketTab === "active";
                        const compImg = comp.thumbnail || (idx === 0 ? previewImageSrc : null);
                        const conditionText = comp.condition ? cleanConditionText(comp.condition) : "Pre-Owned";

                        return (
                          <div
                            key={comp.id || idx}
                            className="min-h-[64px] p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3"
                          >
                            <div className="h-12 w-12 rounded-md bg-zinc-950 border border-zinc-800 shrink-0 overflow-hidden">
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
                                <span className="text-sm font-bold text-white tabular-nums font-mono">
                                  {fmtMoney(comp.price)}
                                </span>
                                <span className="text-[10px] text-zinc-400">
                                  · {conditionText}
                                </span>
                              </div>
                              <div className="text-xs text-zinc-400 truncate mt-0.5">
                                {comp.title}
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-2">
                              <span className="text-xs tabular-nums text-zinc-400">
                                {isCompActiveAsk ? "Active ask" : comp.soldDate || "Sold"}
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
                  ) : (
                    <div className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory py-1 custom-scrollbar min-h-[210px]">
                      {displayComps.map((comp, idx) => {
                        const isCompActiveAsk = comp.soldDate === "Active Ask" || compsMarketTab === "active";
                        const compImg = comp.thumbnail || (idx === 0 ? previewImageSrc : null);
                        const conditionText = comp.condition ? cleanConditionText(comp.condition) : "Pre-Owned";

                        return (
                          <div
                            key={comp.id || idx}
                            className="w-44 sm:w-48 shrink-0 snap-start bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden p-2.5 flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              <div className="relative h-28 w-full rounded-md overflow-hidden bg-zinc-950 border border-zinc-800/80">
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
                                <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-medium text-zinc-300 tabular-nums">
                                  {isCompActiveAsk ? "Active Ask" : comp.soldDate && comp.soldDate !== "Active Ask" ? comp.soldDate : "Recent"}
                                </span>
                              </div>

                              <div>
                                <div className="text-base font-bold text-white tabular-nums font-mono">
                                  {fmtMoney(comp.price)}
                                </div>
                                <div className="text-[11px] text-zinc-300 font-medium truncate mt-0.5">
                                  {conditionText}
                                </div>
                                <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                                  {comp.title}
                                </div>
                              </div>
                            </div>

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
                  )}

                  {remaining > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAllComps(!showAllComps)}
                      className="w-full py-2 rounded-lg border border-zinc-800 bg-zinc-900 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>{showAllComps ? "Show top 3 comps only" : `Show all ${currentList.length} comps`}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllComps ? "rotate-180" : ""}`} />
                    </button>
                  )}
                </>
              );
            })()}
          </div>

          {/* ── 3. Net Profit & Pricing ────────────────────────────────────── */}
          <div className="p-4 space-y-3 bg-zinc-950">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">Net Profit & Fees</span>
              <span className={`text-xs font-mono font-bold tabular-nums ${netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {netProfit >= 0 ? `+${formatAUD(netProfit)} net` : `${formatAUD(netProfit)} net`}
                {effectiveTagCost > 0 && ` (${Math.round(roi)}% ROI)`}
              </span>
            </div>

            {/* Target Price & 3 Liquidity Presets */}
            <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-300">Listing Price Target</span>
                <div className="flex items-center gap-1">
                  <span className="text-zinc-500 font-mono">$</span>
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
                    className="w-20 rounded-md bg-zinc-950 border border-zinc-700 px-2 py-1 text-right text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 tabular-nums"
                  />
                  <span className="text-[10px] text-zinc-400 font-mono">{targetCurrency}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setCustomResalePrice(displayQuickSell);
                    triggerTactileHaptic("selection");
                  }}
                  className={`h-10 flex flex-col items-center justify-center px-1.5 rounded-md text-center transition cursor-pointer border tabular-nums ${
                    activeResalePrice === displayQuickSell
                      ? "bg-zinc-800 text-emerald-300 border-zinc-600 font-semibold"
                      : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  <span className="text-[11px] font-medium">Fast-Flip (−5%)</span>
                  <span className="text-[9px] opacity-75 font-mono">{fmtMoney(displayQuickSell)}</span>
                </button>
                <button
                  type="button"
                  disabled={displaySoldCount === 0}
                  onClick={() => {
                    setCustomResalePrice(displaySoldMedian);
                    triggerTactileHaptic("selection");
                  }}
                  className={`h-10 flex flex-col items-center justify-center px-1.5 rounded-md text-center transition cursor-pointer border tabular-nums disabled:opacity-40 disabled:cursor-not-allowed ${
                    activeResalePrice === displaySoldMedian
                      ? "bg-zinc-800 text-emerald-300 border-zinc-600 font-semibold"
                      : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  <span className="text-[11px] font-medium">Median Sold</span>
                  <span className="text-[9px] opacity-75 font-mono">{displaySoldCount > 0 ? fmtMoney(displaySoldMedian) : "—"}</span>
                </button>
                <button
                  type="button"
                  disabled={displayActiveCount === 0}
                  onClick={() => {
                    setCustomResalePrice(displayActiveMedian);
                    triggerTactileHaptic("selection");
                  }}
                  className={`h-10 flex flex-col items-center justify-center px-1.5 rounded-md text-center transition cursor-pointer border tabular-nums disabled:opacity-40 disabled:cursor-not-allowed ${
                    activeResalePrice === displayActiveMedian
                      ? "bg-zinc-800 text-zinc-100 border-zinc-600 font-semibold"
                      : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  <span className="text-[11px] font-medium">Active Asks</span>
                  <span className="text-[9px] opacity-75 font-mono">{displayActiveCount > 0 ? fmtMoney(displayActiveMedian) : "—"}</span>
                </button>
              </div>
            </div>

            {/* Waterfall Ledger Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center font-mono text-[11px]">
              <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">Gross Sale</span>
                <span className="text-zinc-100 font-bold tabular-nums">{fmtMoney(activeResalePrice)}</span>
              </div>
              <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">Cost of Goods</span>
                <span className="text-rose-400 font-bold tabular-nums">−{fmtMoney(effectiveTagCost)}</span>
              </div>
              <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">eBay Fees (~{isUkMarket ? "12.8%" : isUsMarket ? "13.25%" : "13.4%"})</span>
                <span className="text-rose-400 font-bold tabular-nums">−{fmtMoney(platformFee)}</span>
              </div>
              <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">Postage ({isUkMarket ? "Royal Mail" : isUsMarket ? "USPS" : "AusPost"})</span>
                <span className="text-rose-400 font-bold tabular-nums">−{fmtMoney(estShipping)}</span>
              </div>
            </div>

            {/* In-Store Tag Price Adjuster */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/80">
              <div className="flex items-center gap-1.5 shrink-0">
                <Tag className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-300">Thrift tag cost:</span>
                <div className="flex items-center gap-0.5 text-xs text-zinc-100 font-bold">
                  <span>$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={customTagCost || ""}
                    onChange={(e) => handleTagCostChange(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-14 rounded bg-zinc-900 border border-zinc-700 px-1.5 py-0.5 text-right text-xs text-zinc-100 font-bold focus:outline-none focus:border-zinc-500 tabular-nums"
                  />
                </div>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto py-0.5 custom-scrollbar">
                {[2, 5, 8, 10, 15, 20].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetTagCost(preset)}
                    className={`px-2 py-1 min-h-[30px] rounded text-[11px] font-semibold transition cursor-pointer tabular-nums ${
                      customTagCost === preset
                        ? "bg-zinc-800 text-zinc-100 border border-zinc-600 font-bold"
                        : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                    }`}
                  >
                    ${preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Regional Parcel Tier Override Picker */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/80">
              <div className="flex items-center gap-1.5 shrink-0">
                <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-xs font-medium text-zinc-300">Postage rate:</span>
                <span className="text-xs text-zinc-400 font-mono tabular-nums">${estShipping.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto py-0.5 custom-scrollbar">
                <button
                  type="button"
                  onClick={() => { startTransition(() => { setCustomPostageTier(null); }); triggerTactileHaptic("light"); }}
                  className={`px-2 py-1 min-h-[32px] rounded text-[11px] font-semibold transition cursor-pointer tabular-nums ${
                    customPostageTier === null
                      ? "bg-zinc-800 text-zinc-100 border border-zinc-600 font-bold"
                      : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
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
                    className={`px-2 py-1 min-h-[32px] rounded text-[11px] font-semibold transition cursor-pointer tabular-nums ${
                      customPostageTier === tier
                        ? "bg-zinc-800 text-zinc-100 border border-zinc-600 font-bold"
                        : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── 4. Multi-Photo Intake Tray (1 to 5 Photos) ─────────────────── */}
          <div className="p-4 space-y-2 bg-zinc-950">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-300">Listing photos ({listingPhotos.length}/5)</span>
              <span className="text-[11px] text-zinc-500 font-mono">1–5 angles for eBay sync</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto py-1 custom-scrollbar">
              {listingPhotos.map((photo, idx) => (
                <div
                  key={idx}
                  className="relative h-16 w-16 shrink-0 rounded-md overflow-hidden border border-zinc-800 bg-zinc-950 group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo}
                    alt={`Angle ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] font-medium text-center text-zinc-300 py-0.5 font-mono">
                    {idx === 0 ? "Cover" : `Angle ${idx + 1}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-0 right-0 h-7 w-7 rounded-bl-md bg-black/80 text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer touch-manipulation"
                    title="Remove photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {listingPhotos.length < 5 && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="h-16 w-16 shrink-0 rounded-md border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-[10px] font-medium">+ Photo</span>
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

          {/* ── 5. Advanced Market Analysis Accordion ────────────────────────── */}
          <div className="p-4 space-y-3">
            <button
              type="button"
              onClick={() => setIsAdvancedAnalyticsOpen(!isAdvancedAnalyticsOpen)}
              className="w-full py-2.5 px-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-xs font-medium text-zinc-300 transition flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                <span>Advanced Analysis (Recommendation, Arbitrage, Depth)</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                  isAdvancedAnalyticsOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isAdvancedAnalyticsOpen && (
              <div className="space-y-3 pt-1">
                {/* Algorithmic Margin & Turnover Verdict */}
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide border ${
                        copVerdict === "MUST_COP" || recommendation === "HIGH PROFIT"
                          ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/80"
                          : copVerdict === "PASS_RISKY" || recommendation === "PASS"
                          ? "bg-rose-950/60 text-rose-300 border-rose-800/80"
                          : "bg-zinc-900 text-zinc-200 border-zinc-800"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          copVerdict === "MUST_COP" || recommendation === "HIGH PROFIT"
                            ? "bg-emerald-400"
                            : copVerdict === "PASS_RISKY" || recommendation === "PASS"
                            ? "bg-rose-400"
                            : "bg-emerald-400"
                        }`}
                      />
                      <span>
                        {copVerdict === "MUST_COP" || recommendation === "HIGH PROFIT"
                          ? "BUY · HIGH MARGIN"
                          : copVerdict === "PASS_RISKY" || recommendation === "PASS"
                          ? "PASS · LOW MARGIN"
                          : "BUY · SOLID MARGIN"}
                      </span>
                    </span>
                    <span className="text-[11px] text-zinc-400 tabular-nums">
                      {salesVelocity.turnoverTier === "RAPID_FIRE" ? "~1–3 days turn" : `${salesVelocity.estDaysToSell} days turn`}
                    </span>
                  </div>
                    <span className="inline-flex items-center rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] font-medium text-zinc-300 tabular-nums">
                      {trustLineText}
                    </span>
                  </div>

                {/* 1. Multi-Platform Net Realization */}
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">Multi-Platform Net Take-Home</span>
                    <span className="text-[10px] text-emerald-500 font-bold">
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
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">Condition Multipliers</span>
                    <span className="text-[10px] text-zinc-300 tabular-nums font-bold">
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
                          className={`py-1 px-1.5 rounded-md text-[10px] transition cursor-pointer border text-center ${
                            isSelected
                              ? "bg-zinc-800 text-zinc-100 border-zinc-600 font-bold"
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
                    <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs mt-1">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="text-emerald-400 text-[11px]">
                          Restoration: +${conditionEvaluation.restorationOpportunity.netValueAddAud} Net
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsRestorationApplied(!isRestorationApplied)}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-600 text-white cursor-pointer"
                      >
                        {isRestorationApplied ? "Applied" : "+ Apply"}
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Turnover Velocity, Market Depth & Fixed Bounded IRR */}
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
                  <div className="text-xs font-semibold text-white">Turnover Velocity & Depth</div>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Est Days to Sell</span>
                      <span className="text-xs font-bold text-zinc-100">{salesVelocity.estDaysToSell}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Demand Score</span>
                      <span className="text-xs font-bold text-emerald-500 tabular-nums">{salesVelocity.demandScore}/100</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Sell-Through</span>
                      <span className="text-xs font-bold text-zinc-100 tabular-nums">{salesVelocity.sellThroughRate}% sold</span>
                    </div>
                  </div>

                  {/* Market Depth */}
                  <div className="grid grid-cols-3 gap-1.5 text-center pt-1">
                    <div className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-[9px] text-zinc-500 block">Auction Floor</span>
                      <span className="text-xs font-bold text-zinc-200 tabular-nums">{fmtMoney(spectralComps.liquidationFloor)}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-[9px] text-zinc-500 block">EMA Fair Value</span>
                      <span className="text-xs font-bold text-zinc-100 tabular-nums">{fmtMoney(spectralComps.emaFairMarketValue)}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className="text-[9px] text-zinc-500 block">Patient BIN</span>
                      <span className="text-xs font-bold text-emerald-500 tabular-nums">{fmtMoney(spectralComps.patientBinCeiling)}</span>
                    </div>
                  </div>

                  {/* Bounded IRR badge: Only displayed when realistic */}
                  {renderIrrBadge}
                </div>

                {/* 4. Forensic Inspection Checklist */}
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                    <span>In-Aisle Inspection Checklist</span>
                  </div>
                  <ul className="text-[11px] text-zinc-400 space-y-1 pl-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-zinc-500">•</span>
                      <span>Inspect for hairline cracks, chips, scuffs, or missing accessories.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-zinc-500">•</span>
                      <span>Check manufacturer hallmarks, labels, and serial numbers.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-zinc-500">•</span>
                      <span>Verify recent completed sold dates are within 14–30 days.</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 5. STICKY ACTIONS (Bottom, Equal Height 44px, Solid Fills, 8px Radius) ── */}
        <div className="shrink-0 p-3 border-t border-zinc-800 bg-zinc-950 z-20 pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] space-y-2">
          {ebayPublishSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-700/60 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    Live on {isUkMarket ? "eBay UK" : isUsMarket ? "eBay US" : "eBay AU"}!
                  </div>
                  {publishedSku && (
                    <div className="text-[10px] font-mono text-emerald-300/80 truncate">
                      SKU: {publishedSku}
                    </div>
                  )}
                </div>
              </div>
              {liveEbayListingUrl && (
                <a
                  href={liveEbayListingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => openExternalUrlSafely(liveEbayListingUrl, title, e)}
                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 shrink-0"
                >
                  <span>View Live</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={onResumeScan}
              className="h-11 flex items-center justify-center rounded-md bg-zinc-800 text-zinc-100 hover:bg-zinc-700 active:scale-[0.98] transition cursor-pointer border border-zinc-700 text-xs font-semibold"
            >
              Scan next
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving || isSaved}
              className="h-11 flex items-center justify-center rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white active:scale-[0.98] transition cursor-pointer text-xs font-medium disabled:opacity-50"
            >
              {isSaved ? "Saved" : isSaving ? "Saving..." : "Save draft"}
            </button>
            {liveEbayListingUrl && !isPublishingEbay && ebayPublishSuccess ? (
              <a
                href={liveEbayListingUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => openExternalUrlSafely(liveEbayListingUrl, title, e)}
                className="h-11 flex items-center justify-center gap-1.5 rounded-md text-xs font-semibold active:scale-[0.98] transition cursor-pointer text-white border bg-emerald-700 hover:bg-emerald-600 border-emerald-600"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>View on eBay</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={handle1TapPublishEbay}
                disabled={isPublishingEbay}
                className="h-11 flex items-center justify-center gap-1.5 rounded-md text-xs font-semibold active:scale-[0.98] transition cursor-pointer disabled:opacity-50 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 truncate px-1"
                title={`Publish Live to ${isUkMarket ? "eBay UK" : isUsMarket ? "eBay US" : "eBay AU"}`}
              >
                {isPublishingEbay ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span className="truncate">Publishing...</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Publish to eBay</span>
                  </>
                )}
              </button>
            )}
          </div>

          {onListEbay && !ebayPublishSuccess && (
            <div className="text-center pt-0.5">
              <button
                type="button"
                onClick={handleOpenEbayEditor}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 transition cursor-pointer inline-flex items-center gap-1"
              >
                <span>Open full listing wizard for {isUkMarket ? "eBay UK" : isUsMarket ? "eBay US" : "eBay AU"}</span>
                <ArrowUpRight className="w-3 h-3 text-zinc-500" />
              </button>
            </div>
          )}
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
