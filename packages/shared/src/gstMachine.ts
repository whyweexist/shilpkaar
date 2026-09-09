export type GstMode = "NONE" | "ENROLMENT" | "GSTIN";

export interface GstContext {
  intraStateOnly: boolean;
  annualTurnover: number;
  wantsInterState: boolean;
  state: string;
}

const SPECIAL_STATES = new Set([
  "Arunachal Pradesh",
  "Assam",
  "Jammu and Kashmir",
  "Ladakh",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Sikkim",
  "Tripura",
  "Himachal Pradesh",
  "Uttarakhand",
]);

export function gstThresholdFor(state: string): number {
  return SPECIAL_STATES.has(state) ? 20_00000 : 40_00000;
}

export function canPublishInterState(mode: GstMode): boolean {
  return mode === "GSTIN";
}

export function gstAlert(ctx: GstContext): string | null {
  const threshold = gstThresholdFor(ctx.state);
  if (ctx.annualTurnover >= threshold) return "सीमा पार — GST पंजीकरण आवश्यक।";
  if (ctx.annualTurnover >= threshold * 0.85)
    return `आप ₹${(threshold / 100000).toFixed(0)} लाख की सीमा के करीब हैं — GST पंजीकरण पर विचार करें।`;
  return null;
}

export interface GstTransitionResult {
  allowed: boolean;
  reason: string;
  reasonHi: string;
}

/**
 * GST compliance state machine.
 * States: NONE -> ENROLMENT -> GSTIN.
 * - Inter-state selling intent while unregistered (NONE or ENROLMENT) is a HARD BLOCK.
 * - Unregistered + intra-state + under threshold may take the Enrolment path
 *   (channels restricted to same-state fulfilment).
 */
export function gstTransition(
  current: GstMode,
  target: GstMode,
  ctx: GstContext,
): GstTransitionResult {
  if (current === target) return { allowed: true, reason: "No change", reasonHi: "कोई बदलाव नहीं" };

  // HARD BLOCK: inter-state intent while not GSTIN-registered
  if (ctx.wantsInterState && target !== "GSTIN" && current !== "GSTIN") {
    return {
      allowed: false,
      reason: "Inter-state selling requires GSTIN registration (hard block)",
      reasonHi: "दूसरे राज्य में बेचने के लिए GSTIN ज़रूरी है — पहले पंजीकरण पूरा करें",
    };
  }

  // voluntary dereg not a machine path
  if (target === "NONE") {
    return {
      allowed: false,
      reason: "Deregistration not supported via this flow",
      reasonHi: "इस प्रक्रिया से डि-रजिस्ट्रेशन नहीं होता",
    };
  }

  // NONE -> ENROLMENT: allowed only intra-state while unregistered
  if (current === "NONE" && target === "ENROLMENT") {
    if (!ctx.intraStateOnly && ctx.wantsInterState) {
      return {
        allowed: false,
        reason: "Inter-state intent requires GSTIN, not enrolment",
        reasonHi: "अंतर-राज्य बिक्री के लिए नामांकन काफ़ी नहीं — GSTIN चाहिए",
      };
    }
    return {
      allowed: true,
      reason: "Enrolment path (same-state fulfilment only)",
      reasonHi: "नामांकन मार्ग — सिर्फ़ अपने राज्य में बिक्री",
    };
  }

  if (current === "ENROLMENT" && target === "GSTIN") {
    return { allowed: true, reason: "Upgrade to GSTIN", reasonHi: "GSTIN में अपग्रेड" };
  }

  if (current === "NONE" && target === "GSTIN") {
    return { allowed: true, reason: "Direct GSTIN registration", reasonHi: "सीधा GSTIN पंजीकरण" };
  }

  return { allowed: false, reason: "Invalid transition", reasonHi: "अमान्य परिवर्तन" };
}
