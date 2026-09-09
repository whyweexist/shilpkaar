import { ontology } from "@shilpkaar/shared";

type Attrs = Record<string, string | undefined>;

const ont = ontology as unknown as {
  terms: string[];
  categories: { technique: string[]; material: string[]; motif: string[] };
  hindiTerms: Record<string, string>;
};

/** Levenshtein distance. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length,
    n = b.length;
  if (!m || !n) return m || n;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/** Indic-aware Soundex: collapse Devanagari + Latin phonetic families to 4-char codes. */
export function indicSoundex(s: string): string {
  const map: Record<string, string> = {
    क: "1",
    ख: "1",
    ग: "1",
    घ: "1",
    क़: "1",
    च: "2",
    छ: "2",
    ज: "2",
    झ: "2",
    ज़: "2",
    य: "2",
    ट: "3",
    ठ: "3",
    ड: "3",
    ढ: "3",
    ण: "3",
    र: "3",
    ल: "3",
    व: "3",
    त: "4",
    थ: "4",
    द: "4",
    ध: "4",
    न: "4",
    म: "4",
    प: "5",
    फ: "5",
    ब: "5",
    भ: "5",
    " ": "5",
    अ: "6",
    आ: "6",
    इ: "6",
    ई: "6",
    उ: "6",
    ऊ: "6",
    ए: "6",
    ऐ: "6",
    ओ: "6",
    औ: "6",
    श: "7",
    ष: "7",
    स: "7",
    ह: "7",
    a: "6",
    e: "6",
    i: "6",
    o: "6",
    u: "6",
    b: "5",
    f: "5",
    p: "5",
    v: "5",
    c: "2",
    g: "1",
    j: "2",
    k: "1",
    q: "1",
    x: "3",
    z: "2",
    y: "2",
    d: "4",
    t: "4",
    l: "3",
    m: "4",
    n: "4",
    r: "3",
    h: "7",
    s: "7",
    w: "5",
  };
  let out = "";
  let last = "";
  for (const ch of s.toLowerCase()) {
    const code = map[ch];
    if (!code) continue;
    if (code !== last) {
      out += code;
      last = code;
    }
    if (out.length >= 4) break;
  }
  return (out + "000").slice(0, 4);
}

