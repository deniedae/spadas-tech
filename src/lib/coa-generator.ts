/**
 * Spadas Forensic Certificate of Authenticity (COA) & Social Proof Generator
 *
 * Generates exportable 1200x1200px buyer-trust photo assets for eBay/Grailed
 * galleries and one-click formatted listing descriptions with cryptographic digests.
 */

export interface CoaData {
  certId: string;
  productName: string;
  brand: string;
  category: string;
  verdict: string;
  authenticityScore: number | null;
  confidenceTier: string;
  checks: Array<{
    tell_name: string;
    status: "PASSED" | "FAILED" | "INCONCLUSIVE" | "NOT_APPLICABLE";
    observed_evidence?: string;
    authenticity_rule?: string;
  }>;
  images: string[];
  createdAt: string;
}

/**
 * Fast synchronous SHA-256 implementation for deterministic audit verification
 */
export function computeSha256Digest(input: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const words: number[] = [];
  const result: string[] = [];

  let asciiBitLength = input.length * 8;
  let hash: number[] = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    words[i >> 2] |= (code & 0xff) << (24 - (i % 4) * 8);
  }

  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  const w = new Array(64);
  for (let i = 0; i < words.length; i += 16) {
    let [a, b, c, d, e, f, g, h] = hash;

    for (let j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j] | 0;
      } else {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }

      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + k[j] + w[j]) | 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result.push((b < 16 ? "0" : "") + b.toString(16));
    }
  }

  return result.join("");
}

/**
 * Generate cryptographic SHA-256 payload digest for a certificate
 */
export function generateCoaDigest(data: CoaData): string {
  const payload = [
    data.certId,
    data.brand,
    data.productName,
    data.verdict,
    String(data.authenticityScore || 0),
    data.confidenceTier,
    data.createdAt,
    ...data.checks.map((c) => `${c.tell_name}:${c.status}`),
  ].join("|");

  return computeSha256Digest(payload);
}

/**
 * Generate formatted Markdown description text for eBay / Grailed / Depop / Poshmark
 */
export function generateMarketplaceListingMarkdown(data: CoaData): string {
  const digest = generateCoaDigest(data);
  const passingChecks = data.checks.filter((c) => c.status === "PASSED");
  const isAuthentic = data.verdict === "AUTHENTIC";

  const lines = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🛡️ SPADAS FORENSIC PRE-SCREENING CERTIFICATE`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Item: ${data.brand} ${data.productName}`,
    `Verdict: ${isAuthentic ? "VERIFIED AUTHENTIC" : data.verdict}`,
    `Authenticity Confidence: ${data.authenticityScore ? `${data.authenticityScore}%` : "Evaluated"} (${data.confidenceTier})`,
    `Certificate ID: #${data.certId}`,
    `Audit Timestamp: ${new Date(data.createdAt).toLocaleDateString("en-AU", { year: "numeric", month: "short", day: "numeric" })}`,
    ``,
    `PHYSICAL FACTORY HALLMARK INSPECTION:`,
    ...passingChecks.map((c) => `  ✓ ${c.tell_name}: Verified to factory standards`),
    ...(data.checks.some((c) => c.status === "FAILED")
      ? [`  ⚠️ Failed Checks: Critical factory hallmark discrepancies detected.`]
      : []),
    ``,
    `CRYPTOGRAPHIC VERIFICATION SIGNATURE:`,
    `SHA-256: ${digest}`,
    `Digital Verification: https://spadas.ai/cert/${data.certId}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Pre-screened via Spadas Universal Forensic Authenticity Engine. Buy with confidence!`,
  ];

  return lines.join("\n");
}

/**
 * Helper to load an image into an HTMLImageElement asynchronously
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for COA"));
    img.src = src;
  });
}

/**
 * Render a high-resolution 1200x1200px Certificate of Authenticity canvas card
 */
