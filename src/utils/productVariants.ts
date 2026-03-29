import type { ApiProduct } from 'src/services/ecommerceNecessity';

/**
 * True if the catalog item needs a variant selection (or has variant rows).
 * Admin data often sets `basicInfo.productType === 'VARIANT'` without `hasVariants: true`.
 */
export function isVariantProduct(product: ApiProduct | null | undefined): boolean {
  if (!product) return false;
  if (product.hasVariants) return true;
  const pt = product.basicInfo?.productType;
  if (typeof pt === 'string' && pt.toUpperCase() === 'VARIANT') return true;
  if (Array.isArray(product.variants) && product.variants.length > 0) return true;
  return false;
}
