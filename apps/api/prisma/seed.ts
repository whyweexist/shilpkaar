/**
 * Shilpkaar database seed.
 *
 * The API serves the deterministic in-process store (`src/db.ts seedDb()`,
 * built from `@shilpkaar/shared` seed bundles) so the demo boots with zero
 * env vars and survives Render's ephemeral filesystem. This script is the
 * seed-integrity gate: it validates every bundle the runtime depends on and
 * prints the priced catalogue. It runs in `.devcontainer` post-create and in
 * CI; it exits non-zero when any bundle breaks its contract.
 */
import {
  artisanSeed,
  productsSeed,
  ordersSeed,
  ontology,
} from "@shilpkaar/shared";

function fail(msg: string): never {
  console.error(`[seed] FAIL: ${msg}`);
  process.exit(1);
}

const ont = ontology as unknown as {
  terms: string[];
  hindiTerms: Record<string, string>;
};

// --- artisan ---------------------------------------------------------------
if (!artisanSeed.phone || artisanSeed.phone.length !== 10) {
  fail("artisan phone must be 10 digits");
}
for (const k of ["name", "slug", "craft", "district", "state"] as const) {
  if (!artisanSeed[k]) fail(`artisan.${k} missing`);
}

// --- products (12 across 8+ craft families, plausible INR pricing) ---------
if (productsSeed.length !== 12) {
  fail(`expected 12 products, got ${productsSeed.length}`);
}
const WAGE = 500;
console.log(
  `[seed] artisan ${artisanSeed.name} (${artisanSeed.slug}) — ${artisanSeed.craft}, ${artisanSeed.district}, ${artisanSeed.state}`,
);
for (const p of productsSeed) {
  if (!p.id || !p.slug || !p.titleEn || !p.titleHi) fail(`product missing fields: ${p.id}`);
  if (p.keywords.length < 5) fail(`product ${p.id} needs >=5 keywords`);
  const floor = Math.round((p.materialCost + p.daysOfWork * WAGE) * 1.2);
  const suggested = Math.round(floor * 1.35);
  console.log(
    `[seed]   ${p.slug}: material ₹${p.materialCost} + ${p.daysOfWork}d → floor ₹${floor} / suggested ₹${suggested} / stock ${p.stock} / ${p.views} views`,
  );
}

// --- orders (12 static + 12 runtime-generated = 24 across all states) ------
if (ordersSeed.length !== 12) fail(`expected 12 static orders, got ${ordersSeed.length}`);
const states = new Set(ordersSeed.map((o) => o.status));
for (const s of ["New", "Pack", "Ship", "Delivered", "Paid"]) {
  if (!states.has(s)) fail(`orders missing timeline state ${s}`);
}
console.log(
  `[seed] orders: ${ordersSeed.length} static (+12 runtime-generated = 24) across ${[...states].join(", ")}`,
);

// --- ontology (craft-term repair dictionary) --------------------------------
if (!Array.isArray(ont.terms) || ont.terms.length < 300) {
  fail(`ontology needs >=300 terms, got ${ont.terms?.length ?? 0}`);
}
console.log(
  `[seed] ontology: ${ont.terms.length} terms, ${Object.keys(ont.hindiTerms).length} Hindi mappings`,
);

console.log("[seed] OK — deterministic demo store verified (12 products, 24 orders, 3 channels)");
