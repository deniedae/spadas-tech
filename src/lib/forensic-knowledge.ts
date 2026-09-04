/**
 * Spadas AI Multi-Material Forensic Knowledge Engine
 * Comprehensive database of counterfeit tells, manufacturing standards, and hallmark tables.
 */

export type ForensicCategory =
  | "crystals_gems"
  | "precious_metals"
  | "luxury_handbags"
  | "small_leather_goods"
  | "watches"
  | "sneakers_streetwear"
  | "trading_cards"
  | "general_resale";

export interface AngleGuidance {
  id: string;
  title: string;
  subtitle: string;
  instruction: string;
  icon: string;
  macroTip: string;
}

export interface CategoryForensicConfig {
  id: ForensicCategory;
  name: string;
  emoji: string;
  tagline: string;
  knowledgePrompt: string;
  angles: AngleGuidance[];
}

export const FORENSIC_CATEGORIES: Record<ForensicCategory, CategoryForensicConfig> = {
  crystals_gems: {
    id: "crystals_gems",
    name: "Crystals & Gems",
    emoji: "💎",
    tagline: "Natural Minerals vs Glass/Resin/Synthetics",
    knowledgePrompt: `CRITICAL FORENSIC RULES FOR CRYSTALS & GEMSTONES:
1. Gas Bubbles vs Natural Inclusions:
   - FAKE (Glass/Resin): Perfectly round spherical gas bubbles or swirl lines from molten glass casting.
   - AUTHENTIC: Irregular angular inclusions (rutile needles, fluid veils, negative crystals, mineral phantoms).
2. Termination & Facet Sharpness:
   - FAKE: Rounded, soft facet junctions caused by mold casting or acid polishing.
   - AUTHENTIC: Razor-sharp facet junctions, natural growth striations (horizontal growth lines along prism faces on quartz).
3. Cleavage & Fracture Patterns:
   - FAKE: Smooth, scalloped conchoidal glass chip marks with glassy sheen.
   - AUTHENTIC: Stepped cleavage planes matching the crystal lattice system (e.g., cubic for pyrite/fluorite, rhombohedral for calcite).
4. Color Distribution & Dye Bleed:
   - FAKE: Dye concentrated in surface fissures/cracks (e.g. fake dyed howlite sold as turquoise, dyed quartz sold as amethyst).
   - AUTHENTIC: Zoned color transitions following natural growth sectors without chemical dye pooling.`,
    angles: [
      {
        id: "overview",
        title: "1. Specimen Overview",
        subtitle: "Silhouette, habit and color zoning",
        instruction: "Capture the full crystal or gemstone in balanced neutral light.",
        icon: "💎",
        macroTip: "Avoid direct camera flash to prevent blown-out specular highlights.",
      },
      {
        id: "clarity_inclusions",
        title: "2. Inclusions & Clarity",
        subtitle: "Internal structures and bubbles",
        instruction: "Back-light the specimen with phone flashlight or sunlight to reveal internal features.",
        icon: "🔬",
        macroTip: "Focus closely inside the crystal to see if internal particles are round bubbles or angular needles.",
      },
      {
        id: "termination_facets",
        title: "3. Facet Edges & Tip",
        subtitle: "Growth striations and edges",
        instruction: "Close-up of the facet junctions or crystal termination point.",
        icon: "📐",
        macroTip: "Look for horizontal striation ridges along the crystal sides.",
      },
      {
        id: "matrix_base",
        title: "4. Matrix / Base Rock",
        subtitle: "Natural host rock contact",
        instruction: "Capture the bottom base, matrix rock, or unpolished raw edge.",
        icon: "🪨",
        macroTip: "Authentic raw specimens usually retain genuine host rock matrix without glue residue.",
      },
    ],
  },

  precious_metals: {
    id: "precious_metals",
    name: "Gold & Silver",
    emoji: "🪙",
    tagline: "Hallmarks, Plating Wear & Cast Seams",
    knowledgePrompt: `CRITICAL FORENSIC RULES FOR PRECIOUS METALS & JEWELRY:
1. Hallmarks & Fineness Standards:
   - GOLD: '375' (9K), '417' (10K), '585' (14K), '750' (18K), '916' (22K), '999' (24K).
   - SILVER: '925' (Sterling Silver), '958' (Britannia), '999' (Fine Silver).
   - PLATINUM: '950' or 'PLAT'.
   - FAKE/PLATED: 'GP' (Gold Plated), 'GF' (Gold Filled), 'GEP' (Gold Electroplated), 'HGE', or total absence of required assay punches.
2. Plating Erosion & Base Metal Bleed:
   - Look at high-friction contact points (clasps, jump rings, inner shank, chain link elbows).
   - If brass, copper (green verdigris), or zinc silver-grey is exposed under a gold surface, it is PLATED BASE METAL.
3. Mold Seams vs Forged/Stamped Construction:
   - FAKE: Raised casting mold parting lines along the rim or between links, porous/pitted surface texture from cheap centrifugal casting.
   - AUTHENTIC: Crisp engraved/stamped hallmark edges with genuine displacement burrs, smooth soldered joints.`,
    angles: [
      {
        id: "overview",
        title: "1. Jewelry Overview",
        subtitle: "Full silhouette, luster and tone",
        instruction: "Capture the entire item showing its natural color and luster.",
        icon: "🪙",
        macroTip: "Natural gold has a warm rich glow, not an overly brassy or artificial yellow sheen.",
      },
      {
        id: "hallmark",
        title: "2. Hallmark Stamp",
        subtitle: "Fineness stamp and maker's mark",
        instruction: "Super macro close-up of the stamped numbers (e.g. 750, 585, 925, 14K, 18K).",
        icon: "🔍",
        macroTip: "Use maximum optical zoom and steady your phone against a surface.",
      },
      {
        id: "wear_points",
        title: "3. Clasp & Friction Points",
        subtitle: "Checking for base metal wear",
        instruction: "Close-up of the clasp mechanism, jump ring joints, or high-wear edges.",
        icon: "🔗",
        macroTip: "Inspect closely for any reddish copper or yellow brass showing under white silver/gold.",
      },
      {
        id: "underside_construction",
        title: "4. Reverse / Setting Base",
        subtitle: "Casting seams and stone mount",
        instruction: "Capture the back of the pendant, inner ring band, or gemstone prongs.",
        icon: "⚖️",
        macroTip: "Authentic fine jewelry features clean hand-finished gallery work without rough casting pits.",
      },
    ],
  },

  luxury_handbags: {
    id: "luxury_handbags",
    name: "Luxury Handbags",
    emoji: "👜",
    tagline: "Louis Vuitton, Chanel, Hermes, Gucci, Prada",
    knowledgePrompt: `CRITICAL FORENSIC RULES FOR LUXURY LEATHER GOODS:
1. Louis Vuitton:
   - Monogram Alignment: LV logos are never cut off in seam stitching on authentic Speedy/Neverfull bags; monogram is continuous canvas (upside down on back of Speedy).
   - Heat Stamp: The 'O' in Louis Vuitton is very round (almost a perfect circle). The two 'T's in Vuitton almost touch.
   - Date Codes / Microchips: Pre-2021 date code format: 2 letters + 4 digits (e.g. SD2148: SD = factory, weeks 2&4, year 1&8 = 24th week of 2018). Post-2021 uses embedded RFID microchips. Pre-1980s vintage bags naturally lack date codes entirely; evaluate via canvas grain, hardware patina, and French cowhide leather.
2. Chanel:
   - Quilt Diamond Alignment: Quilted diamonds must align perfectly across the front flap and body when closed, and across the back slip pocket.
   - CC Lock: Right C overlaps left C at the top; left C overlaps right C at the bottom.
3. Christian Dior:
   - Oblique Jacquard Canvas: The letter 'D' leans forward with a thin top-left curve and thick right curve; the top serif of the 'r' tucks neatly under the next 'D'. Fakes feature upright letters and bleeding borders.
   - Cannage Quilting: Lady Dior and Caro bags feature 12-strand intersecting arched cushions with uniform geometric symmetry.
   - D.I.O.R. Charms: Solid weighted metal with embossed 'CD' oval connecting loop; zero porous casting seams or tinny hollow feel.
   - Date Code: ##-AA-#### format on reverse of tag (e.g. 01-RU-0118). Vintage pre-1990 items are exempt.
4. Hermes:
   - Stitching: Hand-sewn saddle stitch has an intentional ~28-degree slant; machine-sewn straight lockstitch is an immediate COUNTERFEIT tell.
5. Hardware & Era Reality:
   - Premium brass hardware with crisp laser engraving (Lampo, Riri, YKK, or branded pulls); no lightweight plated pot metal.
   - ERA EXEMPTION: Pre-microchip items or vintage models lacking internal tags must be verified decisively on material grain, stitch tension, and hardware finish without demanding non-existent microchips.`,
    angles: [
      {
        id: "exterior",
        title: "1. Full Exterior & Pattern",
        subtitle: "Silhouette and monogram alignment",
        instruction: "Capture the entire bag from the front showing seam symmetry.",
        icon: "👜",
        macroTip: "Ensure pattern alignment across the front flap or main seam is clearly visible.",
      },
      {
        id: "heat_stamp",
        title: "2. Brand Heat Stamp",
        subtitle: "Typography, font serifs and debossing",
        instruction: "Macro close-up of the interior leather brand heat stamp or metal logo plaque.",
        icon: "🏷️",
        macroTip: "Check font kerning (e.g., round 'O' in Louis Vuitton, serif symmetry).",
      },
      {
        id: "stitching_edging",
        title: "3. Seam Stitching & Glazing",
        subtitle: "Thread density, slant and edge coat",
        instruction: "Extreme close-up of corner seam stitching and leather edge burnishing/glazing.",
        icon: "🪡",
        macroTip: "Look for uniform thread gauge and authentic hand-saddle stitch slant.",
      },
      {
        id: "hardware_code",
        title: "4. Hardware & Date Code",
        subtitle: "Zipper engraving, rivets, or serial",
        instruction: "Capture zipper pull engraving, studs, or date code. (Skip if vintage pre-serial)",
        icon: "🔐",
        macroTip: "Focus on zipper manufacturer stamps or date tabs. Vintage items without serials can be verified via hardware.",
      },
    ],
  },

  small_leather_goods: {
    id: "small_leather_goods",
    name: "Small Leather Goods & Wallets",
    emoji: "👛",
    tagline: "Wallets, Cardholders & SLGs (Prada, LV, Gucci, Chanel)",
    knowledgePrompt: `CRITICAL FORENSIC RULES FOR SMALL LEATHER GOODS (SLG) & WALLETS:
1. Prada Saffiano & Leather Wallets:
   - The Notched 'R': In both the exterior triangle plaque and interior heat stamp ('PRADA / MILANO / MADE IN ITALY'), the right leg of the letter 'R' MUST have an intentional curved notch/indent where the loop joins the leg. A straight standard 'R' is an IMMEDIATE 100% COUNTERFEIT tell.
   - Factory Inspection Tag (Clim Code): Inside many modern Prada items is a tiny white fabric tag with a 1-3 digit factory number (e.g. '12', '175', '107'). Fakes use paper or omit it. However, vintage Prada pieces or specific unlined cardholders naturally lack this tag; evaluate these via the notched 'R', Saffiano wax-treatment, and Lampo/riri hardware.
   - Saffiano Crosshatch Grain: Authentic Saffiano is wax-finished calfskin with a diagonal crosshatch texture that is rigid, durable, and scratch-resistant with a subtle satin sheen. Cheap fakes use soft, rubbery PVC, stamped faux leather, or petroleum-smelling plastic.
   - Triangle Plaque & Hardware: Enameled triangle plaques must have four clean corner rivets or secure prongs; lettering 'PRADA / MILANO / DAL 1913' must be crisp and centered. Zipper pulls on authentic Prada wallets are typically Lampo, IPI, or riri.
   - Edge Glazing: Card slot divider edges must have thin, smooth, matte edge paint. Thick, goopy, shiny rubber paint that peels or cracks easily is a clear counterfeit tell.
2. Louis Vuitton Wallets & SLGs:
   - Heat Stamp: Perfectly round 'O' in Louis Vuitton, sharp pointed 'V', and the two 'T's in Vuitton almost touch.
   - Date Codes / Microchips: Foil or blind stamped date code in bill compartment seam (pre-2021) or embedded RFID chip (post-2021). Vintage pre-1980s items lack date codes.
   - Glazing & Grain: Edges along the main fold must be cleanly burnished without tacky melted resin.
3. Chanel & Gucci SLGs:
   - Micro-serial numbers, foil heat stamps, and clean symmetry across card dividers.
4. Era & Model Exemption Reality:
   - Many authentic small wallets, cardholders, and vintage SLGs do NOT have date codes or factory inspection tags. Never penalize a genuine item or demand non-existent tags if visible leather, typography, and edge finishing are factory authentic.
5. Condition & Flip Guidance:
   - Surface Micro-flecks: White micro-flecks across the face are often paint dust, drywall spray, or light scuffs. A gentle wipe with a damp microfiber cloth and neutral leather conditioner (e.g. Bick 4, Saphir Renovateur) will lift surface debris, upgrading condition and resale appeal.
   - Market Comps: Used Prada Saffiano bifolds in clean secondhand condition typically command $140 – $220 AUD depending on bill lining integrity.`,
    angles: [
      {
        id: "exterior_plaque",
        title: "1. Exterior Face & Logo Plaque",
        subtitle: "Plaque enamel, lettering and Saffiano grain",
        instruction: "Capture the front face of the wallet showing the full logo plaque or monogram.",
        icon: "👛",
        macroTip: "Inspect the Saffiano crosshatch grain — it should be wax-treated calfskin with a subtle satin sheen, not soft rubbery plastic.",
      },
      {
        id: "interior_heat_stamp",
        title: "2. Interior Heat Stamp & Font",
        subtitle: "Foil/blind deboss and Prada notched 'R'",
        instruction: "Macro close-up of the interior brand heat stamp (e.g. PRADA MILANO / MADE IN ITALY).",
        icon: "🏷️",
        macroTip: "CRITICAL: On Prada, inspect the letter 'R' — authentic Prada ALWAYS has a distinctive curved notch in the right leg.",
      },
      {
        id: "factory_tag_seam",
        title: "3. Factory Tag / Deep Seam",
        subtitle: "Tiny white inspection number in billfold seam",
        instruction: "Check billfold seam or card slot for factory tag or date code. (Skip if vintage or not present on your model)",
        icon: "🔢",
        macroTip: "Many Prada wallets have a 1-3 digit factory number tag in the seam. If your item is vintage or unlined, tap 'Skip Angle'.",
      },
      {
        id: "card_slots_glazing",
        title: "4. Card Slots, Glazing & Stitching",
        subtitle: "Edge paint thickness and saddle stitching",
        instruction: "Close-up of the folded card dividers, edge glazing burnish, and perimeter stitching.",
        icon: "🪡",
        macroTip: "Edge glazing along card slots must be thin and matte. Thick, gooey, peelable rubber paint indicates a low-tier fake.",
      },
    ],
  },

  watches: {
    id: "watches",
    name: "Watches & Horology",
    emoji: "⌚",
    tagline: "Rolex, Omega, Cartier, Seiko, Vintage",
    knowledgePrompt: `CRITICAL FORENSIC RULES FOR WATCHES & HOROLOGY:
1. Dial Typography & Printing:
   - Authentic luxury dials feature clean pad printing with 3D raised ink relief, sharp serifs, and zero ink bleed or fuzziness under 10x magnification.
2. Rolex Specifics:
   - Cyclops Lens: 2.5x true optical magnification with anti-reflective coating on the date aperture (fakes only magnify 1.5x or lack AR coating).
   - Laser-Etched Coronet: Micro-etched Rolex crown at the 6 o'clock position on sapphire crystal (difficult to see with naked eye, subtle dashed dots).
   - Rehaut: 'ROLEXROLEXROLEX' engraved on the inner bezel ring, perfectly aligning with hour markers.
3. Movement & Case Finishing:
   - Crisp chamfered bevels on lugs, uniform directional satin brushing, crisp laser/stamped serial numbers between lugs or on caseback.
4. No-Date Complication Exemption:
   - For time-only models without date displays (e.g. Submariner No-Date, Oyster Perpetual, Daytona, Explorer 1), evaluate dial coronet pad printing, handset beveling, and lug brushing without demanding a cyclops shot.`,
    angles: [
      {
        id: "dial_front",
        title: "1. Dial & Hands",
        subtitle: "Print crispness and hand finish",
        instruction: "Capture the watch dial head-on with hands positioned away from logos.",
        icon: "⌚",
        macroTip: "Set time to 10:10 to keep hands from blocking the brand name or date window.",
      },
      {
        id: "cyclops_date",
        title: "2. Date Window / Dial Logo",
        subtitle: "Magnification or dial emblem",
        instruction: "Close-up of the date cyclops lens or brand coronet / logo. (Skip if no-date model)",
        icon: "🔎",
        macroTip: "On no-date watches, focus directly on the dial brand emblem and typography.",
      },
      {
        id: "crown_case",
        title: "3. Crown & Case Side",
        subtitle: "Crown logo, guards and rehaut",
        instruction: "Side angle showing winding crown engraving, case bevels, and inner rehaut ring.",
        icon: "⚙️",
        macroTip: "Check that crown teeth are cleanly cut and not jagged.",
      },
      {
        id: "caseback_clasp",
        title: "4. Caseback & Bracelet Clasp",
        subtitle: "Model engravings and clasp code",
        instruction: "Capture the caseback engravings and inside blade of the bracelet clasp.",
        icon: "🔒",
        macroTip: "Look for crisp stamped reference numbers and authentic clasp hinge construction.",
      },
    ],
  },

  sneakers_streetwear: {
    id: "sneakers_streetwear",
    name: "Sneakers & Streetwear",
    emoji: "👟",
    tagline: "Nike, Jordan, Yeezy, Supreme, Bape",
    knowledgePrompt: `CRITICAL FORENSIC RULES FOR SNEAKERS & STREETWEAR:
1. Size Tag & UPC Typography:
   - Authentic Nike size tags use Futura Bold Condensed typography with exact numeric kerning and distinct slash '/' angles on dates.
   - Barcode lines must be crisp without fuzzy bleeding; UPC number must match the box label code.
2. Stitching & Construction:
   - Seams must maintain uniform stitch-per-inch density; no double-stitching errors or loose nylon tails.
   - Jordan Wings Logo: The 'R' and 'D' in JORDAN must connect at the bottom.
3. Materials:
   - Yeezy Boost: Soft, textured irregular pellet matrix with distinct 3-dot or 7-dot cluster patterns, never smooth hard molded plastic.
4. Tag-Exempt / Vintage Streetwear:
   - On vintage tees, cut tags, or sample garments lacking barcodes, determine authenticity through single-stitch hem construction, neckline ribbing, embroidery backing, and fabric GSM.`,
    angles: [
      {
        id: "full_profile",
        title: "1. Full Lateral Profile",
        subtitle: "Toe box curvature and silhouette",
        instruction: "Capture the full side profile of the shoe or garment on a flat surface.",
        icon: "👟",
        macroTip: "Check toe box height and heel tab angle.",
      },
      {
        id: "size_tag",
        title: "2. Size Label / Neck Tag",
        subtitle: "Barcode, font kerning and dates",
        instruction: "Direct macro shot of the interior size label or neck tag. (Skip if missing or cut)",
        icon: "🏷️",
        macroTip: "Ensure barcode numbers are clear. If vintage/cut, tap Skip and capture stitching.",
      },
      {
        id: "stitching_logo",
        title: "3. Logo & Seam Stitching",
        subtitle: "Embroidery density and panel cuts",
        instruction: "Close-up of the swoosh, Jumpman, or box logo embroidery.",
        icon: "🪡",
        macroTip: "Look for clean edge cuts on leather panels without blue guide pen marks.",
      },
      {
        id: "outsole_insole",
        title: "4. Outsole & Footbed",
        subtitle: "Tread stars, boost and insole glue",
        instruction: "Capture the bottom sole tread pattern and footbed under insole.",
        icon: "👣",
        macroTip: "Inspect star patterns on the tip of the outsole.",
      },
    ],
  },

  trading_cards: {
    id: "trading_cards",
    name: "Trading Cards",
    emoji: "🎴",
    tagline: "Pokemon, MTG, Sports Cards, Vintage",
    knowledgePrompt: `CRITICAL FORENSIC RULES FOR TRADING CARDS:
1. Rosette CMYK Pattern:
   - Authentic cards are printed using offset lithography producing a distinct 4-color circular 'rosette' dot pattern under 30x magnification.
   - Counterfeit inkjet or laser prints show random speckled dithering or linear printing streaks.
2. Font & Energy Symbols:
   - Text on authentic cards is printed on a separate black ink layer (Key layer) on top of the rosette pattern, making fonts razor sharp with ZERO rosette dots inside the letters.
3. Card Stock & Core Layer:
   - Authentic Pokemon cards have an internal black or dark blue opaque sandwich layer (the 'light test' blocks light; fakes let harsh white light pass right through).
4. Holo Foil Pattern:
   - Authentic vintage holos feature crisp star/cosmos or diagonal rainbow reflections, not dull flat rainbow photo-print sheen.`,
    angles: [
      {
        id: "front_full",
        title: "1. Card Front & Centering",
        subtitle: "Border borders, gloss and art",
        instruction: "Capture the entire front of the card straight-on in diffused light.",
        icon: "🎴",
        macroTip: "Measure top/bottom and left/right border centering.",
      },
      {
        id: "font_rosette",
        title: "2. Text & Attack Font",
        subtitle: "Offset print pattern vs inkjet",
        instruction: "Macro close-up of the attack text and card name font.",
        icon: "🔬",
        macroTip: "Authentic text is sharp black print without colored blur dots around letter edges.",
      },
      {
        id: "holo_foil",
        title: "3. Holo Foil Reflection",
        subtitle: "Foil pattern and star cosmos",
        instruction: "Tilt the card at a 45-degree angle under a light source to capture holo foil refraction.",
        icon: "✨",
        macroTip: "Check if the holo pattern changes dynamically or appears as a flat static print.",
      },
      {
        id: "card_back",
        title: "4. Card Back & Blue Border",
        subtitle: "Back logo color and edge wear",
        instruction: "Capture the entire back of the card focusing on the blue border tone.",
        icon: "🔄",
        macroTip: "Counterfeit cards frequently fail to match the exact dark violet-blue tone of authentic backs.",
      },
    ],
  },

  general_resale: {
    id: "general_resale",
    name: "General Collectibles",
    emoji: "🔍",
    tagline: "Antiques, Electronics, Vintage Goods",
    knowledgePrompt: `GENERAL FORENSIC INSPECTION CRITERIA:
1. Materials & Hardware: Look for authentic manufacturing methods (cast bronze vs resin, solid wood vs veneer, brass screws vs modern zinc Phillips screws).
2. Manufacturer Marks: Inspect patent numbers, registry marks, foundry stamps, or laser-etched model numbers.
3. Wear & Patina: Authentic age creates natural wear on contact areas, while fake distressing often shows unnatural scratches or uniform shoe-polish stain.`,
    angles: [
      {
        id: "overview",
        title: "1. Overall Item",
        subtitle: "Full silhouette and proportions",
        instruction: "Capture the complete item in good lighting.",
        icon: "📦",
        macroTip: "Show the overall shape and construction.",
      },
      {
        id: "maker_mark",
        title: "2. Maker's Mark / Brand Tag",
        subtitle: "Logos, stamps and model badge",
        instruction: "Close-up of the brand badge, stamped mark, or label.",
        icon: "🏷️",
        macroTip: "Focus closely on stamped lettering and borders.",
      },
      {
        id: "craftsmanship",
        title: "3. Joints & Fasteners",
        subtitle: "Screws, rivets, seams and joints",
        instruction: "Close-up of how panels or components are assembled.",
        icon: "🔩",
        macroTip: "Check for period-correct assembly techniques.",
      },
      {
        id: "base_serial",
        title: "4. Underside & Serial Code",
        subtitle: "Base markings, serial and patina",
        instruction: "Capture the bottom, inside chamber, or serial plate.",
        icon: "🔢",
        macroTip: "Inspect natural bottom friction wear.",
      },
    ],
  },
};

