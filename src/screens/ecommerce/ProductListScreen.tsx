import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { colors } from 'src/theme/colors';
import { spacing } from 'src/theme/spacing';
import { fontSize, fontWeight } from 'src/theme/fonts';
import Icon from 'react-native-vector-icons/Feather';
import Toast from 'react-native-toast-message';
import { getCategories, ApiCategory, getProducts, ApiProduct, addToCartApi } from 'src/services/ecommerceNecessity';
import { getNecessityErrorMessage } from 'src/services/necessity';
import { ProductCard } from 'src/components/ecommerce/ProductCard';
import { addItem } from 'src/store/cartSlice';
import { isVariantProduct } from 'src/utils/productVariants';

export const ProductListScreen: React.FC = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const dispatch = useDispatch();
    const initialCategory = route.params?.category || null;

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

    const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory);
    const [categories, setCategories] = useState<ApiCategory[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [products, setProducts] = useState<ApiProduct[]>([]);
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
        fetchCategories();
    }, []);

    useEffect(() => {
        const fetchFilteredProducts = async () => {
            setLoadingProducts(true);
            try {
                let categoryIdStr: string | undefined = undefined;
                if (selectedCategory && categories.length > 0) {
                    const catObj = categories.find(c => c.name === selectedCategory);
                    if (catObj) categoryIdStr = catObj._id;
                }
                const res = await getProducts(categoryIdStr ? { categoryId: categoryIdStr } : {});
                if (res.success && res.data?.products) {
                    setProducts(res.data.products);
                } else {
                    setProducts([]);
                }
            } catch (err) {
                console.log('Failed to fetch products:', err);
                setProducts([]);
            } finally {
                setLoadingProducts(false);
            }
        };
        // Run only when categories are loaded (or if empty means no map needed yet, but better wait)
        if (!loadingCategories) {
            fetchFilteredProducts();
        }
    }, [selectedCategory, loadingCategories, categories]);

    const renderCategoryChip = (cat: ApiCategory | null) => {
        const isSelected = cat ? selectedCategory === cat.name : selectedCategory === null;
        return (
            <TouchableOpacity
                key={cat ? cat._id : 'all'}
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                onPress={() => setSelectedCategory(cat ? cat.name : null)}
            >
                {cat && <Icon name="grid" size={16} color={isSelected ? colors.white : colors.primary} />}
                <Text style={[styles.categoryName, isSelected && styles.categoryNameSelected]}>
                    {cat ? cat.name : 'All Products'}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>Explore Catalog</Text>
                <TouchableOpacity style={styles.filterButton}>
                    <Icon name="sliders" size={20} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.categoriesContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
                    {renderCategoryChip(null)}
                    {categories.map((cat) => renderCategoryChip(cat))}
                </ScrollView>
            </View>

            <FlatList
                data={products}
                renderItem={({ item }) => (
                    <ProductCard
                        product={item}
                        onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
                        onAddToCart={handleAddToCart}
                    />
                )}
                keyExtractor={(item) => item._id}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Icon name="package" size={48} color={colors.border} />
                        <Text style={styles.emptyText}>No products found in this category.</Text>
                    </View>
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: 60,
        paddingBottom: spacing.sm,
        backgroundColor: colors.surface,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    title: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.text,
    },
    filterButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    categoriesContainer: {
        backgroundColor: colors.surface,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    categoryList: {
        paddingHorizontal: spacing.md,
        alignItems: 'center',
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: 20,
        marginHorizontal: spacing.xs,
        borderWidth: 1,
        borderColor: colors.border,
    },
    categoryChipSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    categoryName: {
        marginLeft: 6,
        fontSize: fontSize.sm,
        color: colors.textSecondary,
        fontWeight: fontWeight.medium,
    },
    categoryNameSelected: {
        color: colors.white,
        fontWeight: fontWeight.bold,
    },
    listContent: {
        padding: spacing.lg,
        paddingBottom: spacing.xxxl,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: spacing.xxxl,
    },
    emptyText: {
        marginTop: spacing.md,
        fontSize: fontSize.base,
        color: colors.textSecondary,
    }
});
