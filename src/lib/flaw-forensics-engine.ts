export type FlawCategory =
  | "stain"
  | "pilling_wear"
  | "tear_hole"
  | "hardware_zipper"
  | "scuff_abrasion"
  | "wash_fade"
  | "odor_sanitizer"
  | "tag_missing";

export type FlawSeverity = "minor" | "moderate" | "significant";

export interface FlawItem {
  id: string;
  category: FlawCategory;
  severity: FlawSeverity;
  location: string;
  notes?: string;
  photoIndex?: number;
}

export interface DisputeProofAppraisal {
  recommendedCondition: string;
  conditionDescriptor: string;
  disputeProofDisclaimer: string;
  ebayInadRiskScore: "LOW" | "MODERATE" | "HIGH";
  flaws: FlawItem[];
}

export const FLAW_CATEGORY_META: Record<
  FlawCategory,
  { label: string; icon: string; defaultLocation: string; hint: string }
> = {
  stain: {
    label: "Stain / Discoloration",
    icon: "💧",
    defaultLocation: "Front lower hem",
    hint: "Faint surface mark, grease spot, or thrift discoloration",
  },
  pilling_wear: {
    label: "Fabric Pilling / Wash Wear",
    icon: "🧶",
    defaultLocation: "Underarms / sleeves",
    hint: "Light surface fuzz, normal thrift wash wear, or friction pilling",
  },
  tear_hole: {
    label: "Snag / Pinhole / Loose Hem",
    icon: "🪡",
    defaultLocation: "Bottom hemline",
    hint: "Small pinhead hole, loose seam thread, or small snag",
  },
  hardware_zipper: {
    label: "Hardware / Zipper / Button",
    icon: "⚙️",
    defaultLocation: "Main zipper / cuffs",
    hint: "Sticky zipper, loose button, or aged brass patina",
  },
  scuff_abrasion: {
    label: "Scuff / Leather Crease",
    icon: "👞",
    defaultLocation: "Toe box / heel counter",
    hint: "Surface rub, leather walking crease, or sole corner wear",
  },
  wash_fade: {
    label: "Vintage Fade / Sun Bleach",
    icon: "☀️",
    defaultLocation: "Shoulders / collar",
    hint: "Desirable vintage patina or gentle wash fade",
  },
  odor_sanitizer: {
    label: "Thrift Sanitizer / Storage Note",
    icon: "🌿",
    defaultLocation: "Fabric overall",
    hint: "Mild thrift laundering scent or vintage storage note",
  },
  tag_missing: {
    label: "Missing / Cut Tag",
    icon: "🏷️",
    defaultLocation: "Inner collar / care tag",
    hint: "Care label faded or brand tag cut/removed",
  },
};

/**
 * Generates an audit-grade, dispute-proof eBay condition description
 * designed to defend the seller against "Item Not As Described" (INAD) returns.
 */