/**
 * Detects the most relevant forensic category from product title, brand, or detected category
 */
export function detectForensicCategory(text: string): ForensicCategory {
  const lower = (text || "").toLowerCase();

  // 1. Crystals & Gems
  if (
    /\b(crystal|quartz|amethyst|geode|agate|gem|gemstone|opal|tourmaline|moldavite|mineral|pyrite|fluorite|selenite|labradorite|malachite|citrine|topaz|emerald|ruby|sapphire|jade)\b/i.test(
      lower
    )
  ) {
    return "crystals_gems";
  }

  // 2. Gold & Silver / Metals
  if (
    /\b(gold|silver|925|sterling|14k|18k|10k|9k|24k|750|585|375|platinum|bullion|chain|necklace|ring|earring|bracelet|pendant|hallmark|karat|carat)\b/i.test(
      lower
    )
  ) {
    return "precious_metals";
  }

  // 3. Small Leather Goods & Wallets (SLG)
  if (
    /\b(wallet|bifold|trifold|cardholder|card holder|coin purse|pouch|money clip|passport cover|slg|key pouch|long wallet|zippy|sarah)\b/i.test(
      lower
    )
  ) {
    return "small_leather_goods";
  }

  // 4. Luxury Handbags
  if (
    /\b(handbag|purse|tote|bag|crossbody|clutch|satchel|backpack|louis vuitton|lv|chanel|hermes|birkin|kelly|gucci|prada|dior|fendi|balenciaga|goyard|bottega|saint laurent|ysl)\b/i.test(
      lower
    )
  ) {
    return "luxury_handbags";
  }

  // 5. Watches & Horology
  if (
    /\b(watch|timepiece|rolex|omega|cartier|seiko|patek|audemars|tag heuer|breitling|tudor|casio|g-shock|chronograph|automatic)\b/i.test(
      lower
    )
  ) {
    return "watches";
  }

  // 6. Sneakers & Streetwear
  if (
    /\b(sneaker|shoe|jordan|nike|yeezy|dunk|travis scott|supreme|bape|stussy|palace|off-white|kith|hoodie|jacket|tee)\b/i.test(
      lower
    )
  ) {
    return "sneakers_streetwear";
  }

  // 7. Trading Cards
  if (
    /\b(pokemon|charizard|pikachu|mtg|magic the gathering|yugioh|sports card|psa|bgs|cgc|booster|holographic|tcg)\b/i.test(
      lower
    )
  ) {
    return "trading_cards";
  }

  return "general_resale";
}

