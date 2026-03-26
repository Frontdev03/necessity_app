import { ApiProduct } from 'src/services/ecommerceNecessity';

export interface CartItem {
    lineId: string;
    product: ApiProduct;
    quantity: number;
    unitPrice?: number;
    pricingSource?: string;
    /** Set when loaded from API; used for remove cart API */
    variantId?: string;
}
