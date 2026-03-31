import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useDispatch, useSelector } from 'react-redux';
import { colors } from 'src/theme/colors';
import { spacing } from 'src/theme/spacing';
import { fontSize, fontWeight } from 'src/theme/fonts';
import { AppButton } from 'src/components/AppButton';
import { updateQuantity, removeItem, setCartFromApi, setAppliedPromo } from 'src/store/cartSlice';
import { refreshAuthProfileThunk } from 'src/store/authSlice';
import type { RootState } from 'src/store';
import {
  getCart,
  removeFromCartApi,
  removeProductFromCartApi,
  updateCartApi,
  validatePromoApi,
} from 'src/services/ecommerceNecessity';
import Toast from 'react-native-toast-message';
import { AppInput } from 'src/components/AppInput';
import { computeCartTotals, lineSubtotalFromItems } from 'src/utils/checkoutPricing';

export const CartScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const items = useSelector((state: RootState) => state.cart.items);
  const appliedPromo = useSelector((state: RootState) => state.cart.appliedPromo);
  const authUser = useSelector((state: RootState) => state.auth.user);
  const [loading, setLoading] = useState(true);
  const [promoInput, setPromoInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const loadCart = async () => {
        setLoading(true);
        try {
          if (authUser?.role === 'customer') {
            dispatch(refreshAuthProfileThunk()).catch(() => {});
          }
          const res = await getCart();
          if (!cancelled && res.success && res.data?.items) {
            dispatch(setCartFromApi({ items: res.data.items }));
          }
        } catch {
          if (!cancelled) {
            // Keep existing cart state on error
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      loadCart();
      return () => {
        cancelled = true;
      };
    }, [dispatch, authUser?.role])
  );

  const lineSubtotal = lineSubtotalFromItems(items);
  const originalSubtotal = items.reduce(
    (sum, item) => sum + (item.product.pricing.basePrice ?? 0) * item.quantity,
    0
  );
  const totalDiscount = Math.max(0, originalSubtotal - lineSubtotal);
  const promoDiscount = appliedPromo?.discountAmount ?? 0;
  const segment = authUser?.customerSegment;
  const priced = computeCartTotals(items, promoDiscount, 4, segment);
  const { cashDiscountAmount, gstAmount, grandTotal: totalAmount, cashDiscountPercent } = priced;

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleQuantityChange = async (lineId: string, delta: number, productId: string, variantId?: string) => {
    const item = items.find((i) => i.lineId === lineId);
    if (!item || updatingId) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) return;
    setUpdatingId(lineId);
    dispatch(updateQuantity({ lineId, quantity: newQty }));
    try {
      const res = await updateCartApi(
        variantId ? { variantId, quantity: newQty } : { productId, quantity: newQty }
      );
      if (!res.success) {
        dispatch(updateQuantity({ lineId, quantity: item.quantity }));
        Toast.show({
          type: 'error',
          text1: 'Update failed',
          text2: res.message ?? 'Could not update quantity.',
        });
      } else {
        const refreshed = await getCart();
        if (refreshed.success && refreshed.data?.items) {
          dispatch(setCartFromApi({ items: refreshed.data.items }));
        }
      }
    } catch {
      dispatch(updateQuantity({ lineId, quantity: item.quantity }));
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update cart quantity.',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (lineId: string, productId: string, variantId?: string) => {
    if (removingId) return;
    setRemovingId(lineId);
    try {
      const res = variantId
        ? await removeFromCartApi(variantId)
        : await removeProductFromCartApi(productId);
      if (!res.success) {
        Toast.show({
          type: 'error',
          text1: 'Remove failed',
          text2: res.message ?? 'Could not remove item from cart.',
        });
        return;
      }
      dispatch(removeItem(lineId));
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to remove item from cart.',
      });
    } finally {
      setRemovingId(null);
    }
  };

  const handleProceedToCheckout = () => {
    navigation.navigate('Checkout');
  };

  const handleApplyPromo = async () => {
    const code = promoInput.trim();
    if (!code) {
      Toast.show({ type: 'info', text1: 'Enter a promo code' });
      return;
    }
    const sub = lineSubtotalFromItems(items);
    if (sub <= 0) return;
    setPromoLoading(true);
    try {
      const res = await validatePromoApi(code, sub);
      if (!res.success || !res.data) {
        Toast.show({
          type: 'error',
          text1: 'Promo code',
          text2: res.message || 'Could not apply code',
        });
        return;
      }
      dispatch(setAppliedPromo({ code: res.data.code, discountAmount: res.data.discountAmount }));
      Toast.show({ type: 'success', text1: 'Promo applied' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not validate promo';
      Toast.show({ type: 'error', text1: 'Promo code', text2: msg });
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    dispatch(setAppliedPromo(null));
    setPromoInput('');
  };

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.emptySubtext}>Loading cart...</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="shopping-cart" size={64} color={colors.textSecondary} />
        <Text style={styles.emptyText}>Your cart is empty</Text>
        <Text style={styles.emptySubtext}>Add items from the shop to get started</Text>
        <AppButton
          title="Browse Catalog"
          onPress={() => navigation.getParent()?.navigate('Shop')}
          style={styles.browseButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Cart</Text>
        <Text style={styles.headerCount}>{items.length} item{items.length !== 1 ? 's' : ''}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          <Text style={styles.blockSectionTitle}>Promo and savings</Text>
          <View style={styles.promoBlock}>
            <Text style={styles.promoTitle}>Promo code</Text>
            {appliedPromo ? (
              <View style={styles.promoAppliedRow}>
                <Text style={styles.promoAppliedText}>
                  {appliedPromo.code} (−₹{appliedPromo.discountAmount.toLocaleString()})
                </Text>
                <TouchableOpacity onPress={handleRemovePromo}>
                  <Text style={styles.promoRemove}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <AppInput
                  placeholder="Enter code"
                  value={promoInput}
                  onChangeText={setPromoInput}
                  autoCapitalize="characters"
                  containerStyle={styles.promoInputWrap}
                />
                <TouchableOpacity
                  style={[styles.promoApplyBtn, promoLoading && styles.promoApplyDisabled]}
                  onPress={handleApplyPromo}
                  disabled={promoLoading}
                >
                  {promoLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.promoApplyText}>Apply</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
          {segment === 'REGULAR' && (
            <Text style={styles.checkoutHint}>
              You have access to installment payment splits and trade discounts — choose your plan at checkout.
            </Text>
          )}
          <View style={styles.summaryDivider} />

          <Text style={styles.blockSectionTitle}>Items</Text>
          {items.map((item) => {
            const effectiveUnit = item.unitPrice ?? item.product.pricing.basePrice;
            const listBase = item.product.pricing.basePrice;
            return (
            <View
              key={item.lineId}
              style={[
                styles.cartItemRow,
                items.indexOf(item) === items.length - 1
                  ? { borderBottomWidth: 0 }
                  : {},
              ]}
            >
              <Image
                source={{ uri: item.product.media.images[0]?.url || 'https://via.placeholder.com/150' }}
                style={styles.itemImage}
                resizeMode="cover"
              />
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.product.basicInfo.name}
                </Text>
                <Text style={styles.itemMeta}>
                  {effectiveUnit != null ? `₹${effectiveUnit.toLocaleString()}` : '—'}/unit
                </Text>
                {listBase != null &&
                  effectiveUnit != null &&
                  effectiveUnit < listBase && (
                  <Text style={styles.itemOriginalPrice}>MRP ₹{listBase.toLocaleString()}</Text>
                )}
                <View style={styles.qtyRow}>
                  <View style={styles.qtyControls}>
                    <TouchableOpacity
                      style={styles.qtyButton}
                      onPress={() =>
                        handleQuantityChange(item.lineId, -1, item.product._id, item.variantId)
                      }
                      disabled={item.quantity <= item.product.pricing.moq}
                    >
                      <Icon
                        name="minus"
                        size={16}
                        color={
                          item.quantity <= item.product.pricing.moq
                            ? colors.textSecondary
                            : colors.primary
                        }
                      />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyButton}
                      onPress={() => handleQuantityChange(item.lineId, 1, item.product._id, item.variantId)}
                      disabled={item.quantity >= item.product.inventory.stockQuantity}
                    >
                      <Icon
                        name="plus"
                        size={16}
                        color={
                          item.quantity >= item.product.inventory.stockQuantity
                            ? colors.textSecondary
                            : colors.primary
                        }
                      />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemove(item.lineId, item.product._id, item.variantId)}
                    disabled={removingId === item.lineId}
                  >
                    {removingId === item.lineId ? (
                      <ActivityIndicator size="small" color={colors.error} />
                    ) : (
                      <>
                        <Icon name="trash-2" size={18} color={colors.error} />
                        <Text style={styles.removeText}>Remove</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.itemTotal}>
                ₹{((effectiveUnit ?? 0) * item.quantity).toLocaleString()}
              </Text>
            </View>
            );
          })}

          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              ₹{lineSubtotal.toLocaleString()}
            </Text>
          </View>
          {totalDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.discountLabel}>Volume / tier discount</Text>
              <Text style={styles.discountValue}>-₹{totalDiscount.toLocaleString()}</Text>
            </View>
          )}
          {promoDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.discountLabel}>Promo</Text>
              <Text style={styles.discountValue}>-₹{promoDiscount.toLocaleString()}</Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Estimated GST (18%)</Text>
            <Text style={styles.summaryValue}>
              ₹{gstAmount.toLocaleString()}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              ₹{totalAmount.toLocaleString()}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerTotals}>
          <Text style={styles.footerTotalLabel}>Total (Inc. GST)</Text>
          <Text style={styles.footerTotalValue}>
            ₹{totalAmount.toLocaleString()}
          </Text>
        </View>
        <AppButton
          title="Proceed to Checkout"
          onPress={handleProceedToCheckout}
          style={styles.checkoutButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  emptyText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptySubtext: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  browseButton: { minWidth: 200 },

  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  headerCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 4,
  },

  scrollContent: { padding: spacing.lg, paddingBottom: 200 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: 'rgba(0,0,0,0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemDetails: { flex: 1, paddingRight: spacing.sm },
  itemName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 4,
  },
  itemMeta: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.sm },
  itemOriginalPrice: {
    fontSize: 12,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
    marginBottom: spacing.sm,
    marginTop: -8,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  qtyText: {
    minWidth: 32,
    textAlign: 'center',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  removeText: { fontSize: fontSize.xs, color: colors.error, fontWeight: fontWeight.medium },
  itemTotal: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginLeft: spacing.sm,
  },

  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
    borderStyle: 'dashed',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: { fontSize: fontSize.base, color: colors.textSecondary },
  summaryValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  discountLabel: { fontSize: fontSize.base, color: colors.success },
  discountValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  totalValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  footerTotals: { flex: 1, paddingRight: spacing.lg },
  footerTotalLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: fontWeight.bold,
    marginBottom: 2,
  },
  footerTotalValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  checkoutButton: { flex: 1.2, height: 50 },

  blockSectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  promoBlock: {
    marginBottom: spacing.sm,
  },
  promoTitle: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  promoInputWrap: { marginBottom: spacing.sm },
  promoApplyBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'rgba(243, 119, 50, 0.1)',
  },
  promoApplyDisabled: { opacity: 0.6 },
  promoApplyText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  promoAppliedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoAppliedText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  promoRemove: { fontSize: fontSize.sm, color: colors.error, fontWeight: fontWeight.bold },
  checkoutHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
});