/** Post-ASR repair: ontology fuzzy match (Levenshtein + phonetic). Logs repairs for demo. */
export function fuzzyRepairTokens(text: string): {
  repaired: string;
  repairs: Array<{ from: string; to: string }>;
} {
  const tokens = text.split(/\s+/);
  const repairs: Array<{ from: string; to: string }> = [];
  const seen = new Set<string>();
  const out = tokens.map((rawTok) => {
    const tok = rawTok.toLowerCase().replace(/[।,.!?;:"']/g, "");
    if (!tok || tok.length < 3 || seen.has(tok)) return rawTok;
    // Hindi term direct map first
    if (ont.hindiTerms[tok]) {
      const to = ont.hindiTerms[tok];
      seen.add(tok);
      repairs.push({ from: tok, to });
      return to;
    }
    if (ont.terms.includes(tok)) {
      seen.add(tok);
      return tok;
    }
    // Levenshtein ≤ 2 (or ≤3 for long tokens)
    let best: string | null = null;
    let bestScore = Infinity;
    for (const term of ont.terms) {
      const d = levenshtein(tok, term);
      const cap = tok.length > 7 ? 3 : 2;
      if (d <= cap && d < bestScore) {
        bestScore = d;
        best = term;
      }
    }
    if (!best) {
      // phonetic match
      const tokCode = indicSoundex(tok);
      for (const term of ont.terms) {
        if (indicSoundex(term) === tokCode && Math.abs(term.length - tok.length) <= 3) {
          best = term;
          break;
        }
      }
    }
    if (best) {
      seen.add(tok);
      repairs.push({ from: tok, to: best });
      return best;
    }
    return rawTok;
  });
  return { repaired: out.join(" "), repairs };
}

const COLOURS = [
  "लाल",
  "नीला",
  "हरा",
  "पीला",
  "काला",
  "सफेद",
  "मैरून",
  "सुनहरा",
  "गुलाबी",
  "red",
  "blue",
  "green",
  "yellow",
  "black",
  "white",
  "terracotta",
  "indigo",
  "maroon",
  "natural",
  "mustard",
  "pink",
];

export function extractAttributes(text: string): Attrs {
  const lower = text.toLowerCase();
  const attrs: Attrs = {};
  for (const v of ont.categories.technique)
    if (lower.includes(v)) {
      attrs.technique = v;
      break;
    }
  for (const v of ont.categories.material)
    if (lower.includes(v)) {
      attrs.material = v;
      break;
    }
  for (const v of ont.categories.motif)
    if (lower.includes(v)) {
      attrs.motif = v;
      break;
    }
  for (const c of COLOURS)
    if (lower.includes(c.toLowerCase())) {
      attrs.colour = c;
      break;
    }
  const dims = text.match(/(\d+(\.\d+)?)\s*(फुट|inch|इंच|inches|cm|सेमी|मीटर|meters|feet|ft)\b/i);
  if (dims) attrs.dimensions = dims[0];
  const region = text.match(
    /(मध्य प्रदेश|राजस्थान|गुजरात|बंगाल|बिहार|उत्तर प्रदेश|कर्नाटक|तमिलनाडु|केरल|ओडिशा|असम|मध्यप्रदेश|Madhya Pradesh|Rajasthan|Gujarat|Bengal|Bihar|Karnataka|Odisha)/i,
  );
  if (region) attrs.region = region[0];
  if (/देखभाल|care|धोने|wash/i.test(text)) attrs.care = "Hand wash, shade dry";
  return attrs;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Deterministic ontology-driven copy generator (used when no ANTHROPIC_API_KEY). */
export function generateCopy(
  attrs: Attrs,
  repairedText: string,
): {
  titleEn: string;
  titleHi: string;
  bullets: string[];
  descriptionEn: string;
  descriptionHi: string;
  keywords: string[];
} {
  const technique = attrs.technique ?? "handmade";
  const material = attrs.material ?? "cotton";
  const colour = attrs.colour ?? "natural";
  const motif = attrs.motif ? ` with ${attrs.motif} motif` : "";
  const region = attrs.region ?? "India";
  const titleEn = `${capitalize(technique)} ${capitalize(material)} — Handmade${motif}`.slice(
    0,
    80,
  );
  const titleHi =
    `${capitalize(technique)} ${material} — हस्तनिर्मित${motif ? `, ${attrs.motif} मोटिफ़` : ""}`.slice(
      0,
      80,
    );
  const bullets = [
    `Handcrafted using ${technique} technique`,
    `Made of ${material}${colour !== "natural" ? `, ${colour} in tone` : ""}`,
    `From ${region}, made in small artisan batches`,
    attrs.dimensions ? `Size: ${attrs.dimensions}` : `Slight variations make each piece unique`,
    `Care: hand wash in cold water, dry in shade`,
  ];
  const descriptionEn = `${repairedText}. This ${colour} ${material} piece is made by hand using traditional ${technique} methods${motif}. Each item is unique — minor variations are the signature of the maker, not defects. Direct from the artisan cluster in ${region}.`;
  const descriptionHi = `${repairedText}। यह ${colour} रंग का ${material} उत्पाद पारंपरिक ${technique} विधि से हाथ से बनाया गया है${motif ? `, ${attrs.motif} मोटिफ़ के साथ` : ""}। हर तक अलग है — यही कारीगर की पहचान है। ${region} से सीधे आपके घर।`;
  const kw = new Set<string>([
    technique,
    material,
    colour,
    ...(attrs.motif ? [attrs.motif] : []),
    ...(attrs.region ? [attrs.region] : []),
    "handmade",
    "handcrafted",
    "indian",
    "artisan",
    "traditional",
    "authentic",
  ]);
  return {
    titleEn,
    titleHi,
    bullets,
    descriptionEn,
    descriptionHi,
    keywords: [...kw].slice(0, 18),
  };
}

/** Claim gate: never emit restricted claims unless profile supports them. */
export function gateClaims(
  text: string,
  profileVerified: boolean,
): { text: string; hedged: string[] } {
  const restricted = ["GI-tagged", "GI tagged", "pure silk", "organic", "natural dye"];
  const hedged: string[] = [];
  let out = text;
  for (const term of restricted) {
    const re = new RegExp(term, "gi");
    if (re.test(out) && !profileVerified) {
      out = out.replace(
        re,
        term === "pure silk"
          ? "silk-blend as described by the maker"
          : term === "organic"
            ? "natural materials as described by the maker"
            : `${term} (pending verification)`,
      );
      hedged.push(term);
    }
  }
  return { text: out, hedged };
}