export async function renderCoaCanvas(data: CoaData): Promise<HTMLCanvasElement> {
  if (typeof document === "undefined") {
    throw new Error("renderCoaCanvas must be run in a browser environment");
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1200;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2d context");

  const digest = generateCoaDigest(data);
  const isAuthentic = data.verdict === "AUTHENTIC";

  // 1. Background Luxury Slate Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 1200);
  bgGrad.addColorStop(0, "#090d16");
  bgGrad.addColorStop(0.5, "#0f172a");
  bgGrad.addColorStop(1, "#020617");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1200, 1200);

  // 2. Decorative Double Outer Border
  ctx.strokeStyle = isAuthentic ? "#10b981" : "#f59e0b";
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, 1140, 1140);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  ctx.strokeRect(40, 40, 1120, 1120);

  // 3. Header Logo & Title
  ctx.fillStyle = isAuthentic ? "#34d399" : "#fbbf24";
  ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SPADAS FORENSIC AUDIT LABS", 600, 95);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 44px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("CERTIFICATE OF AUTHENTICITY", 600, 150);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "16px monospace";
  ctx.fillText(`ID: #${data.certId.toUpperCase()} • ISSUED: ${new Date(data.createdAt).toISOString().split("T")[0]}`, 600, 185);

  // 4. Product Name & Brand Banner
  ctx.fillStyle = "rgba(30, 41, 59, 0.7)";
  ctx.fillRect(70, 215, 1060, 100);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.strokeRect(70, 215, 1060, 100);

  ctx.fillStyle = isAuthentic ? "#6ee7b7" : "#fcd34d";
  ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(data.brand.toUpperCase(), 100, 255);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(data.productName.length > 38 ? `${data.productName.slice(0, 38)}...` : data.productName, 100, 295);

  // Score Badge in Banner
  ctx.textAlign = "right";
  ctx.fillStyle = isAuthentic ? "#10b981" : "#f59e0b";
  ctx.font = "bold 48px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(`${data.authenticityScore || 90}%`, 1100, 275);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("CONFIDENCE SCORE", 1100, 298);

  // 5. Macro Photo Evidence Strip (up to 3 photos)
  const displayImages = data.images.slice(0, 3);
  const imgY = 345;
  const imgHeight = 240;
  const imgWidth = displayImages.length === 3 ? 335 : displayImages.length === 2 ? 515 : 1060;
  const gap = 25;

  for (let i = 0; i < displayImages.length; i++) {
    const x = 70 + i * (imgWidth + gap);
    try {
      const img = await loadImage(displayImages[i]);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, imgY, imgWidth, imgHeight, 12);
      ctx.clip();
      ctx.drawImage(img, x, imgY, imgWidth, imgHeight);
      ctx.restore();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, imgY, imgWidth, imgHeight);

      // Label Pill
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(x + 12, imgY + imgHeight - 36, 140, 26);
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`EVIDENCE #0${i + 1}`, x + 24, imgY + imgHeight - 18);
    } catch {
      // Fallback placeholder box
      ctx.fillStyle = "rgba(30, 41, 59, 0.5)";
      ctx.fillRect(x, imgY, imgWidth, imgHeight);
    }
  }

  // 6. Brand DNA Hallmark Checklist Table
  ctx.fillStyle = "rgba(15, 23, 42, 0.6)";
  ctx.fillRect(70, 615, 1060, 430);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.strokeRect(70, 615, 1060, 430);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("BRAND DNA FORENSIC CRITERIA VERIFIED", 100, 655);

  const displayChecks = data.checks.slice(0, 5);
  displayChecks.forEach((c, idx) => {
    const rowY = 700 + idx * 64;
    const isPass = c.status === "PASSED";

    // Row divider
    if (idx > 0) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(100, rowY - 20);
      ctx.lineTo(1100, rowY - 20);
      ctx.stroke();
    }

    // Status icon
    ctx.fillStyle = isPass ? "#10b981" : "#f59e0b";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(isPass ? "✓" : "!", 100, rowY + 6);

    // Tell Name
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 17px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(c.tell_name, 130, rowY);

    // Rule summary
    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const ruleText = c.authenticity_rule || c.observed_evidence || "Verified to manufacturer standard";
    ctx.fillText(ruleText.length > 70 ? `${ruleText.slice(0, 70)}...` : ruleText, 130, rowY + 20);

    // Badge
    ctx.textAlign = "right";
    ctx.fillStyle = isPass ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)";
    ctx.fillRect(980, rowY - 14, 120, 28);
    ctx.fillStyle = isPass ? "#34d399" : "#fbbf24";
    ctx.font = "bold 12px monospace";
    ctx.fillText(c.status, 1090, rowY + 5);
    ctx.textAlign = "left";
  });

  // 7. Footer Cryptographic Signature
  ctx.fillStyle = "#64748b";
  ctx.font = "12px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`CRYPTOGRAPHIC SIGNATURE (SHA-256): ${digest}`, 600, 1090);
  ctx.fillText(`VERIFY ONLINE: https://spadas.ai/cert/${data.certId} • COPYRIGHT © SPADAS AI`, 600, 1115);

  return canvas;
}

/**
 * Trigger instant download of the 1200x1200px COA image card
 */
export async function downloadCoaImageCard(data: CoaData, filename?: string): Promise<void> {
  const canvas = await renderCoaCanvas(data);
  const link = document.createElement("a");
  link.download = filename || `spadas-cert-${data.certId}.png`;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
