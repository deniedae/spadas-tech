/**
 * Spadas Reseller Turnover & Sales Velocity Engine
 * Calculates Sell-Through Rate (STR), turnover days-to-sell, and hoarder risk warnings.
 * Built specifically for high-turnover arbitrage at junkyards, thrift stores, and across scrapers.
 */

export type TurnoverTier = "RAPID_FIRE" | "STEADY_TURN" | "SLOW_BURNER" | "HOARDER_RISK";

export interface SalesVelocityProfile {
  sellThroughRate: number; // percentage, e.g. 125 (%)
  estDaysToSell: string; // human readable, e.g. "2-5 Days", "45+ Days"
  estDaysToSellNumber: number; // numeric average days
  turnoverTier: TurnoverTier;
  velocityLabel: string;
  demandScore: number; // 1 - 100
  isHoarderRisk: boolean;
  warning?: string;
  badgeStyle: {
    bg: string;
    text: string;
    border: string;
  };
}

/**
 * Empirical Reseller Benchmark Velocity Profiles by Category & Product Substrings
 */
interface CategoryVelocityRule {
  keywords: string[];
  baseStr: number; // Sell Through Rate %
  avgDays: number;
  tier: TurnoverTier;
  warning?: string;
}

const VELOCITY_RULES: CategoryVelocityRule[] = [
  // ── AUTO SALVAGE & JUNKYARD (High Turnover) ──────────────────────────────────
  {
    keywords: ["ecm", "ecu", "pcm", "tcm", "engine control", "powertrain control", "module", "fuse box", "tipm"],
    baseStr: 145,
    avgDays: 4,
    tier: "RAPID_FIRE",
  },
  {
    keywords: ["tail light", "taillight", "tail lamp", "headlight", "headlamp", "fog light"],
    baseStr: 95,
    avgDays: 8,
    tier: "RAPID_FIRE",
  },
  {
    keywords: ["window switch", "master switch", "door lock actuator", "blend door", "blower motor resistor"],
    baseStr: 110,
    avgDays: 6,
    tier: "RAPID_FIRE",
  },
  {
    keywords: ["side mirror", "rear view mirror", "side view mirror", "sun visor"],
    baseStr: 85,
    avgDays: 10,
    tier: "STEADY_TURN",
  },
  {
    keywords: ["speedometer", "instrument cluster", "gauge cluster", "radio display", "nav unit", "amplifier"],
    baseStr: 75,
    avgDays: 14,
    tier: "STEADY_TURN",
  },
  {
    keywords: ["alternator", "starter motor", "throttle body", "ac compressor"],
    baseStr: 60,
    avgDays: 18,
    tier: "STEADY_TURN",
  },
  // ── AUTO SALVAGE TRAPS / HOARDER RISKS ────────────────────────────────────────
  {
    keywords: ["steel wheel", "bulky rim", "spare tire", "iron engine", "cylinder head", "exhaust manifold", "bumper", "fender", "door panel", "seat"],
    baseStr: 18,
    avgDays: 65,
    tier: "HOARDER_RISK",
    warning: "🛑 Junkyard Hoarder Trap: Heavy & bulky. Sells <20% STR with 60+ day holding time.",
  },

  // ── VINTAGE & STREETWEAR ───────────────────────────────────────────────────
  {
    keywords: ["single stitch", "tour shirt", "band tee", "vintage 90s", "carhartt j97", "detroit jacket", "nike tn"],
    baseStr: 130,
    avgDays: 4,
    tier: "RAPID_FIRE",
  },
  {
    keywords: ["hoodie", "fleece", "leather boots", "retro running", "salomon", "dr martens", "birkenstock"],
    baseStr: 85,
    avgDays: 9,
    tier: "STEADY_TURN",
  },
  {
    keywords: ["shein", "temu", "primark", "old navy", "mossimo", "faded glory", "george"],
    baseStr: 12,
    avgDays: 90,
    tier: "HOARDER_RISK",
    warning: "🛑 Fast Fashion Trap: Saturated secondary market. Zero turnover velocity.",
  },

  // ── RETRO TECH & CAMERAS ───────────────────────────────────────────────────
  {
    keywords: ["digicam", "powershot", "cyber-shot", "camedia", "game boy", "nintendo ds", "ipod classic"],
    baseStr: 160,
    avgDays: 3,
    tier: "RAPID_FIRE",
  },
  {
    keywords: ["walkman", "discman", "mechanical keyboard", "retro console", "playstation"],
    baseStr: 90,
    avgDays: 7,
    tier: "RAPID_FIRE",
  },
  {
    keywords: ["printer", "inkjet", "scanner bed", "office keyboard", "computer monitor", "amazon basics", "onn"],
    baseStr: 15,
    avgDays: 75,
    tier: "HOARDER_RISK",
    warning: "🛑 Commodity Tech Trap: Heavy postage, high returns, sluggish 75+ day turnover.",
  },

  // ── COLLECTIBLES & CARDS ───────────────────────────────────────────────────
  {
    keywords: ["pokemon", "magic the gathering", "charizard", "tcg booster", "first edition", "sealed lego"],
    baseStr: 120,
    avgDays: 5,
    tier: "RAPID_FIRE",
  },
  {
    keywords: ["dvd", "vhs", "paperback", "cd album"],
    baseStr: 14,
    avgDays: 95,
    tier: "HOARDER_RISK",
    warning: "🛑 Penny Media Trap: Sits on shelf for 90+ days. Leave at thrift.",
  },
];