export interface VerificationRequirement {
  needsVerification: boolean;
  category: ForensicCategory;
  reason?: string;
  badgeLabel?: string;
}

/**
 * Intelligent AI Triage:
 * Determines if a scanned item genuinely requires forensic authenticity verification
 * (e.g. luxury designer brands, precious metals, gemstones/crystals, luxury watches, hype sneakers, grail cards).
 * Returns needsVerification: false for everyday commodities so the UI remains clean and uncluttered.
 */
export function checkNeedsVerification(item: {
  name?: string;
  brand?: string;
  category?: string;
  estimatedValue?: number;
}): VerificationRequirement {
  const title = `${item.brand || ""} ${item.name || ""} ${item.category || ""}`.toLowerCase();
  const value = Number(item.estimatedValue) || 0;
  const detectedCategory = detectForensicCategory(title);

  // 1. Small Leather Goods & Wallets (Prada, LV, Gucci, Chanel, etc.)
  if (
    /\b(wallet|bifold|trifold|cardholder|card holder|coin purse|pouch|money clip|passport cover|slg|key pouch|long wallet|zippy)\b/i.test(title) &&
    (/\b(louis vuitton|lv|chanel|hermes|gucci|prada|dior|fendi|balenciaga|goyard|bottega|saint laurent|ysl|coach|burberry|celine|loewe)\b/i.test(title) || value >= 70)
  ) {
    return {
      needsVerification: true,
      category: "small_leather_goods",
      reason: "High Counterfeit Risk: Small Leather Goods & Wallets",
      badgeLabel: "Verify Wallet / SLG",
    };
  }

  // 2. High-Counterfeit Luxury Designer Handbags
  if (
    /\b(louis vuitton|lv|chanel|hermes|birkin|kelly|gucci|prada|dior|fendi|balenciaga|goyard|bottega|saint laurent|ysl)\b/i.test(
      title
    )
  ) {
    return {
      needsVerification: true,
      category: "luxury_handbags",
      reason: "High Counterfeit Risk: Luxury Designer",
      badgeLabel: "Verify Authenticity",
    };
  }

  // 2. Precious Metals, Fine Jewelry & Stamped Gold/Silver
  if (
    /\b(gold|silver|925|sterling|10k|14k|18k|24k|375|585|750|999|platinum|diamond|cartier|tiffany)\b/i.test(
      title
    )
  ) {
    return {
      needsVerification: true,
      category: "precious_metals",
      reason: "Hallmark & Metal Assay Inspection Needed",
      badgeLabel: "Verify Metal & Assay",
    };
  }

  // 3. Natural Crystals, Geodes & Minerals (High Glass/Resin Fake Market)
  if (
    /\b(amethyst|quartz|crystal cluster|geode|moldavite|opal|emerald|ruby|sapphire|jade|raw mineral)\b/i.test(
      title
    )
  ) {
    return {
      needsVerification: true,
      category: "crystals_gems",
      reason: "Check Inclusions vs Glass/Resin Imitation",
      badgeLabel: "Verify Genuine Crystal",
    };
  }

  // 4. Luxury Horology & Watches
  if (
    /\b(rolex|omega|cartier|patek|audemars|tag heuer|breitling|tudor)\b/i.test(title) ||
    (/\b(watch|chronograph|automatic)\b/i.test(title) && value >= 100)
  ) {
    return {
      needsVerification: true,
      category: "watches",
      reason: "High Counterfeit Risk: Timepiece Inspection",
      badgeLabel: "Verify Watch Authenticity",
    };
  }

  // 5. Grail Collectibles & High-Value Trading Cards
  if (
    /\b(pokemon|charizard|mtg|magic the gathering|psa|bgs|cgc|1st edition|shadowless)\b/i.test(
      title
    ) &&
    value >= 40
  ) {
    return {
      needsVerification: true,
      category: "trading_cards",
      reason: "Card Print Rosette & Holo Pattern Audit",
      badgeLabel: "Verify Card Authenticity",
    };
  }

  // 6. High-Heat Hype Streetwear & Sneakers
  if (
    /\b(travis scott|yeezy|jordan 1|jordan 4|dunk low|off-white|bape)\b/i.test(title) &&
    value >= 80
  ) {
    return {
      needsVerification: true,
      category: "sneakers_streetwear",
      reason: "Counterfeit-Prone Hype Silhouette",
      badgeLabel: "Verify Sneaker",
    };
  }

  // 7. High-Dollar Items ($150+)
  if (value >= 150) {
    return {
      needsVerification: true,
      category: detectedCategory !== "general_resale" ? detectedCategory : "general_resale",
      reason: "High-Value Transaction Protection",
      badgeLabel: "Verify High Value",
    };
  }

  // All everyday items (e.g. coffee mugs, plain clothes, books, toys, kitchenware):
  return {
    needsVerification: false,
    category: detectedCategory,
  };
}

