import assert from "node:assert";
import { buildOndcCatalog, validateOndc } from "../src/ondcSchema.js";

const cat = buildOndcCatalog({
  id: "prod-1",
  titleEn: "Terracotta Lamp",
  descriptionEn: "Handmade lamp",
  price: 850,
  images: ["https://example.com/i.png"],
});

const v = validateOndc(cat);
assert.strictEqual(v.valid, true, "valid catalog passes");
assert.strictEqual(cat.context.domain, "ONDC:RET10", "beckn domain correct");
assert.strictEqual(cat.context.action, "on_search", "action is on_search");
assert.strictEqual(cat.message.catalog["bpp/providers"].length, 1, "one provider");
assert.strictEqual(
  (cat.message.catalog["bpp/providers"][0] as { items: unknown[] }).items.length,
  1,
  "one item",
);

const bad = {
  context: { domain: "WRONG", action: "on_search", timestamp: "", bpp_id: "" },
  message: { catalog: { "bpp/providers": [] } },
};
const vbad = validateOndc(bad);
assert.strictEqual(vbad.valid, false, "invalid catalog flagged");
assert.ok(vbad.errors.length >= 1, "errors listed");

console.log("[ondcSchema] all ONDC payload tests passed");
