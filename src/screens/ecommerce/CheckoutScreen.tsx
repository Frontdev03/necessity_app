import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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
import { refreshAuthProfileThunk } from 'src/store/authSlice';
import type { RootState } from 'src/store';
import Toast from 'react-native-toast-message';
import {
  createPaymentOrderApi,
  removeFromCartApi,
  removeProductFromCartApi,
  verifyPaymentApi,
} from 'src/services/ecommerceNecessity';
import { computeCartTotals, lineSubtotalFromItems } from 'src/utils/checkoutPricing';
import RazorpayCheckout from 'react-native-razorpay';
import { RAZORPAY_KEY_ID } from 'src/config/necessity';

/** Regular trade: payment timeline → CD on pre-GST taxable value (Trade Discount & Payment Terms). */
const PAYMENT_TIMELINE_OPTIONS = [
  {
    plan: 5 as const,
    label: 'Immediate payment',
    sub: '5% cash discount (CD) — pay now; funds received same day',
  },
  {
    plan: 1 as const,
    label: 'Within 3 days',
    sub: '4% cash discount (CD) — funds received in company account within 3 days',
  },
  {
    plan: 2 as const,
    label: 'Within 10 days',
    sub: '3% cash discount (CD) — payment within 10 days of invoice',
  },
  {
    plan: 3 as const,
    label: 'Within 20 days',
    sub: '2% cash discount (CD) — payment within 20 days of invoice',
  },
  {
    plan: 4 as const,
    label: '30 days (standard term)',
    sub: 'No cash discount — standard credit term',
  },
] as const;

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
  const appliedPromo = useSelector((state: RootState) => state.cart.appliedPromo);
  const authUser = useSelector((state: RootState) => state.auth.user);
  const [submitting, setSubmitting] = useState(false);
  const [paymentTimelinePlan, setPaymentTimelinePlan] = useState(4);
  const [planPickerOpen, setPlanPickerOpen] = useState(false);
  const [paySchedule, setPaySchedule] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [initialPaymentStr, setInitialPaymentStr] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CREDIT' | 'GATEWAY'>('GATEWAY');

  useFocusEffect(
    useCallback(() => {
      if (authUser?.role === 'customer') {
        dispatch(refreshAuthProfileThunk()).catch(() => {});
      }
    }, [dispatch, authUser?.role])
  );

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

  const lineSubtotal = lineSubtotalFromItems(items);
  const originalSubtotal = items.reduce(
    (sum, item) => sum + (item.product.pricing.basePrice ?? 0) * item.quantity,
    0
  );
  const totalDiscount = Math.max(0, originalSubtotal - lineSubtotal);
  const promoDiscount = appliedPromo?.discountAmount ?? 0;
  const segmentRaw = authUser?.customerSegment;
  const segment: 'NEW' | 'REGULAR' | undefined =
    typeof segmentRaw === 'string'
      ? segmentRaw.trim().toUpperCase() === 'REGULAR'
        ? 'REGULAR'
        : segmentRaw.trim().toUpperCase() === 'NEW'
          ? 'NEW'
          : undefined
      : undefined;
  const allowPartial = authUser?.allowPartialPayment === true;
  const selectedTimelineOption =
    PAYMENT_TIMELINE_OPTIONS.find((o) => o.plan === paymentTimelinePlan) ??
    PAYMENT_TIMELINE_OPTIONS[4];
  const priced = computeCartTotals(items, promoDiscount, paymentTimelinePlan, segment);
  const { cashDiscountAmount, gstAmount, grandTotal: totalAmount, cashDiscountPercent } = priced;

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

      const pricedSubmit = computeCartTotals(items, promoDiscount, paymentTimelinePlan, segment);
      const grandTotal = Number(pricedSubmit.grandTotal.toFixed(2));

      let initialPay: number | undefined;
      if (paySchedule === 'PARTIAL' && allowPartial) {
        const raw = parseFloat(initialPaymentStr.replace(/,/g, ''));
        if (!Number.isFinite(raw) || raw <= 0 || raw >= grandTotal - 0.005) {
          throw new Error('Enter an initial payment greater than zero and less than order total.');
        }
        initialPay = Number(raw.toFixed(2));
      }

      const createOrderRes = await createPaymentOrderApi({
        customerId: authUser.roleId || authUser.id,
        items: orderPayloadItems,
        totalAmount: grandTotal,
        paymentMode: paymentMode,
        promoCode: appliedPromo?.code,
        installmentPlanCount: pricedSubmit.plan,
        ...(paySchedule === 'PARTIAL' && allowPartial && initialPay != null
          ? {
              paymentSchedule: 'PARTIAL' as const,
              initialPaymentAmount: initialPay,
            }
          : { paymentSchedule: 'FULL' as const }),
      });

      if (!createOrderRes.success) {
        throw new Error(createOrderRes.message || 'Failed to place order');
      }

      // --- RAZORPAY FLOW ---
      if (paymentMode === 'GATEWAY') {
        const rzpOrderId = createOrderRes.data.razorpayOrderId;
        const localOrderId = createOrderRes.data._id || createOrderRes.data.orderId;

        if (!rzpOrderId) {
          throw new Error('Server failed to initialize online payment (Razorpay ID missing).');
        }

        const options = {
          description: `Order ${createOrderRes.data.orderNumber || 'Payment'}`,
          image: 'https://via.placeholder.com/150',
          currency: 'INR',
          key: RAZORPAY_KEY_ID,
          amount: Math.round((initialPay || grandTotal) * 100),
          name: 'Necessity India',
          order_id: rzpOrderId,
          prefill: {
            email: data.email,
            contact: data.contactPhone,
            name: data.contactName,
          },
          theme: { color: colors.primary },
        };

        try {
          const rzpData = await RazorpayCheckout.open(options);
          
          // Verify on backend
          const verifyRes = await verifyPaymentApi({
            razorpay_order_id: rzpData.razorpay_order_id,
            razorpay_payment_id: rzpData.razorpay_payment_id,
            razorpay_signature: rzpData.razorpay_signature,
            orderId: localOrderId as string,
          });

          if (!verifyRes.success) {
            throw new Error(verifyRes.message || 'Payment verification failed on server.');
          }
        } catch (err: any) {
          // Note: if user cancels, we still have the order in 'UNPAID' or 'PARTIAL' status on server.
          // In a real app, you might want to delete the order or allow them to retry from Orders screen.
          throw new Error(err.description || err.message || 'Payment failed or cancelled.');
        }
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
            <Text style={styles.summaryLabel}>Subtotal (pre-GST)</Text>
            <Text style={styles.summaryValue}>₹{lineSubtotal.toLocaleString()}</Text>
          </View>
          {totalDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.discountLabel}>Volume / tier discount</Text>
              <Text style={styles.discountValue}>-₹{totalDiscount.toLocaleString()}</Text>
            </View>
          )}
          {promoDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.discountLabel}>Promo ({appliedPromo?.code})</Text>
              <Text style={styles.discountValue}>-₹{promoDiscount.toLocaleString()}</Text>
            </View>
          )}
          {cashDiscountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.discountLabel}>
                Cash discount ({cashDiscountPercent}%){cashDiscountPercent > 0 ? ' — pre-GST' : ''}
              </Text>
              <Text style={styles.discountValue}>-₹{cashDiscountAmount.toLocaleString()}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>GST (18%)</Text>
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
          <Text style={styles.inputLabel}>Payment</Text>
          <Text style={styles.paymentInfo}>
            All orders on the app are now paid online. Your payment will be processed securely via 
            <Text style={styles.paymentInfoEm}> Razorpay</Text>. Choose 
            <Text style={styles.paymentInfoEm}> Immediate payment</Text> for the maximum cash discount (5%). 
            The discount is applied on the taxable value (after promo), and GST is then calculated on the 
            reduced amount.
          </Text>


          {segment === 'REGULAR' && (
            <>
              <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>
                Payment timeline & cash discount
              </Text>
              <Text style={styles.helperText}>
                Pay immediately for the highest CD (5%). Other options follow standard timelines; CD applies
                on the taxable subtotal (after promo), before GST.
              </Text>
              <TouchableOpacity
                style={styles.dropdownField}
                onPress={() => setPlanPickerOpen(true)}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownFieldInner}>
                  <Text style={styles.dropdownLabel}>{selectedTimelineOption.label}</Text>
                  <Text style={styles.dropdownSub}>{selectedTimelineOption.sub}</Text>
                </View>
                <Icon name="chevron-down" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
              <Modal
                visible={planPickerOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setPlanPickerOpen(false)}
              >
                <Pressable style={styles.modalOverlay} onPress={() => setPlanPickerOpen(false)}>
                  <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
                    <Text style={styles.modalTitle}>Standard payment terms</Text>
                    {PAYMENT_TIMELINE_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.plan}
                        style={[
                          styles.modalOption,
                          paymentTimelinePlan === opt.plan && styles.modalOptionActive,
                        ]}
                        onPress={() => {
                          setPaymentTimelinePlan(opt.plan);
                          setPlanPickerOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.modalOptionLabel,
                            paymentTimelinePlan === opt.plan && styles.modalOptionLabelActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                        <Text style={styles.modalOptionSub}>{opt.sub}</Text>
                      </TouchableOpacity>
                    ))}
                  </Pressable>
                </Pressable>
              </Modal>
            </>
          )}

          {segment !== 'REGULAR' && (
            <View style={[styles.newCustomerNotice, { marginTop: spacing.md }]}>
              <Icon name="info" size={18} color={colors.textSecondary} />
              <Text style={styles.newCustomerNoticeText}>
                Your account is tagged as <Text style={styles.newCustomerEm}>New</Text>. Checkout uses
                standard terms without cash discount tiers. Ask your account manager to mark you as{' '}
                <Text style={styles.newCustomerEm}>Regular</Text> to unlock payment timeline options and CD
                on invoice.
              </Text>
            </View>
          )}


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
          title="Place order"
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
    backgroundColor: colors.surfaceMuted,
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
    backgroundColor: 'rgba(243, 119, 50, 0.12)',
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
  paymentInfo: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  paymentInfoEm: { fontWeight: fontWeight.bold, color: colors.text },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  dropdownField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
  },
  dropdownFieldInner: { flex: 1, paddingRight: spacing.sm },
  dropdownLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 4,
  },
  dropdownSub: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : spacing.xl,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  modalOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  modalOptionActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(243, 119, 50, 0.1)',
  },
  modalOptionLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 4,
  },
  modalOptionLabelActive: { color: colors.primary },
  modalOptionSub: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  newCustomerNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  newCustomerNoticeText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  newCustomerEm: { fontWeight: fontWeight.bold, color: colors.text },
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