export interface BrandDnaRule {
  tell_id: string;
  tell_name: string;
  brand_key: string;
  category: ForensicCategory;
  authenticity_rule: string;
  macro_focus: string;
  is_vintage_exemptible?: boolean;
}

export const BRAND_DNA_REGISTRY: Record<string, BrandDnaRule[]> = {
  prada: [
    {
      tell_id: "prada_notched_r",
      tell_name: "Notched 'R' Letter Anatomy",
      brand_key: "prada",
      category: "small_leather_goods",
      authenticity_rule: "The right diagonal leg of the letter 'R' in PRADA must have a distinct curved notch/indentation where the loop connects. A straight standard 'R' leg is an immediate counterfeit tell.",
      macro_focus: "Interior heat stamp & exterior triangle plaque logo",
    },
    {
      tell_id: "prada_triangle_plaque",
      tell_name: "Enamel Triangle Plaque Symmetry",
      brand_key: "prada",
      category: "small_leather_goods",
      authenticity_rule: "Enamel triangle plaque must feature 4 flush, secure corner rivets, centered typography ('PRADA / MILANO / DAL 1913'), and a clean rope-pattern perimeter border.",
      macro_focus: "Front exterior triangle plaque",
    },
    {
      tell_id: "prada_zipper_hallmark",
      tell_name: "Manufacturer Zipper Underside Hallmark",
      brand_key: "prada",
      category: "small_leather_goods",
      authenticity_rule: "Authentic Prada zippers are manufactured by Lampo, riri, IPI, Opti, or YKK. The underside of the slider must be cleanly stamped with the supplier hallmark, never blank or crude pot-metal.",
      macro_focus: "Underside of zipper slider",
    },
    {
      tell_id: "prada_saffiano_grain",
      tell_name: "Saffiano Wax-Finished Crosshatch Grain",
      brand_key: "prada",
      category: "small_leather_goods",
      authenticity_rule: "Authentic Saffiano is wax-finished calfskin with a distinct, rigid diagonal crosshatch texture and subtle satin luster. Synthetic fakes use soft, rubbery PVC or chemical-smelling faux leather.",
      macro_focus: "Leather surface grain under raking light",
    },
    {
      tell_id: "prada_factory_tag",
      tell_name: "Internal Factory Inspection Tag (Clim Code)",
      brand_key: "prada",
      category: "small_leather_goods",
      authenticity_rule: "Many modern Prada SLGs and bags feature a tiny 1-3 digit white woven fabric tag stitched inside an interior seam. Vintage pre-code items and unlined cardholders are exempt.",
      macro_focus: "Deep interior pocket or billfold seam",
      is_vintage_exemptible: true,
    },
  ],

  louis_vuitton: [
    {
      tell_id: "lv_circular_o",
      tell_name: "Circular 'O' Typography & Font Kerning",
      brand_key: "louis_vuitton",
      category: "luxury_handbags",
      authenticity_rule: "The letter 'O' in 'LOUIS VUITTON' is an exact geometric circle (not an oval). The 'L' has a short bottom leg, and the two 'T's in 'VUITTON' nearly touch.",
      macro_focus: "Interior leather heat stamp",
    },
    {
      tell_id: "lv_linen_stitching",
      tell_name: "Mustard Waxed Linen Angled Saddle Stitch",
      brand_key: "louis_vuitton",
      category: "luxury_handbags",
      authenticity_rule: "Stitched with thick, wax-coated mustard-yellow linen thread. Each stitch sits at a consistent hand-guided inward slant with uniform 5-stitch tab reinforcements.",
      macro_focus: "Corner tab seams and handle attachments",
    },
    {
      tell_id: "lv_brass_hardware",
      tell_name: "Solid Brass Rivets & Debossed Hardware",
      brand_key: "louis_vuitton",
      category: "luxury_handbags",
      authenticity_rule: "Solid brass hardware with crisp, rounded debossed lettering and smooth chamfered edges. Fakes use zinc-alloy pot metal with visible casting parting lines.",
      macro_focus: "Handle rivets and zipper pull engravings",
    },
    {
      tell_id: "lv_monogram_symmetry",
      tell_name: "Monogram Canvas Alignment & Symmetry",
      brand_key: "louis_vuitton",
      category: "luxury_handbags",
      authenticity_rule: "Traditional Monogram canvas is aligned with mathematical symmetry. The LV monogram is never cut off at seams on core heritage styles (e.g. Speedy, Neverfull).",
      macro_focus: "Center front silhouette and seam intersections",
    },
    {
      tell_id: "lv_date_code_rfid",
      tell_name: "Era-Appropriate Date Code or RFID Microchip",
      brand_key: "louis_vuitton",
      category: "luxury_handbags",
      authenticity_rule: "Items produced 1982-Feb 2021 feature a 2-letter factory code + 3-4 digit date format matching manufacturing origin. Post-March 2021 items embed RFID microchips. Vintage pre-1980 bags naturally lack codes.",
      macro_focus: "Seam tab or interior pocket lining",
      is_vintage_exemptible: true,
    },
  ],

  gucci: [
    {
      tell_id: "gucci_interlocking_gg",
      tell_name: "Interlocking GG Geometry & Serifs",
      brand_key: "gucci",
      category: "luxury_handbags",
      authenticity_rule: "The two interlocking 'G's must have clean, symmetrical oval curves with a top serif and flat horizontal crossbar. Counterfeits have uneven curves or rounded bar ends.",
      macro_focus: "Front emblem or monogram canvas",
    },
    {
      tell_id: "gucci_heat_stamp_font",
      tell_name: "Heat Stamp Typography & Registered ®",
      brand_key: "gucci",
      category: "small_leather_goods",
      authenticity_rule: "Interior stamp reads '® / GUCCI / made in italy'. The ® circle is crisp and small; the 'G' in GUCCI matches the round shape of the C's, and the 'U' is wide.",
      macro_focus: "Interior leather heat stamp tag",
    },
    {
      tell_id: "gucci_dual_row_serial",
      tell_name: "Stacked Dual-Row Serial Number Formatting",
      brand_key: "gucci",
      category: "small_leather_goods",
      authenticity_rule: "Authentic serial numbers on reverse of leather tag feature 10-13 digits split across two stacked rows (top row = style code, bottom row = supplier/batch code) with serifed 1s and 7s.",
      macro_focus: "Underside of interior leather brand tag",
      is_vintage_exemptible: true,
    },
    {
      tell_id: "gucci_hardware_finish",
      tell_name: "Solid Brass/Palladium Hardware Weight",
      brand_key: "gucci",
      category: "luxury_handbags",
      authenticity_rule: "Hardware has substantial heft and a lustrous mirror finish without copper or brass bleed through chrome plating.",
      macro_focus: "D-rings, clasps and zipper sliders",
    },
  ],

  chanel: [
    {
      tell_id: "chanel_cc_turnlock",
      tell_name: "Interlocking CC Turnlock Overlap Rule",
      brand_key: "chanel",
      category: "luxury_handbags",
      authenticity_rule: "The right 'C' MUST overlap the left 'C' at the top, and the left 'C' MUST overlap the right 'C' at the bottom. Reversing this order is an immediate counterfeit flag.",
      macro_focus: "Front CC turnlock closure",
    },
    {
      tell_id: "chanel_quilt_alignment",
      tell_name: "Diamond Quilting Seam Alignment",
      brand_key: "chanel",
      category: "luxury_handbags",
      authenticity_rule: "Quilted diamonds align perfectly between the front flap and body, as well as seamlessly through the rear Mona Lisa slip pocket.",
      macro_focus: "Front flap closure and back slip pocket seam",
    },
    {
      tell_id: "chanel_stitch_count",
      tell_name: "High Stitch Count Density (10-12 SPI)",
      brand_key: "chanel",
      category: "luxury_handbags",
      authenticity_rule: "Each diamond side features 10 to 12 precise stitches per panel edge. Low stitch counts (6-8 SPI) indicate cheap replica manufacturing.",
      macro_focus: "Quilted panel diamond edge stitching",
    },
    {
      tell_id: "chanel_backplate_screws",
      tell_name: "CC Backplate Screws & 24K Gold Hallmarks",
      brand_key: "chanel",
      category: "luxury_handbags",
      authenticity_rule: "Underside backplate of CC lock uses flathead or proprietary star screws (never cheap Phillips screws). Bags made pre-2008 carry a hallmark indicating 24K gold plating.",
      macro_focus: "Reverse side of CC lock backplate",
    },
  ],

  christian_dior: [
    {
      tell_id: "dior_oblique_canvas",
      tell_name: "Dior Oblique Jacquard Canvas Precision",
      brand_key: "christian_dior",
      category: "luxury_handbags",
      authenticity_rule: "The letter 'D' in the Oblique motif must lean at a forward slant with a thin top-left arc and thick right curve; the top serif of the 'r' must tuck neatly under the subsequent 'D'. Fakes feature upright letters or bleeding borders.",
      macro_focus: "Exterior Oblique canvas monogram motif",
    },
    {
      tell_id: "dior_cannage_quilting",
      tell_name: "Cannage Arch Stitching & Cushion Symmetry",
      brand_key: "christian_dior",
      category: "luxury_handbags",
      authenticity_rule: "On Lady Dior and Caro styles, the 12-strand Cannage quilting features intersecting curved arches creating geometric cushions with uniform stitch tension and perfect alignment.",
      macro_focus: "Front quilted Cannage panel and arch seams",
    },
    {
      tell_id: "dior_dior_charms",
      tell_name: "D.I.O.R. Letter Charms & CD Oval Ring",
      brand_key: "christian_dior",
      category: "luxury_handbags",
      authenticity_rule: "Dangling 'D.I.O.R.' metal charms have substantial heft with smooth edges and zero porous casting flash. The leather attachment loop is anchored by an embossed 'CD' oval ring with centered debossing.",
      macro_focus: "Charm connection ring and letter edges",
    },
    {
      tell_id: "dior_heat_stamp",
      tell_name: "Interior Heat Stamp Typography & Serifs",
      brand_key: "christian_dior",
      category: "luxury_handbags",
      authenticity_rule: "Interior leather tag features crisp hot-stamp foil or deboss reading 'Christian Dior / PARIS / MADE IN ITALY' (or 'MADE IN SPAIN'). The capital 'C' and 'D' are taller than other letters, with fine serifs and balanced spacing.",
      macro_focus: "Interior leather tag brand heat stamp",
    },
    {
      tell_id: "dior_date_code",
      tell_name: "Factory Date Code Formatting (##-AA-####)",
      brand_key: "christian_dior",
      category: "luxury_handbags",
      authenticity_rule: "On the reverse of the leather tag, modern Dior items feature a date code formatted as 2 digits, 2 letters, 4 digits (e.g. '01-RU-0118'). Vintage pre-1990 pieces naturally lack date tabs.",
      macro_focus: "Reverse underside of interior leather tag",
      is_vintage_exemptible: true,
    },
  ],

  nike_jordan: [
    {
      tell_id: "nike_swoosh_needlework",
      tell_name: "Swoosh Tip Needlework & Cut Precision",
      brand_key: "nike_jordan",
      category: "sneakers_streetwear",
      authenticity_rule: "The tail and tip of the Swoosh are cut with laser precision and stitched with uniform thread tension without frayed ends or overlapping messy lock-stitches.",
      macro_focus: "Swoosh tip and perimeter needlework",
    },
    {
      tell_id: "nike_size_tag_barcode",
      tell_name: "Size Tag Typography & Barcode Clarity",
      brand_key: "nike_jordan",
      category: "sneakers_streetwear",
      authenticity_rule: "UPC/style code numbers feature distinct factory font weights and clean baseline alignment. Factory date ranges match official silhouette production runs.",
      macro_focus: "Internal tongue size tag",
    },
    {
      tell_id: "nike_outsole_stars",
      tell_name: "Outsole Molded Star / Pivot Sharpness",
      brand_key: "nike_jordan",
      category: "sneakers_streetwear",
      authenticity_rule: "Traction stars on the toe outsole (e.g. AF1, Dunks, Jordan 1) are cleanly embossed with crisp geometric points, free of rubber mold flashing or bleed.",
      macro_focus: "Outsole toe tip traction pattern",
    },
    {
      tell_id: "nike_strobel_footbed",
      tell_name: "Strobel Footbed Under-Insole Stitching",
      brand_key: "nike_jordan",
      category: "sneakers_streetwear",
      authenticity_rule: "Under the insole, the Strobel stitch securing upper to midsole is uniform, taut, and evenly spaced without messy industrial adhesive puddling.",
      macro_focus: "Footbed beneath removable insole",
    },
  ],

  rolex: [
    {
      tell_id: "rolex_dial_coronet",
      tell_name: "Dial Coronet 3D Relief Pad Printing",
      brand_key: "rolex",
      category: "watches",
      authenticity_rule: "The 5-pointed Rolex coronet at 12 o'clock features crisp pad printing with raised 3D ink relief and perfect oval base geometry under 10x magnification.",
      macro_focus: "Dial at 12 o'clock coronet emblem",
    },
    {
      tell_id: "rolex_cyclops_ar",
      tell_name: "Cyclops 2.5x Magnification & Anti-Reflective Coating",
      brand_key: "rolex",
      category: "watches",
      authenticity_rule: "The cyclops lens enlarges the date aperture by a true 2.5x, with anti-reflective coating ensuring glare-free date reading. (No-date models are exempt).",
      macro_focus: "Date aperture cyclops lens",
      is_vintage_exemptible: true,
    },
    {
      tell_id: "rolex_rehaut_engraving",
      tell_name: "Rehaut Inner Bezel Laser Engraving Alignment",
      brand_key: "rolex",
      category: "watches",
      authenticity_rule: "On post-2005 models, 'ROLEXROLEXROLEX' is etched around the inner rehaut ring: the 'X' aligns with minute markers on the right half, 'R' on the left, and serial number at 6 o'clock.",
      macro_focus: "Inner rehaut ring between dial and crystal",
      is_vintage_exemptible: true,
    },
    {
      tell_id: "rolex_crystal_coronet",
      tell_name: "Micro-Etched Sapphire Crystal Coronet",
      brand_key: "rolex",
      category: "watches",
      authenticity_rule: "Microscopic laser-etched Rolex coronet composed of subtle dots at the 6 o'clock position in the sapphire crystal, visible only under oblique raking light.",
      macro_focus: "6 o'clock position on crystal face",
      is_vintage_exemptible: true,
    },
  ],

  precious_metals: [
    {
      tell_id: "metal_assay_fineness",
      tell_name: "Assay Fineness Punches (750 / 585 / 925)",
      brand_key: "precious_metals",
      category: "precious_metals",
      authenticity_rule: "Genuine precious metals bear crisp, recessed assay fineness punches (e.g. 750 for 18K, 585 for 14K, 925 for sterling silver) with authentic metal displacement burrs.",
      macro_focus: "Clasp tab, inner shank or jump ring hallmark",
    },
    {
      tell_id: "metal_plating_wear",
      tell_name: "Plating Wear & Base Metal Bleed Inspection",
      brand_key: "precious_metals",
      category: "precious_metals",
      authenticity_rule: "Contact points and friction links must show consistent homogeneous metal color. Exposed green verdigris, copper red, or gray zinc under gold indicates plated costume jewelry.",
      macro_focus: "Clasp hinge, chain elbows and high-wear corners",
    },
    {
      tell_id: "metal_cast_seams",
      tell_name: "Absence of Centrifugal Cast Parting Lines",
      brand_key: "precious_metals",
      category: "precious_metals",
      authenticity_rule: "Fine jewelry features hand-burnished surfaces, smooth solder joints, and zero porous casting pits or mold parting flash lines.",
      macro_focus: "Reverse side of setting, prongs and link rims",
    },
  ],

  crystals_gems: [
    {
      tell_id: "crystal_natural_inclusions",
      tell_name: "Natural Angular Inclusions vs Gas Bubbles",
      brand_key: "crystals_gems",
      category: "crystals_gems",
      authenticity_rule: "Natural crystals exhibit angular negative crystals, rutile needles, or fluid veils. Perfectly spherical gas bubbles or swirl lines indicate molded glass or synthetic resin.",
      macro_focus: "Internal specimen body under backlight",
    },
    {
      tell_id: "crystal_facet_striations",
      tell_name: "Facet Junction Sharpness & Growth Striations",
      brand_key: "crystals_gems",
      category: "crystals_gems",
      authenticity_rule: "Natural specimens have razor-sharp facet junctions and horizontal growth striation ridges on prism faces, unlike rounded mold-cast faux stones.",
      macro_focus: "Crystal termination tip and facet junctions",
    },
    {
      tell_id: "crystal_matrix_contact",
      tell_name: "Natural Matrix Host Rock Contact",
      brand_key: "crystals_gems",
      category: "crystals_gems",
      authenticity_rule: "Authentic geodes and clusters show natural basalt or sandstone host rock contact without synthetic glue seams or chemical dye pooling in surface cracks.",
      macro_focus: "Base rock matrix and unpolished underside",
    },
  ],
};

