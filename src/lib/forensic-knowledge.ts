/**
 * Spadas AI Multi-Material Forensic Knowledge Engine
 * Comprehensive database of counterfeit tells, manufacturing standards, and hallmark tables.
 */

export type ForensicCategory =
  | "crystals_gems"
  | "precious_metals"
  | "luxury_handbags"
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
   - Date Codes / Microchips: Pre-2021 date code format: 2 letters + 4 digits (e.g. SD2148: SD = factory, weeks 2&4, year 1&8 = 24th week of 2018). Post-2021 uses embedded RFID microchips.
2. Chanel:
   - Quilt Diamond Alignment: Quilted diamonds must align perfectly across the front flap and bag body when closed, and across the back slip pocket.
   - CC Lock: Right C overlaps left C at the top; left C overlaps right C at the bottom.
3. Hermes:
   - Stitching: Hand-sewn saddle stitch has an intentional ~28-degree slant; machine-sewn straight lockstitch is an immediate COUNTERFEIT tell.
4. Hardware:
   - Premium brass hardware with crisp laser engraving (Lampo, Riri, YKK, or branded pulls); no lightweight plated pot metal.`,
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
        subtitle: "Zipper engraving, rivets and serial",
        instruction: "Capture the zipper pull engraving, base studs, or interior serial/date code tab.",
        icon: "🔐",
        macroTip: "Focus on the manufacturer stamp on the underside of zipper sliders.",
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
   - Crisp chamfered bevels on lugs, uniform directional satin brushing, crisp laser/stamped serial numbers between lugs or on caseback.`,
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
        title: "2. Date Window / Logo",
        subtitle: "Magnification and laser etching",
        instruction: "Macro close-up of the date cyclops lens or brand coronet.",
        icon: "🔎",
        macroTip: "Inspect date numeral alignment and crispness inside the cyclops.",
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
   - Yeezy Boost: Soft, textured irregular pellet matrix with distinct 3-dot or 7-dot cluster patterns, never smooth hard molded plastic.`,
    angles: [
      {
        id: "full_profile",
        title: "1. Full Lateral Profile",
        subtitle: "Toe box curvature and silhouette",
        instruction: "Capture the full side profile of the shoe on a flat surface.",
        icon: "👟",
        macroTip: "Check toe box height and heel tab angle.",
      },
      {
        id: "size_tag",
        title: "2. Size Label / Neck Tag",
        subtitle: "Barcode, font kerning and dates",
        instruction: "Direct macro shot of the interior size label or neck tag.",
        icon: "🏷️",
        macroTip: "Ensure barcode numbers and factory country markings are completely in focus.",
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

  // 3. Luxury Handbags
  if (
    /\b(handbag|purse|tote|wallet|bag|crossbody|clutch|louis vuitton|lv|chanel|hermes|birkin|kelly|gucci|prada|dior|fendi|balenciaga|goyard|bottega|saint laurent|ysl)\b/i.test(
      lower
    )
  ) {
    return "luxury_handbags";
  }

  // 4. Watches & Horology
  if (
    /\b(watch|timepiece|rolex|omega|cartier|seiko|patek|audemars|tag heuer|breitling|tudor|casio|g-shock|chronograph|automatic)\b/i.test(
      lower
    )
  ) {
    return "watches";
  }

  // 5. Sneakers & Streetwear
  if (
    /\b(sneaker|shoe|jordan|nike|yeezy|dunk|travis scott|supreme|bape|stussy|palace|off-white|kith|hoodie|jacket|tee)\b/i.test(
      lower
    )
  ) {
    return "sneakers_streetwear";
  }

  // 6. Trading Cards
  if (
    /\b(pokemon|charizard|pikachu|mtg|magic the gathering|yugioh|sports card|psa|bgs|cgc|booster|holographic|tcg)\b/i.test(
      lower
    )
  ) {
    return "trading_cards";
  }

  return "general_resale";
}
