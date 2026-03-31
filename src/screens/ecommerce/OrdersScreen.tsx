import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useSelector } from 'react-redux';
import { RootState } from 'src/store';
import { colors } from 'src/theme/colors';
import { spacing } from 'src/theme/spacing';
import { fontSize, fontWeight } from 'src/theme/fonts';
import { getCustomerOrdersApi, type CustomerOrder } from 'src/services/ecommerceNecessity';
import { useFocusEffect } from '@react-navigation/native';

export const OrdersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const authUser = useSelector((state: RootState) => state.auth.user);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleOrderPress = (orderId: string) => {
    navigation.navigate('OrderDetail', { orderId });
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadOrders = async () => {
        if (!authUser?.roleId) {
          setLoading(false);
          return;
        }
        setLoading(true);
        try {
          const res = await getCustomerOrdersApi(authUser.roleId, { page: 1, limit: 50 });
          if (active && res.success) {
            setOrders(res.data.orders || []);
          }
        } catch {
          if (active) setOrders([]);
        } finally {
          if (active) setLoading(false);
        }
      };
      loadOrders();
      return () => {
        active = false;
      };
    }, [authUser?.roleId])
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyHint}>Loading orders...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
        <Text style={styles.subtitle}>{orders.length} order{orders.length !== 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Icon name="package" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyHint}>No orders yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.orderCard}
            activeOpacity={0.8}
            onPress={() => handleOrderPress(item._id)}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.orderId}>{item.orderNumber || item._id}</Text>
                <Text style={styles.orderDate}>
                  {new Date(item.createdAt).toLocaleDateString('en-IN')}
                </Text>
              </View>
              <View style={styles.headerRight}>
                {renderStatusBadge(item.workflowStatus || 'PENDING')}
                <Icon name="chevron-right" size={20} color={colors.textSecondary} />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.cardBody}>
              <View style={styles.bodyColumn}>
                <Text style={styles.label}>Company</Text>
                <Text style={styles.value} numberOfLines={1}>
                  {item.customerId?.businessName || item.customerId?.name || 'Business Customer'}
                </Text>
              </View>
              <View style={styles.bodyColumn}>
                <Text style={styles.label}>Items</Text>
                <Text style={styles.value}>
                  {(item.items || []).reduce((sum, line) => sum + (line.quantity || 0), 0)} units
                </Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.label}>Total Amount</Text>
                <Text style={styles.totalValue}>
                  ₹{Number(item.totals?.grandTotal ?? item.totalAmount ?? 0).toLocaleString()}
                </Text>
              </View>

              <View style={styles.paymentContainer}>
                <Icon
                  name={(item.paymentStatus || '').toUpperCase() === 'SUCCESS' ? 'check-circle' : 'refresh-ccw'}
                  size={14}
                  color={(item.paymentStatus || '').toUpperCase() === 'SUCCESS' ? colors.success : colors.textSecondary}
                />
                <Text style={styles.paymentText}>{item.paymentStatus || 'UNPAID'}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 4,
  },
  listContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  orderId: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  cardBody: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  bodyColumn: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: fontWeight.bold,
    marginBottom: 4,
  },
  value: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.xs,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  paymentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  centered: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHint: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: fontSize.base,
  },
});
