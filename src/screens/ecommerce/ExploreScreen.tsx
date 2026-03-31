import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    FlatList,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from 'src/store';
import { logoutThunk } from 'src/store/authSlice';
import { colors } from 'src/theme/colors';
import { spacing } from 'src/theme/spacing';
import { fontSize, fontWeight } from 'src/theme/fonts';
import Icon from 'react-native-vector-icons/Feather';
import { getCategories, ApiCategory, getProducts, ApiProduct, addToCartApi } from 'src/services/ecommerceNecessity';
import { getNecessityErrorMessage } from 'src/services/necessity';
import { ProductCard } from 'src/components/ecommerce/ProductCard';
import { isVariantProduct } from 'src/utils/productVariants';
import { addItem } from 'src/store/cartSlice';
import Toast from 'react-native-toast-message';

export const ExploreScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const dispatch = useDispatch<AppDispatch>();
    const user = useSelector((state: RootState) => state.auth.user);

    const [categories, setCategories] = useState<ApiCategory[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [featuredProducts, setFeaturedProducts] = useState<ApiProduct[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await getCategories();
                if (res.success && res.data?.categories) {
                    setCategories(res.data.categories);
                }
            } catch (err) {
                console.log('Failed to fetch categories:', err);
            } finally {
                setLoadingCategories(false);
            }
        };
        const fetchFeaturedProducts = async () => {
            try {
                const res = await getProducts({ limit: 4 });
                if (res.success && res.data?.products) {
                    setFeaturedProducts(res.data.products);
                }
            } catch (err) {
                console.log('Failed to fetch products:', err);
            } finally {
                setLoadingProducts(false);
            }
        };
        fetchCategories();
        fetchFeaturedProducts();
    }, []);

    const handleAddToCart = async (product: ApiProduct, quantity: number) => {
        try {
            if (isVariantProduct(product) && product.variants?.length !== 1) {
                navigation.navigate('ProductDetail', { productId: product._id });
                return;
            }
            const soleVariantId =
                isVariantProduct(product) && product.variants?.length === 1
                    ? product.variants[0]._id
                    : undefined;
            const res = await addToCartApi({
                productId: product._id,
                quantity,
                ...(soleVariantId ? { variantId: soleVariantId } : {}),
            });
            if (res.success) {
                dispatch(addItem({ product, quantity, variantId: soleVariantId }));
                Toast.show({
                    type: 'success',
                    text1: 'Added to Cart',
                    text2: `${quantity} units of ${product.basicInfo.name} added.`,
                });
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Failed to Add',
                    text2: res.message || 'Error adding to cart.',
                });
            }
        } catch (err: unknown) {
            Toast.show({
                type: 'error',
                text1: 'Could not add to cart',
                text2: getNecessityErrorMessage(err),
            });
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: () => dispatch(logoutThunk()),
                },
            ],
            { cancelable: true }
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Welcome, {user?.full_name || 'B2B Partner'}</Text>
                    <Text style={styles.title}>Find Best Bulk Deals</Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity onPress={handleLogout} style={styles.headerIconButton}>
                        <Icon name="log-out" size={22} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cartButton}>
                        <Icon name="shopping-cart" size={24} color={colors.primary} />
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>3</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.searchBar}>
                    <Icon name="search" size={20} color={colors.textSecondary} />
                    <TextInput
                        placeholder="Search furniture, decor, linens..."
                        style={styles.searchInput}
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>

                <Text style={styles.sectionTitle}>Categories</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryList}>
                    {categories.map((cat) => (
                        <TouchableOpacity
                            key={cat._id}
                            style={styles.categoryChip}
                            onPress={() => navigation.navigate('ProductList', { category: cat.name })}
                        >
                            <Icon name="grid" size={18} color={colors.primary} />
                            <Text style={styles.categoryName}>{cat.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.promoCard}>
                    <View style={styles.promoText}>
                        <Text style={styles.promoTitle}>Bulk Festive Discounts</Text>
                        <Text style={styles.promoSubtitle}>Up to 20% off on premium dining sets this week!</Text>
                        <TouchableOpacity style={styles.promoButton}>
                            <Text style={styles.promoButtonText}>View Deals</Text>
                        </TouchableOpacity>
                    </View>
                    <Icon name="trending-up" size={60} color="rgba(255,255,255,0.3)" style={styles.promoIcon} />
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Featured Products</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('ProductList')}>
                        <Text style={styles.seeAll}>See All</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.productsGrid}>
                    {featuredProducts.map((item) => (
                        <ProductCard
                            key={item._id}
                            product={item}
                            onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
                            onAddToCart={handleAddToCart}
                        />
                    ))}
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: 60,
        backgroundColor: colors.surface,
        paddingBottom: spacing.md,
    },
    greeting: {
        fontSize: fontSize.sm,
        color: colors.textSecondary,
    },
    title: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        color: colors.primary,
    },
    cartButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surfaceMuted,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: colors.primary,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.white,
    },
    badgeText: {
        color: colors.white,
        fontSize: 10,
        fontWeight: fontWeight.bold,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIconButton: {
        marginRight: spacing.md,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xxxl,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        marginTop: spacing.md,
        height: 50,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: {
        flex: 1,
        marginLeft: spacing.sm,
        fontSize: fontSize.sm,
        color: colors.text,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.xl,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.primary,
        marginTop: spacing.xl,
        marginBottom: spacing.md,
    },
    seeAll: {
        fontSize: fontSize.sm,
        color: colors.primary,
        fontWeight: fontWeight.semiBold,
    },
    categoryList: {
        flexDirection: 'row',
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        marginRight: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    categoryName: {
        marginLeft: 8,
        fontSize: fontSize.sm,
        color: colors.text,
        fontWeight: fontWeight.semiBold,
    },
    promoCard: {
        marginTop: spacing.xl,
        backgroundColor: colors.primary,
        borderRadius: 16,
        padding: spacing.xl,
        flexDirection: 'row',
        overflow: 'hidden',
    },
    promoText: {
        flex: 1,
        zIndex: 1,
    },
    promoTitle: {
        color: colors.white,
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
    },
    promoSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: fontSize.sm,
        marginVertical: 8,
    },
    promoButton: {
        backgroundColor: colors.white,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginTop: 8,
    },
    promoButtonText: {
        color: colors.primary,
        fontWeight: fontWeight.bold,
        fontSize: fontSize.sm,
    },
    promoIcon: {
        position: 'absolute',
        right: -10,
        bottom: -10,
    },
    productsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
});