/**
 * Retrieve applicable Brand DNA rules for an item
 */
export function getBrandDnaRules(brandName?: string, category?: ForensicCategory): BrandDnaRule[] {
  const b = (brandName || "").toLowerCase();
  
  if (/\b(prada)\b/i.test(b)) return BRAND_DNA_REGISTRY.prada;
  if (/\b(louis vuitton|lv)\b/i.test(b)) return BRAND_DNA_REGISTRY.louis_vuitton;
  if (/\b(gucci)\b/i.test(b)) return BRAND_DNA_REGISTRY.gucci;
  if (/\b(chanel)\b/i.test(b)) return BRAND_DNA_REGISTRY.chanel;
  if (/\b(christian dior|dior)\b/i.test(b)) return BRAND_DNA_REGISTRY.christian_dior;
  if (/\b(nike|jordan)\b/i.test(b)) return BRAND_DNA_REGISTRY.nike_jordan;
  if (/\b(rolex)\b/i.test(b)) return BRAND_DNA_REGISTRY.rolex;

  // Fallback to category defaults if brand is unknown
  if (category === "precious_metals") return BRAND_DNA_REGISTRY.precious_metals;
  if (category === "crystals_gems") return BRAND_DNA_REGISTRY.crystals_gems;
  if (category === "watches") return BRAND_DNA_REGISTRY.rolex;
  if (category === "sneakers_streetwear") return BRAND_DNA_REGISTRY.nike_jordan;
  if (category === "small_leather_goods") return BRAND_DNA_REGISTRY.prada;
  if (category === "luxury_handbags") return BRAND_DNA_REGISTRY.louis_vuitton;

  return [];
}


