import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useDispatch } from 'react-redux';
import {
    ApiProduct,
    ApiProductVariant,
    calculateCustomerVariantPrice,
    getProductDetail,
    addToCartApi,
} from 'src/services/ecommerceNecessity';
import { colors } from 'src/theme/colors';
import { spacing } from 'src/theme/spacing';
import { fontSize, fontWeight } from 'src/theme/fonts';
import { AppButton } from 'src/components/AppButton';
import { addItem } from 'src/store/cartSlice';
import { getNecessityErrorMessage } from 'src/services/necessity';
import Toast from 'react-native-toast-message';

export const ProductDetailScreen: React.FC = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const dispatch = useDispatch();

    const [product, setProduct] = useState<ApiProduct | null>(route.params?.product || null);
    const [quantity, setQuantity] = useState(product ? product.pricing.moq : 1);
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(route.params?.variantId || null);
    const [loading, setLoading] = useState(!product);
    /** List API does not include variant rows; fetch detail so Add to Cart can run for VARIANT products. */
    const [hydratingVariants, setHydratingVariants] = useState(() => {
        const p = route.params?.product;
        return !!(p?.hasVariants && !(p.variants && p.variants.length > 0));
    });
    const [addingToCart, setAddingToCart] = useState(false);
    const [pricingLoading, setPricingLoading] = useState(false);
    const [liveUnitPrice, setLiveUnitPrice] = useState<number | null>(null);
    const [liveSource, setLiveSource] = useState<string>('');

    /** Avoid repeat GET /detail when variants stay empty after one fetch. */
    const fetchedVariantDetailForIdRef = useRef<string | null>(null);

    React.useEffect(() => {
        if (!product && route.params?.productId) {
            // Fallback: fetch products and find by ID (in case of deep linking, though a direct endpoint would be better)
            const fetchProduct = async () => {
                try {
                    const res = await getProductDetail(route.params.productId);
                    if (res.success && res.data) {
                        setProduct(res.data);
                        const firstVariant = res.data.variants?.[0]?._id || null;
                        const variantToUse = route.params?.variantId || firstVariant;
                        setSelectedVariantId(variantToUse);
                        const moq = variantToUse
                            ? (res.data.variants?.find((v) => v._id === variantToUse)?.moq || res.data.pricing.moq)
                            : res.data.pricing.moq;
                        setQuantity(moq);
                    }
                } catch (err) {
                    console.log('Failed to fetch product details', err);
                } finally {
                    setLoading(false);
                }
            };
            fetchProduct();
        } else {
            setLoading(false);
        }
    }, [route.params?.productId]);

    React.useEffect(() => {
        if (!product?._id || !product.hasVariants) {
            setHydratingVariants(false);
            return;
        }
        if (product.variants && product.variants.length > 0) {
            setHydratingVariants(false);
            fetchedVariantDetailForIdRef.current = product._id;
            return;
        }

        const pid = product._id;
        if (fetchedVariantDetailForIdRef.current === pid) {
            setHydratingVariants(false);
            return;
        }

        fetchedVariantDetailForIdRef.current = pid;
        let cancelled = false;
        setHydratingVariants(true);
        (async () => {
            try {
                const res = await getProductDetail(pid);
                if (cancelled || !res.success || !res.data) return;
                setProduct(res.data);
                const firstId = res.data.variants?.[0]?._id ?? null;
                setSelectedVariantId((prev) => prev ?? route.params?.variantId ?? firstId);
                const vid = route.params?.variantId ?? firstId;
                if (vid) {
                    const moq =
                        res.data.variants?.find((v) => v._id === vid)?.moq ?? res.data.pricing.moq;
                    setQuantity((q) => Math.max(q, moq));
                }
            } catch (err) {
                console.log('Failed to hydrate variants', err);
            } finally {
                if (!cancelled) setHydratingVariants(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [product?._id, product?.hasVariants, product?.variants?.length]);

    const selectedVariant: ApiProductVariant | null = useMemo(() => {
        if (!product?.hasVariants) return null;
        const variants = product.variants || [];
        if (!variants.length) return null;
        const exact = variants.find((v) => v._id === selectedVariantId);
        return exact || variants[0];
    }, [product, selectedVariantId]);

    React.useEffect(() => {
        const run = async () => {
            if (!product?.hasVariants || !selectedVariant?._id) {
                setLiveUnitPrice(null);
                setLiveSource('');
                return;
            }
            setPricingLoading(true);
            try {
                const res = await calculateCustomerVariantPrice({
                    variantId: selectedVariant._id,
                    quantity,
                });
                if (res.success && res.data) {
                    setLiveUnitPrice(res.data.unitPrice);
                    setLiveSource(res.data.pricingSource || '');
                } else {
                    setLiveUnitPrice(null);
                    setLiveSource('');
                }
            } catch {
                setLiveUnitPrice(null);
                setLiveSource('');
            } finally {
                setPricingLoading(false);
            }
        };
        run();
    }, [product?.hasVariants, selectedVariant?._id, quantity]);

    if (loading || !product || hydratingVariants) {
        return (
            <View style={styles.container}>
                <View style={{ marginTop: 100, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ marginTop: 8 }}>Loading...</Text>
                </View>
            </View>
        );
    }

    const effectiveMoq = selectedVariant?.moq || product.pricing.moq;
    const basePrice = selectedVariant?.basePrice ?? product.pricing.basePrice;
    const displayUnitPrice = liveUnitPrice ?? basePrice;
    const maxSelectableStock =
        product.inventory.stockQuantity > 0 ? product.inventory.stockQuantity : Number.MAX_SAFE_INTEGER;

    const handleAddToCart = async () => {
        if (!product) return;
        setAddingToCart(true);

        const payload = {
            productId: product._id,
            variantId: route.params?.variantId,
            quantity,
        };

        console.log('--- ADD TO CART ATTEMPT ---');
        console.log('Sending Payload:', JSON.stringify(payload, null, 2));

        try {
            const res = await addToCartApi({
                productId: product._id,
                variantId: product.hasVariants ? selectedVariant?._id : undefined,
                quantity,
            });

            console.log('--- ADD TO CART RESPONSE ---');
            console.log('Response:', JSON.stringify(res, null, 2));

            if (res.success) {
                dispatch(addItem({ product, quantity, variantId: product.hasVariants ? selectedVariant?._id : undefined }));
                Toast.show({
                    type: 'success',
                    text1: 'Added to Cart',
                    text2: `${quantity} units of ${product.basicInfo.name} added.`,
                });
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Failed to Add',
                    text2: res.message || 'Error occurred while adding to cart.',
                });
            }
        } catch (error: unknown) {
            console.log('--- ADD TO CART ERROR ---');
            console.log('Error object:', error);
            Toast.show({
                type: 'error',
                text1: 'Could not add to cart',
                text2: getNecessityErrorMessage(error),
            });
        } finally {
            setAddingToCart(false);
        }
    };
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.cartButton}>
                    <Icon name="shopping-cart" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <Image source={{ uri: product.media.images[0]?.url || 'https://via.placeholder.com/300' }} style={styles.image} />

                <View style={styles.detailsContainer}>
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{product.basicInfo.categoryId.name}</Text>
                    </View>
                    <Text style={styles.name}>{product.basicInfo.name}</Text>

                    <Text style={styles.description}>{product.basicInfo.description}</Text>

                    <View style={styles.pricingCard}>
                        <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>Wholesale Price</Text>
                            <Text style={styles.priceValue}>₹{displayUnitPrice.toLocaleString()}</Text>
                        </View>
                        {displayUnitPrice < basePrice && (
                            <View style={styles.priceRow}>
                                <Text style={styles.priceLabel}>Base Price</Text>
                                <Text style={[styles.priceValue, styles.retailPrice]}>₹{basePrice.toLocaleString()}</Text>
                            </View>
                        )}
                        <View style={styles.divider} />
                        <Text style={styles.minOrderText}>
                            Minimum Order Quantity: {effectiveMoq} {selectedVariant?.uom || product.pricing.unit}
                        </Text>
                        {pricingLoading ? <Text style={styles.stockText}>Calculating price...</Text> : null}
                        {liveSource ? <Text style={styles.stockText}>Pricing: {liveSource}</Text> : null}
                        <Text style={styles.stockText}>{product.inventory.stockQuantity > 0 ? 'In Stock' : 'Out of Stock'}</Text>
                    </View>

                    {product.hasVariants && (product.variants || []).length > 0 && (
                        <>
                            <Text style={styles.sectionTitle}>Variants</Text>
                            <View style={styles.variantWrap}>
                                {(product.variants || []).map((variant) => {
                                    const active = selectedVariant?._id === variant._id;
                                    return (
                                        <TouchableOpacity
                                            key={variant._id}
                                            style={[styles.variantChip, active && styles.variantChipActive]}
                                            onPress={() => {
                                                setSelectedVariantId(variant._id);
                                                setQuantity(variant.moq || 1);
                                            }}
                                        >
                                            <Text style={[styles.variantChipText, active && styles.variantChipTextActive]}>
                                                {variant.skuCode}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            {!!selectedVariant?.volumePricing?.priceBreakpoints?.length && (
                                <View style={styles.tierCard}>
                                    <Text style={styles.tierTitle}>Pricing Tiers</Text>
                                    {selectedVariant.volumePricing.priceBreakpoints.map((b, idx) => (
                                        <View key={`${idx}-${b.minQty}`} style={styles.tierRow}>
                                            <Text style={styles.tierQty}>
                                                {b.minQty}-{b.maxQty ?? 'above'}
                                            </Text>
                                            <Text style={styles.tierPrice}>₹{b.unitPrice.toLocaleString()}/unit</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </>
                    )}

                    <Text style={styles.sectionTitle}>Specifications</Text>
                    <View style={styles.specsContainer}>
                        <View style={styles.specRow}>
                            <Text style={styles.specKey}>Materials</Text>
                            <Text style={styles.specValue}>{product.specifications.materialTypes.join(', ')}</Text>
                        </View>
                        <View style={styles.specRow}>
                            <Text style={styles.specKey}>Dimensions</Text>
                            <Text style={styles.specValue}>
                                {product.specifications.dimensions.length} x {product.specifications.dimensions.width} x {product.specifications.dimensions.height} {product.specifications.dimensions.unit}
                            </Text>
                        </View>
                        <View style={styles.specRow}>
                            <Text style={styles.specKey}>Weight</Text>
                            <Text style={styles.specValue}>
                                {product.specifications.weight.value} {product.specifications.weight.unit}
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.quantityContainer}>
                    <TouchableOpacity
                        style={styles.qtyButton}
                        onPress={() => setQuantity(Math.max(effectiveMoq, quantity - 1))}
                    >
                        <Icon name="minus" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{quantity}</Text>
                    <TouchableOpacity
                        style={styles.qtyButton}
                        onPress={() => setQuantity(Math.min(maxSelectableStock, quantity + 1))}
                    >
                        <Icon name="plus" size={20} color={colors.primary} />
                    </TouchableOpacity>
                </View>
                <AppButton
                    title={addingToCart ? "Adding..." : "Add to Cart"}
                    onPress={handleAddToCart}
                    style={styles.addButton}
                    disabled={addingToCart || (product.hasVariants && !selectedVariant)}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: 60,
        paddingBottom: spacing.md,
        backgroundColor: colors.surface,
        zIndex: 10,
    },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    cartButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
    scrollContent: { paddingBottom: spacing.xxxl },
    image: { width: '100%', height: 300, backgroundColor: '#f0f0f0' },
    detailsContainer: { padding: spacing.lg },
    categoryBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(22, 62, 109, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginBottom: spacing.sm,
    },
    categoryText: { color: colors.primary, fontSize: 12, fontWeight: 'bold' },
    name: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.md },
    description: { fontSize: fontSize.base, color: colors.textSecondary, lineHeight: 24, marginBottom: spacing.xl },
    pricingCard: {
        backgroundColor: colors.surface,
        padding: spacing.lg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.xl,
    },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
    priceLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
    priceValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.primary },
    retailPrice: { fontSize: fontSize.base, color: colors.textSecondary, textDecorationLine: 'line-through' },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
    minOrderText: { fontSize: fontSize.sm, color: colors.accent, fontWeight: fontWeight.semiBold, marginBottom: 4 },
    stockText: { fontSize: fontSize.sm, color: colors.success, fontWeight: fontWeight.medium },
    sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.md },
    specsContainer: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    specRow: {
        flexDirection: 'row',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    specKey: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
    specValue: { flex: 2, fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.semiBold },
    footer: {
        flexDirection: 'row',
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: 40,
    },
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f7fa',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: spacing.md,
    },
    qtyButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    qtyText: { width: 40, textAlign: 'center', fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
    addButton: { flex: 1 },
    variantWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
    variantChip: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 999,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        backgroundColor: colors.surface,
    },
    variantChipActive: { borderColor: colors.primary, backgroundColor: 'rgba(22, 62, 109, 0.08)' },
    variantChipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
    variantChipTextActive: { color: colors.primary, fontWeight: fontWeight.bold },
    tierCard: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        marginBottom: spacing.xl,
    },
    tierTitle: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.sm },
    tierRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    tierQty: { fontSize: fontSize.sm, color: colors.textSecondary },
    tierPrice: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary },
});
