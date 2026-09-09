export interface OndcCatalog {
  context: { domain: string; action: string; timestamp: string; bpp_id: string };
  message: { catalog: { "bpp/providers": Array<unknown> } };
}
export function buildOndcCatalog(product: {
  id: string;
  titleEn: string;
  descriptionEn: string;
  price: number;
  images: string[];
}): OndcCatalog {
  return {
    context: {
      domain: "ONDC:RET10",
      action: "on_search",
      timestamp: new Date().toISOString(),
      bpp_id: "shilpkaar.mock",
    },
    message: {
      catalog: {
        "bpp/providers": [
          {
            id: "shilpkaar-provider",
            items: [
              {
                id: product.id,
                descriptor: {
                  name: product.titleEn,
                  long_desc: product.descriptionEn,
                  images: product.images,
                },
                price: { currency: "INR", value: String(product.price) },
              },
            ],
          },
        ],
      },
    },
  };
}
export function validateOndc(c: OndcCatalog): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!c.context.domain.includes("ONDC")) errors.push("domain must be ONDC:RET10");
  if (!c.message.catalog["bpp/providers"]?.length) errors.push("providers missing");
  return { valid: errors.length === 0, errors };
}
