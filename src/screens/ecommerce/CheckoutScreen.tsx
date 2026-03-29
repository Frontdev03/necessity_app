import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Icon from 'react-native-vector-icons/Feather';
import { useDispatch, useSelector } from 'react-redux';
import { colors } from 'src/theme/colors';
import { spacing } from 'src/theme/spacing';
import { fontSize, fontWeight } from 'src/theme/fonts';
import { AppInput } from 'src/components/AppInput';
import { AppButton } from 'src/components/AppButton';
import { clearCart } from 'src/store/cartSlice';
import type { RootState } from 'src/store';
import Toast from 'react-native-toast-message';
import RazorpayCheckout from 'react-native-razorpay';
import { RAZORPAY_KEY_ID } from 'src/config/necessity';
import {
  createPaymentOrderApi,
  removeFromCartApi,
  removeProductFromCartApi,
  verifyPaymentApi,
} from 'src/services/ecommerceNecessity';

const checkoutSchema = yup.object().shape({
  companyName: yup.string().required('Company Name is required'),
  gstin: yup
    .string()
    .required('GSTIN is required')
    .matches(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      'Invalid GSTIN format'
    ),
  contactName: yup.string().required('Contact Person is required'),
  contactPhone: yup
    .string()
    .required('Contact Number is required')
    .matches(/^[6-9]\d{9}$/, 'Invalid mobile number'),
  email: yup.string().email('Invalid email').required('Email is required'),

  buildingArea: yup
    .string()
    .required('Flat, House no., Building, Company is required'),
  street: yup
    .string()
    .required('Area, Street, Sector, Village is required'),
  landmark: yup.string().optional().default(''),
  pincode: yup
    .string()
    .required('Pincode is required')
    .matches(/^[1-9][0-9]{5}$/, 'Invalid Indian Pincode'),
  city: yup.string().required('City is required'),
  state: yup.string().required('State is required'),
});

type CheckoutFormData = yup.InferType<typeof checkoutSchema>;

