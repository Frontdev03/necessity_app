import { necessityRequest } from './necessity';

export interface ApiCategory {
    _id: string;
    name: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    __v: number;
}

export interface CategoriesResponse {
    success: boolean;
    data: {
        categories: ApiCategory[];
    };
}

export async function getCategories(): Promise<CategoriesResponse> {
    return necessityRequest<CategoriesResponse>('/api/customer/categories', {
        method: 'GET',
    });
}

export interface ProductMediaImage {
    url: string;
    isPrimary: boolean;
    _id: string;
}

export interface ProductMediaVideo {
    url: string;
    isPrimary: boolean;
    _id: string;
}

export interface ProductMedia {
    images: ProductMediaImage[];
    videos: ProductMediaVideo[];
}

export interface ApiProduct {
    _id: string;
    basicInfo: {
        name: string;
        sku: string;
        description: string;
        categoryId: {
            _id: string;
            name: string;
        };
        productType: string;
    };
    status: string;
    pricing: {
        unit: string;
        basePrice: number;
        moq: number;
    };
    inventory: {
        stockQuantity: number;
        stockStatus: string;
        lowStockThreshold: number;
    };
    visibilityControl: {
        visibility: string;
        selectedGroups: string[];
        selectedCustomers: string[];
    };
    media: ProductMedia;
    specifications: {
        materialTypes: string[];
        dimensions: {
            length: number;
            width: number;
            height: number;
            unit: string;
        };
        weight: {
            value: number;
            unit: string;
        };
    };
    hasVariants: boolean;
    variants?: ApiProductVariant[];
    createdAt: string;
    updatedAt: string;
    __v: number;
}

export interface ApiVariantPriceBreakpoint {
    minQty: number;
    maxQty: number | null;
    unitPrice: number;
    pricingTierId?: string | null;
}

export interface ApiProductVariant {
    _id: string;
    skuCode: string;
    attributes?: Record<string, string | number>;
    uom: string;
    basePrice: number;
    moq: number;
    isActive: boolean;
    volumePricing?: {
        appliedLadder: 'CUSTOMER_GROUP' | 'DEFAULT' | 'NONE';
        customerGroupKey: string | null;
        referenceUnitPrice: number;
        priceBreakpoints: ApiVariantPriceBreakpoint[];
    };
}

export interface ProductsResponse {
    success: boolean;
    data: {
        products: ApiProduct[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    };
}

export interface GetProductsParams {
    categoryId?: string;
    search?: string;
    minPrice?: string | number;
    maxPrice?: string | number;
    page?: number;
    limit?: number;
    order?: string;
}

export async function getProducts(params?: GetProductsParams): Promise<ProductsResponse> {
    const queryParams = new URLSearchParams();

    if (params) {
        if (params.categoryId) queryParams.append('categoryId', params.categoryId);
        if (params.search !== undefined) queryParams.append('search', params.search);
        if (params.minPrice !== undefined) queryParams.append('minPrice', String(params.minPrice));
        if (params.maxPrice !== undefined) queryParams.append('maxPrice', String(params.maxPrice));
        if (params.page !== undefined) queryParams.append('page', String(params.page));
        if (params.limit !== undefined) queryParams.append('limit', String(params.limit));
        if (params.order) queryParams.append('order', params.order);
    }

    const queryString = queryParams.toString();
    const url = '/api/customer/products' + (queryString ? '?' + queryString : '');

    return necessityRequest<ProductsResponse>(url, {
        method: 'GET',
    });
}

export interface ProductDetailResponse {
    success: boolean;
    data: ApiProduct & {
        variants?: ApiProductVariant[];
        calculatedPrice?: {
            unitPrice: number;
            totalPrice: number;
            pricingSource: string;
            appliedSlab?: string | null;
            pricingTierId?: string | null;
        };
    };
}

export interface GetProductDetailParams {
    variantId?: string;
    quantity?: number;
}

export async function getProductDetail(productId: string, params?: GetProductDetailParams): Promise<ProductDetailResponse> {
    const queryParams = new URLSearchParams();

    if (params) {
        if (params.variantId) queryParams.append('variantId', params.variantId);
        if (params.quantity !== undefined) queryParams.append('quantity', String(params.quantity));
    }

    const queryString = queryParams.toString();
    const url = '/api/customer/products/' + productId + (queryString ? '?' + queryString : '');

    return necessityRequest<ProductDetailResponse>(url, {
        method: 'GET',
    });
}

export async function calculateCustomerVariantPrice(data: {
    variantId: string;
    quantity: number;
}): Promise<{
    success: boolean;
    data?: {
        unitPrice: number;
        totalPrice: number;
        pricingSource: string;
        appliedSlab?: string | null;
        pricingTierId?: string | null;
    };
    message?: string;
}> {
    return necessityRequest('/api/customer/pricing/calculate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: data,
    });
}

export interface AddToCartParams {
    productId: string;
    variantId?: string;
    quantity: number;
}

export interface AddToCartResponse {
    success: boolean;
    data?: any;
    message?: string;
}

