import type { CartItem } from 'src/types/cart';

export function lineSubtotalFromItems(items: CartItem[]): number {
  return items.reduce(
    (sum, item) => sum + (item.unitPrice ?? item.product.pricing.basePrice ?? 0) * item.quantity,
    0
  );
}

function segmentIsRegular(segment: 'NEW' | 'REGULAR' | undefined): boolean {
  if (segment == null) return false;
  return String(segment).trim().toUpperCase() === 'REGULAR';
}

/**
 * Trade cash discount (CD) by payment timeline tier (Necessity policy).
 * CD applies on invoice value before GST.
 * Plan 5 = immediate payment (5%); 1–4 = within 3 / 10 / 20 / 30 (std) days.
 * Mirrors backend `cashDiscountPercentForPlan` (plans 1–5).
 */
export function cashDiscountPercentForPlan(
  plan: number,
  segment: 'NEW' | 'REGULAR' | undefined
): number {
  if (!segmentIsRegular(segment)) return 0;
  switch (plan) {
    case 5: // immediate / pay now
      return 5;
    case 1: // within 3 days
      return 4;
    case 2: // within 10 days
      return 3;
    case 3: // within 20 days
      return 2;
    case 4: // 30 days standard
      return 0;
    default:
      return 0;
  }
}

export function computeCartTotals(
  items: CartItem[],
  promoDiscount: number,
  installmentPlanCount: number,
  segment: 'NEW' | 'REGULAR' | undefined
) {
  const lineSubtotal = lineSubtotalFromItems(items);
  const subAfterPromo = Math.max(0, Number((lineSubtotal - promoDiscount).toFixed(2)));
  const plan = segmentIsRegular(segment)
    ? Math.min(5, Math.max(1, Math.round(installmentPlanCount) || 1))
    : 1;
  const cdPct = cashDiscountPercentForPlan(plan, segment);
  const cashDiscountAmount = Number(((subAfterPromo * cdPct) / 100).toFixed(2));
  const finalSubtotal = Number((subAfterPromo - cashDiscountAmount).toFixed(2));
  const gstAmount = Number((finalSubtotal * 0.18).toFixed(2));
  const grandTotal = Number((finalSubtotal + gstAmount).toFixed(2));
  return {
    lineSubtotal,
    subAfterPromo,
    cashDiscountPercent: cdPct,
    cashDiscountAmount,
    finalSubtotal,
    gstAmount,
    grandTotal,
    plan,
  };
}