export const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const items = useSelector((state: RootState) => state.cart.items);
  const authUser = useSelector((state: RootState) => state.auth.user);
  const [submitting, setSubmitting] = React.useState(false);
  const [paymentMode, setPaymentMode] = React.useState<'CREDIT' | 'BANK' | 'GATEWAY'>('GATEWAY');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: yupResolver(checkoutSchema),
    defaultValues: {
      companyName: 'B2B Partners Ltd.',
      gstin: '07AAICA1234A1Z5',
      contactName: '',
      contactPhone: '',
      email: '',
      buildingArea: '',
      street: '',
      landmark: '',
      pincode: '',
      city: '',
      state: '',
    },
  });

  const subtotal = items.reduce(
    (sum, item) => sum + (item.unitPrice ?? item.product.pricing.basePrice ?? 0) * item.quantity,
    0
  );
  const originalSubtotal = items.reduce(
    (sum, item) => sum + (item.product.pricing.basePrice ?? 0) * item.quantity,
    0
  );
  const totalDiscount = Math.max(0, originalSubtotal - subtotal);
  const gstAmount = subtotal * 0.18;
  const totalAmount = subtotal + gstAmount;

  const clearServerCart = async () => {
    for (const item of items) {
      if (item.variantId) {
        await removeFromCartApi(item.variantId);
      } else {
        await removeProductFromCartApi(item.product._id);
      }
    }
  };

  const onSubmit = async (data: CheckoutFormData) => {
    if (!authUser?.roleId) {
      Toast.show({ type: 'error', text1: 'Session issue', text2: 'Please login again.' });
      return;
    }
    setSubmitting(true);
    try {
      const orderPayloadItems = items.map((item) => {
        const unitPrice = item.unitPrice ?? item.product.pricing.basePrice ?? 0;
        const basePrice = item.product.pricing.basePrice ?? 0;
        const discountPerUnit = Math.max(0, basePrice - unitPrice);
        return {
          productId: item.product._id,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice,
          subtotal: Number((unitPrice * item.quantity).toFixed(2)),
          pricingSource: item.pricingSource,
          priceSnapshot: {
            basePrice,
            finalUnitPrice: unitPrice,
            discountPerUnit,
            totalDiscount: Number((discountPerUnit * item.quantity).toFixed(2)),
            taxRate: 18,
            pricingSource: item.pricingSource,
          },
        };
      });

      const createOrderRes = await createPaymentOrderApi({
        customerId: authUser.roleId,
        items: orderPayloadItems,
        totalAmount: Number(totalAmount.toFixed(2)),
        paymentMode,
      });

      if (!createOrderRes.success) {
        throw new Error(createOrderRes.message || 'Failed to place order');
      }

      const internalOrderId = createOrderRes.data?.orderId || createOrderRes.data?._id;
      if (!internalOrderId) {
        throw new Error('Order ID missing from response');
      }

      if (paymentMode === 'GATEWAY') {
        const razorpayOrderId = createOrderRes.data?.razorpayOrderId;
        if (!razorpayOrderId || !createOrderRes.data?.amount) {
          throw new Error('Payment details missing for Razorpay.');
        }
        const paymentResult: any = await RazorpayCheckout.open({
          key: RAZORPAY_KEY_ID,
          amount: createOrderRes.data.amount,
          currency: createOrderRes.data.currency || 'INR',
          order_id: razorpayOrderId,
          name: data.companyName,
          description: `Order payment for ${data.companyName}`,
          prefill: {
            name: data.contactName,
            email: data.email,
            contact: data.contactPhone,
          },
          theme: { color: colors.primary },
        });

        await verifyPaymentApi({
          razorpay_order_id: paymentResult.razorpay_order_id,
          razorpay_payment_id: paymentResult.razorpay_payment_id,
          razorpay_signature: paymentResult.razorpay_signature,
          orderId: internalOrderId,
        });
      }

      await clearServerCart();
      dispatch(clearCart());
      Toast.show({
        type: 'success',
        text1: 'Order placed',
        text2: `Order created successfully for ${data.companyName}`,
      });
      navigation.getParent()?.navigate('Orders');
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Checkout failed',
        text2: error?.message || 'Could not complete checkout.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="shopping-bag" size={64} color={colors.textSecondary} />
        <Text style={styles.emptyText}>Your cart is empty</Text>
        <AppButton
          title="Back to Cart"
          onPress={() => navigation.goBack()}
          style={styles.browseButton}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.sectionHeader}>
          <Icon name="file-text" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Order Summary</Text>
        </View>
        <View style={styles.card}>
          {items.map((item) => {
            const effectiveUnit = item.unitPrice ?? item.product.pricing.basePrice;
            return (
            <View key={item.lineId} style={styles.summaryRow}>
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
                  Qty: {item.quantity} •{' '}
                  {effectiveUnit != null ? `₹${effectiveUnit.toLocaleString()}` : '—'}/unit
                </Text>
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
            <Text style={styles.summaryValue}>₹{subtotal.toLocaleString()}</Text>
          </View>
          {totalDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.discountLabel}>Discount</Text>
              <Text style={styles.discountValue}>-₹{totalDiscount.toLocaleString()}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Estimated GST (18%)</Text>
            <Text style={styles.summaryValue}>₹{gstAmount.toLocaleString()}</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{totalAmount.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Icon name="briefcase" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Business Details</Text>
        </View>
        <View style={[styles.card, styles.formCard]}>
          <Text style={styles.inputLabel}>Payment Method</Text>
          <View style={styles.paymentModeRow}>
            <TouchableOpacity
              style={[styles.paymentModeChip, paymentMode === 'GATEWAY' && styles.paymentModeChipActive]}
              onPress={() => setPaymentMode('GATEWAY')}
            >
              <Text style={[styles.paymentModeText, paymentMode === 'GATEWAY' && styles.paymentModeTextActive]}>
                Online (Razorpay)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.paymentModeChip, paymentMode === 'CREDIT' && styles.paymentModeChipActive]}
              onPress={() => setPaymentMode('CREDIT')}
            >
              <Text style={[styles.paymentModeText, paymentMode === 'CREDIT' && styles.paymentModeTextActive]}>
                Credit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.paymentModeChip, paymentMode === 'BANK' && styles.paymentModeChipActive]}
              onPress={() => setPaymentMode('BANK')}
            >
              <Text style={[styles.paymentModeText, paymentMode === 'BANK' && styles.paymentModeTextActive]}>
                Bank Transfer
              </Text>
            </TouchableOpacity>
          </View>
          <Controller
            control={control}
            name="companyName"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Company Name"
                placeholder="Registered Business Name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.companyName?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="gstin"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="GSTIN Number"
                placeholder="E.g. 07AAICA1234A1Z5"
                value={value}
                onChangeText={(val) => onChange(val.toUpperCase())}
                onBlur={onBlur}
                error={errors.gstin?.message}
                autoCapitalize="characters"
              />
            )}
          />
          <View style={styles.row}>
            <View style={styles.flexHalf}>
              <Controller
                control={control}
                name="contactName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    label="Contact Person"
                    placeholder="Full Name"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.contactName?.message}
                  />
                )}
              />
            </View>
            <View style={styles.spacing} />
            <View style={styles.flexHalf}>
              <Controller
                control={control}
                name="contactPhone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    label="Contact Number"
                    placeholder="10-digit mobile"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.contactPhone?.message}
                    keyboardType="phone-pad"
                  />
                )}
              />
            </View>
          </View>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Email Address"
                placeholder="billing@company.com"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Icon name="map-pin" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Shipping Address</Text>
        </View>
        <View style={[styles.card, styles.formCard]}>
          <Controller
            control={control}
            name="buildingArea"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Flat, House no., Building, Company"
                placeholder="E.g. Phase 2, Industrial Area"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.buildingArea?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="street"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Area, Street, Sector, Village"
                placeholder="E.g. Outer Ring Road"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.street?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="landmark"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Landmark (Optional)"
                placeholder="E.g. Near Metro Station"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.landmark?.message}
              />
            )}
          />
          <View style={styles.row}>
            <View style={styles.flexHalf}>
              <Controller
                control={control}
                name="pincode"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    label="Pincode"
                    placeholder="6 digits"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.pincode?.message}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                )}
              />
            </View>
            <View style={styles.spacing} />
            <View style={styles.flexHalf}>
              <Controller
                control={control}
                name="city"
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppInput
                    label="Town/City"
                    placeholder="E.g. Mumbai"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.city?.message}
                  />
                )}
              />
            </View>
          </View>
          <Controller
            control={control}
            name="state"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="State/Province"
                placeholder="E.g. Maharashtra"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.state?.message}
              />
            )}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerTotals}>
          <Text style={styles.footerTotalLabel}>Total Amount (Inc. GST)</Text>
          <Text style={styles.footerTotalValue}>
            ₹{totalAmount.toLocaleString()}
          </Text>
        </View>
        <AppButton
          title={paymentMode === 'GATEWAY' ? 'Confirm & Pay' : 'Place Order'}
          onPress={handleSubmit(onSubmit)}
          style={styles.checkoutButton}
          loading={submitting}
          disabled={submitting}
        />
      </View>
    </KeyboardAvoidingView>
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
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  browseButton: { minWidth: 200 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { marginRight: spacing.md },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },

  scrollContent: { padding: spacing.lg, paddingBottom: 120 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    shadowColor: 'rgba(0,0,0,0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  formCard: { padding: spacing.lg, paddingTop: spacing.xl },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemDetails: { flex: 1 },
  itemName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 4,
  },
  itemMeta: { fontSize: 13, color: colors.textSecondary },
  itemTotal: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },

  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
    borderStyle: 'dashed',
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
  inputLabel: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  paymentModeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  paymentModeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  paymentModeChipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(230, 126, 34, 0.1)',
  },
  paymentModeText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  paymentModeTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
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

  row: { flexDirection: 'row', alignItems: 'flex-start' },
  flexHalf: { flex: 1 },
  spacing: { width: spacing.md },

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