export async function addToCartApi(data: AddToCartParams): Promise<AddToCartResponse> {
    return necessityRequest<AddToCartResponse>('/api/customer/cart/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: data,
    });
}

// --- Get Cart API ---

export interface CartItemProductImage {
    url: string;
    alt?: string;
}

export interface CartItemProductRef {
    _id: string;
    basicInfo: {
        name: string;
    };
    images?: CartItemProductImage[];
}

export interface CartItemVariantRef {
    _id: string;
    skuCode?: string;
    basePrice: number;
    uom?: string;
    attributes?: Record<string, string>;
}

export interface ApiCartItem {
    _id: string;
    productId: CartItemProductRef;
    variantId: CartItemVariantRef | null;
    quantity: number;
    unitPrice: number;
    pricingSource?: string;
}

export interface GetCartResponse {
    success: boolean;
    data: {
        _id: string;
        customerId: string;
        items: ApiCartItem[];
        createdAt: string;
        updatedAt: string;
        __v: number;
    };
}

export async function getCart(): Promise<GetCartResponse> {
    return necessityRequest<GetCartResponse>('/api/customer/cart', {
        method: 'GET',
    });
}

export interface RemoveFromCartResponse {
    success: boolean;
    message?: string;
}

/** Remove by variant ID – for products that have variants */
export async function removeFromCartApi(variantId: string): Promise<RemoveFromCartResponse> {
    return necessityRequest<RemoveFromCartResponse>(
        `/api/customer/cart/remove/${encodeURIComponent(variantId)}`,
        { method: 'DELETE' }
    );
}

/** Remove by product ID – for simple products (no variants) */
export async function removeProductFromCartApi(productId: string): Promise<RemoveFromCartResponse> {
    return necessityRequest<RemoveFromCartResponse>(
        `/api/customer/cart/remove/product/${encodeURIComponent(productId)}`,
        { method: 'DELETE' }
    );
}

export interface UpdateCartParams {
    variantId?: string;
    productId?: string;
    quantity: number;
}

export async function updateCartApi(data: UpdateCartParams): Promise<AddToCartResponse> {
    return necessityRequest<AddToCartResponse>('/api/customer/cart/update', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: data,
    });
}

export interface PaymentOrderItem {
    productId: string;
    variantId?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    pricingSource?: string;
    priceSnapshot?: {
        basePrice: number;
        finalUnitPrice: number;
        discountPerUnit: number;
        totalDiscount: number;
        taxRate: number;
        pricingSource?: string;
    };
}

export interface CreatePaymentOrderParams {
    customerId: string;
    items: PaymentOrderItem[];
    totalAmount: number;
    paymentMode: 'CREDIT' | 'UPI' | 'BANK' | 'GATEWAY';
}

export interface CreatePaymentOrderResponse {
    success: boolean;
    message?: string;
    data: {
        _id?: string;
        orderId?: string;
        razorpayOrderId?: string;
        amount?: number;
        currency?: string;
    };
}

export async function createPaymentOrderApi(
    data: CreatePaymentOrderParams
): Promise<CreatePaymentOrderResponse> {
    return necessityRequest<CreatePaymentOrderResponse>('/api/orders/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: data,
    });
}

export interface VerifyPaymentParams {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    orderId: string;
}

export async function verifyPaymentApi(
    data: VerifyPaymentParams
): Promise<{ success: boolean; message?: string; data?: any }> {
    return necessityRequest('/api/payments/verify', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: data,
    });
}

export interface CustomerOrderLine {
    _id: string;
    productName?: string;
    quantity: number;
    unitPrice?: number;
    subtotal?: number;
    productId?: { basicInfo?: { name?: string } };
}

export interface CustomerOrder {
    _id: string;
    orderNumber?: string;
    createdAt: string;
    workflowStatus?: string;
    paymentStatus?: string;
    totals?: {
        subtotalAmount?: number;
        taxAmount?: number;
        grandTotal?: number;
    };
    totalAmount?: number;
    items: CustomerOrderLine[];
    customerId?: {
        businessName?: string;
        name?: string;
    };
}

export interface CustomerOrdersResponse {
    success: boolean;
    data: {
        orders: CustomerOrder[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    };
}

export async function getCustomerOrdersApi(
    customerId: string,
    params?: { page?: number; limit?: number; workflowStatus?: string }
): Promise<CustomerOrdersResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.workflowStatus) query.append('workflowStatus', params.workflowStatus);
    const qs = query.toString();
    const url = `/api/customers/${encodeURIComponent(customerId)}/orders${qs ? `?${qs}` : ''}`;
    return necessityRequest<CustomerOrdersResponse>(url, { method: 'GET' });
}

export async function getOrderByIdApi(
    orderId: string
): Promise<{ success: boolean; data: CustomerOrder }> {
    return necessityRequest<{ success: boolean; data: CustomerOrder }>(
        `/api/orders/${encodeURIComponent(orderId)}`,
        { method: 'GET' }
    );
}
