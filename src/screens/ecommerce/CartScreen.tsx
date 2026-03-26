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
import { updateQuantity, removeItem, setCartFromApi } from 'src/store/cartSlice';
import type { RootState } from 'src/store';
import { getCart, removeFromCartApi, removeProductFromCartApi, updateCartApi } from 'src/services/ecommerceNecessity';
import Toast from 'react-native-toast-message';

export const CartScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const items = useSelector((state: RootState) => state.cart.items);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const loadCart = async () => {
        setLoading(true);
        try {
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
    }, [dispatch])
  );

  const subtotal = items.reduce((sum, item) => sum + (item.unitPrice ?? item.product.pricing.basePrice) * item.quantity, 0);
  const originalSubtotal = items.reduce((sum, item) => sum + item.product.pricing.basePrice * item.quantity, 0);
  const totalDiscount = Math.max(0, originalSubtotal - subtotal);
  const gstAmount = subtotal * 0.18;
  const totalAmount = subtotal + gstAmount;

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
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          {items.map((item) => (
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
                <Text style={styles.itemMeta}>₹{(item.unitPrice ?? item.product.pricing.basePrice).toLocaleString()}/unit</Text>
                {(item.unitPrice ?? item.product.pricing.basePrice) < item.product.pricing.basePrice && (
                  <Text style={styles.itemOriginalPrice}>MRP ₹{item.product.pricing.basePrice.toLocaleString()}</Text>
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
                ₹{((item.unitPrice ?? item.product.pricing.basePrice) * item.quantity).toLocaleString()}
              </Text>
            </View>
          ))}

          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              ₹{subtotal.toLocaleString()}
            </Text>
          </View>
          {totalDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.discountLabel}>Discount</Text>
              <Text style={styles.discountValue}>-₹{totalDiscount.toLocaleString()}</Text>
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

  scrollContent: { padding: spacing.lg, paddingBottom: 140 },

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
    backgroundColor: '#f0f0f0',
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
    backgroundColor: '#f5f7fa',
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
});