/**
 * Calculates Sell-Through Rate (STR) and full turnover velocity profile.
 * Can be fed raw active/sold numbers from scrapers or uses calibrated heuristic rules.
 */
export function calculateSalesVelocity(options: {
  productName?: string | null;
  category?: string | null;
  brand?: string | null;
  activeCount?: number | null;
  soldsCount?: number | null;
}): SalesVelocityProfile {
  const { productName = "", category = "", brand = "", activeCount, soldsCount } = options;
  const query = `${productName || ""} ${category || ""} ${brand || ""}`.toLowerCase().trim();

  // 1. If explicit scraper counts are provided, compute mathematical STR
  if (typeof activeCount === "number" && typeof soldsCount === "number" && activeCount > 0) {
    const rawStr = Math.round((soldsCount / activeCount) * 100);
    const estDays = Math.max(2, Math.round(90 / (soldsCount > 0 ? (soldsCount / 30) : 0.5)));
    
    let tier: TurnoverTier = "STEADY_TURN";
    if (rawStr >= 90) tier = "RAPID_FIRE";
    else if (rawStr >= 40) tier = "STEADY_TURN";
    else if (rawStr >= 25) tier = "SLOW_BURNER";
    else tier = "HOARDER_RISK";

    return formatVelocityProfile({
      str: rawStr,
      avgDays: estDays,
      tier,
      customWarning: tier === "HOARDER_RISK" ? "🛑 Low Sell-Through (<25% STR): High hoarding risk." : undefined,
    });
  }

  // 2. Keyword-based matching against empirical reseller velocity knowledge base
  for (const rule of VELOCITY_RULES) {
    if (rule.keywords.some((kw) => query.includes(kw))) {
      return formatVelocityProfile({
        str: rule.baseStr,
        avgDays: rule.avgDays,
        tier: rule.tier,
        customWarning: rule.warning,
      });
    }
  }

  // 3. Fallback based on broader category
  const cat = (category || "").toLowerCase();
  if (cat.includes("auto") || cat.includes("car") || cat.includes("part") || cat.includes("salvage")) {
    return formatVelocityProfile({ str: 75, avgDays: 12, tier: "STEADY_TURN" });
  }
  if (cat.includes("camera") || cat.includes("gaming") || cat.includes("tech")) {
    return formatVelocityProfile({ str: 90, avgDays: 8, tier: "RAPID_FIRE" });
  }
  if (cat.includes("streetwear") || cat.includes("vintage") || cat.includes("sneaker")) {
    return formatVelocityProfile({ str: 80, avgDays: 10, tier: "STEADY_TURN" });
  }

  // Default moderate profile
  return formatVelocityProfile({ str: 55, avgDays: 18, tier: "STEADY_TURN" });
}

function formatVelocityProfile(params: {
  str: number;
  avgDays: number;
  tier: TurnoverTier;
  customWarning?: string;
}): SalesVelocityProfile {
  const { str, avgDays, tier, customWarning } = params;

  let estDaysToSell = `${avgDays}-${avgDays + 4} Days`;
  if (avgDays <= 4) estDaysToSell = "2-5 Days";
  else if (avgDays >= 45) estDaysToSell = "45+ Days";

  let velocityLabel = "⚖️ Steady (~14d)";
  let badgeStyle = {
    bg: "bg-cyan-500/20",
    text: "text-cyan-300",
    border: "border-cyan-500/30",
  };
  let demandScore = 65;

  if (tier === "RAPID_FIRE") {
    velocityLabel = `⚡ Fast Flip (~${avgDays}d)`;
    badgeStyle = {
      bg: "bg-emerald-500/20",
      text: "text-emerald-300",
      border: "border-emerald-500/40",
    };
    demandScore = Math.min(99, Math.round(75 + (str / 150) * 24));
  } else if (tier === "SLOW_BURNER") {
    velocityLabel = `🐢 Slow Burner (~${avgDays}d)`;
    badgeStyle = {
      bg: "bg-amber-500/20",
      text: "text-amber-300",
      border: "border-amber-500/40",
    };
    demandScore = 40;
  } else if (tier === "HOARDER_RISK") {
    velocityLabel = `🛑 Space Trap (45+d)`;
    badgeStyle = {
      bg: "bg-rose-500/20",
      text: "text-rose-400",
      border: "border-rose-500/40",
    };
    demandScore = 20;
  }

  return {
    sellThroughRate: str,
    estDaysToSell,
    estDaysToSellNumber: avgDays,
    turnoverTier: tier,
    velocityLabel,
    demandScore,
    isHoarderRisk: tier === "HOARDER_RISK",
    warning: customWarning,
    badgeStyle,
  };
}
