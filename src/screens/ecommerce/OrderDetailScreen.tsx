import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { colors } from 'src/theme/colors';
import { spacing } from 'src/theme/spacing';
import { fontSize, fontWeight } from 'src/theme/fonts';
import {
  getOrderByIdApi,
  verifyPaymentApi,
  type CustomerOrder,
} from 'src/services/ecommerceNecessity';
import RazorpayCheckout from 'react-native-razorpay';
import { RAZORPAY_KEY_ID } from 'src/config/necessity';
import Toast from 'react-native-toast-message';

export const OrderDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const orderId = route.params?.orderId;
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const res = await getOrderByIdApi(orderId);
      if (res.success) setOrder(res.data);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) loadOrder();
  }, [orderId]);

  const handlePayNow = async () => {
    if (!order || !order.razorpayOrderId) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Online payment not initialized for this order.' });
      return;
    }

    const options = {
      description: `Payment for Order ${order.orderNumber}`,
      image: 'https://via.placeholder.com/150',
      currency: 'INR',
      key: RAZORPAY_KEY_ID,
      amount: Math.round((order.totalAmount ?? 0) * 100), // simplistic; in real app might sub initial payment
      name: 'Necessity India',
      order_id: order.razorpayOrderId,
      prefill: {
        email: order.customerId?.email || '',
        contact: order.customerId?.phone || '',
        name: order.customerId?.name || '',
      },
      theme: { color: colors.primary },
    };

    try {
      const rzpData = await RazorpayCheckout.open(options);
      
      Toast.show({ type: 'info', text1: 'Processing', text2: 'Verifying payment...' });
      
      const verifyRes = await verifyPaymentApi({
        razorpay_order_id: rzpData.razorpay_order_id,
        razorpay_payment_id: rzpData.razorpay_payment_id,
        razorpay_signature: rzpData.razorpay_signature,
        orderId: order._id,
      });

      if (verifyRes.success) {
        Toast.show({ type: 'success', text1: 'Success', text2: 'Payment verified!' });
        loadOrder(); // Refresh data
      } else {
        throw new Error(verifyRes.message || 'Verification failed.');
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Payment Failed',
        text2: err.description || err.message || 'Could not complete payment.',
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyText}>Loading order...</Text>
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centerContent}>
          <Icon name="package" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Order not found</Text>
        </View>
      </View>
    );
  }

  const renderStatusBadge = (status: string) => {
    let bgColor: string = colors.border;
    let textColor: string = colors.textSecondary;

    const normalized = (status || '').toUpperCase();
    if (normalized === 'DELIVERED' || normalized === 'COMPLETED') {
      bgColor = 'rgba(46, 204, 113, 0.1)';
      textColor = colors.success;
    } else if (normalized === 'PROCESSING' || normalized === 'SHIPPED' || normalized === 'CONFIRMED' || normalized === 'PENDING') {
      bgColor = 'rgba(247, 174, 107, 0.22)';
      textColor = colors.primaryDark;
    } else if (normalized === 'CANCELLED') {
      bgColor = 'rgba(231, 76, 60, 0.1)';
      textColor = colors.error;
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
        <Text style={[styles.statusText, { color: textColor }]}>{normalized || 'PENDING'}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.orderId}>{order.orderNumber || order._id}</Text>
              <Text style={styles.orderDate}>Placed on {new Date(order.createdAt).toLocaleDateString('en-IN')}</Text>
            </View>
            {renderStatusBadge(order.workflowStatus || 'PENDING')}
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Company</Text>
            <Text style={styles.value}>{order.customerId?.businessName || order.customerId?.name || 'Business Customer'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Status</Text>
            <View style={styles.paymentRow}>
              <Icon
                name={(order.paymentStatus || '').toUpperCase() === 'SUCCESS' ? 'check-circle' : 'refresh-ccw'}
                size={18}
                color={(order.paymentStatus || '').toUpperCase() === 'SUCCESS' ? colors.success : colors.textSecondary}
              />
              <Text style={styles.paymentText}>{order.paymentStatus || 'UNPAID'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Order Items ({(order.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0)} units)</Text>
          <View style={styles.itemsCard}>
            {order.items.map((item, index) => (
              <View key={index} style={styles.lineItem}>
                <View style={styles.lineItemMain}>
                  <Text style={styles.lineItemName} numberOfLines={2}>
                    {item.productName || item.productId?.basicInfo?.name || 'Product'}
                  </Text>
                  <Text style={styles.lineItemQty}>
                    {item.quantity} × ₹{Number(item.unitPrice || 0).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.lineItemTotal}>
                  ₹{Number(item.subtotal ?? ((item.quantity || 0) * (item.unitPrice || 0))).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.totalsCard}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>₹{Number(order.totals?.subtotalAmount ?? 0).toLocaleString()}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>GST (18%)</Text>
              <Text style={styles.totalValue}>₹{Number(order.totals?.taxAmount ?? 0).toLocaleString()}</Text>
            </View>
            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>₹{Number(order.totals?.grandTotal ?? order.totalAmount ?? 0).toLocaleString()}</Text>
            </View>
          </View>

          {order.paymentMode === 'GATEWAY' && order.paymentStatus !== 'SUCCESS' && (
            <TouchableOpacity 
              style={styles.payNowButton} 
              onPress={handlePayNow}
              activeOpacity={0.8}
            >
              <Icon name="credit-card" size={20} color={colors.surface} />
              <Text style={styles.payNowText}>Pay Online Now</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderId: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: fontSize.base,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentText: {
    fontSize: fontSize.base,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  itemsCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lineItemMain: {
    flex: 1,
  },
  lineItemName: {
    fontSize: fontSize.base,
    color: colors.text,
    fontWeight: fontWeight.medium,
    marginBottom: 4,
  },
  lineItemQty: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  lineItemTotal: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  totalsCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  totalLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  grandTotal: {
    marginTop: spacing.sm,
    marginBottom: 0,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  grandTotalLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  grandTotalValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  payNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: spacing.xl,
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  payNowText: {
    color: colors.surface,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
});