export function generateDisputeProofAppraisal(
  flaws: FlawItem[],
  itemTitle: string = "Pre-Owned Item",
  currentCondition: string = "Used - Good"
): DisputeProofAppraisal {
  if (flaws.length === 0) {
    const descriptor = "Clean pre-owned condition with zero structural holes, stains, or hardware defects. Inspected under studio lighting and ready for wear.";
    const disclaimer = `\n\n--- 🛡️ VERIFIED CONDITION & QUALITY DISCLOSURE ---\n• Condition Grade: Excellent Pre-Owned\n• Physical Inspection: Clean garment with zero holes, stains, odors, or hardware flaws.\n• Buyer Assurance: Sourced, inspected under 5000K studio lighting, and stored in a clean, smoke-free environment. Exact item pictured.`;

    return {
      recommendedCondition: "Pre-owned - Excellent",
      conditionDescriptor: descriptor,
      disputeProofDisclaimer: disclaimer,
      ebayInadRiskScore: "LOW",
      flaws: [],
    };
  }

  // Calculate INAD Risk Score based on severity & count
  const hasSignificant = flaws.some((f) => f.severity === "significant");
  const moderateCount = flaws.filter((f) => f.severity === "moderate").length;

  let riskScore: "LOW" | "MODERATE" | "HIGH" = "LOW";
  let recommendedGrade = "Used - Good";

  if (hasSignificant) {
    riskScore = "HIGH";
    recommendedGrade = "For Parts / Repair";
  } else if (moderateCount >= 2 || flaws.length >= 3) {
    riskScore = "MODERATE";
    recommendedGrade = "Used - Good";
  } else {
    riskScore = "LOW"; // Transparent disclosure drops INAD risk to Low!
    recommendedGrade = "Used - Good";
  }

  // Format concise bulletproof descriptor
  const defectPhrases = flaws.map((f) => {
    const meta = FLAW_CATEGORY_META[f.category];
    const loc = f.location ? `at ${f.location}` : "";
    const photoNote = typeof f.photoIndex === "number" ? ` (Photo #${f.photoIndex + 1})` : "";
    const extra = f.notes ? ` - ${f.notes}` : "";
    return `${f.severity} ${meta.label.toLowerCase()} ${loc}${photoNote}${extra}`.trim();
  });

  const conditionDescriptor = `Pre-owned condition with honest thrift disclosure: ${defectPhrases.join("; ")}. Structurally intact with plenty of life left. Please review photos closely for exact cosmetic details.`;

  // Format comprehensive eBay Description Appendix
  const flawBullets = flaws
    .map((f, i) => {
      const meta = FLAW_CATEGORY_META[f.category];
      const photoRef = typeof f.photoIndex === "number" ? ` (Documented in Photo #${f.photoIndex + 1})` : "";
      return `  ${i + 1}. [${meta.label}] at ${f.location || "item body"}: ${f.notes || `Minor cosmetic ${f.severity} wear.`}${photoRef}`;
    })
    .join("\n");

  const disputeProofDisclaimer = `\n\n--- 🛡️ VERIFIED CONDITION & DEFECT DISCLOSURE (INAD-PROTECTED) ---
• Condition Grade: ${recommendedGrade}
• Detailed Flaw Forensics:
${flawBullets}
• Seller Transparency Notice: All noted micro-flaws are explicitly disclosed and photographed above to ensure complete buyer satisfaction. Items are stored in a climate-controlled, smoke-free space. Returns accepted per store policy.`;

  return {
    recommendedCondition: recommendedGrade,
    conditionDescriptor,
    disputeProofDisclaimer,
    ebayInadRiskScore: riskScore,
    flaws,
  };
}

/**
 * Scans existing title and description for common defect keywords
 * to auto-populate the flaw detector if existing flaws were already noted.
 */
export function detectFlawsFromText(text: string): FlawItem[] {
  const detected: FlawItem[] = [];
  const lower = text.toLowerCase();

  if (/stain|spot|discolor|mark|blemish/i.test(lower)) {
    detected.push({
      id: "flaw-stain-auto",
      category: "stain",
      severity: /faint|tiny|minor|pinhead/i.test(lower) ? "minor" : "moderate",
      location: "Front fabric",
      notes: "Surface mark detected in description",
    });
  }

  if (/pilling|fuzz|lint|wash wear|friction/i.test(lower)) {
    detected.push({
      id: "flaw-pilling-auto",
      category: "pilling_wear",
      severity: "minor",
      location: "Fabric surface",
      notes: "Light wash wear / pilling",
    });
  }

  if (/snag|hole|tear|rip|fray|loose hem/i.test(lower)) {
    detected.push({
      id: "flaw-tear-auto",
      category: "tear_hole",
      severity: /tiny|pinhole|small/i.test(lower) ? "minor" : "moderate",
      location: "Hemline / seam",
      notes: "Pinhole or loose thread",
    });
  }

  if (/scuff|scratch|crease|heel wear|drag/i.test(lower)) {
    detected.push({
      id: "flaw-scuff-auto",
      category: "scuff_abrasion",
      severity: "minor",
      location: "Toe / heel / surface",
      notes: "Cosmetic surface wear",
    });
  }

  if (/zipper|button|snap|tarnish/i.test(lower)) {
    detected.push({
      id: "flaw-hardware-auto",
      category: "hardware_zipper",
      severity: "minor",
      location: "Hardware / closure",
      notes: "Hardware wear or patina",
    });
  }

  return detected;
}
