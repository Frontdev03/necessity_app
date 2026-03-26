import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ApiProduct } from 'src/services/ecommerceNecessity';
import { colors } from 'src/theme/colors';
import { spacing } from 'src/theme/spacing';
import { fontSize, fontWeight } from 'src/theme/fonts';
import Icon from 'react-native-vector-icons/Feather';

interface Props {
    product: ApiProduct;
    onPress: () => void;
    onAddToCart?: (product: ApiProduct, quantity: number) => void | Promise<void>;
}

export const ProductCard: React.FC<Props> = ({ product, onPress, onAddToCart }) => {
    const [addingToCart, setAddingToCart] = useState(false);
    const imageUrl = product.media.images[0]?.url || 'https://via.placeholder.com/150';

    const handleAddPress = async () => {
        if (product.hasVariants) {
            onPress();
            return;
        }
        if (!onAddToCart) {
            onPress();
            return;
        }
        setAddingToCart(true);
        try {
            const quantity = Math.max(1, product.pricing.moq);
            await onAddToCart(product, quantity);
        } finally {
            setAddingToCart(false);
        }
    };

    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>
            <Image source={{ uri: imageUrl }} style={styles.image} />
            <View style={styles.content}>
                <Text style={styles.category}>{product.basicInfo.categoryId.name}</Text>
                <Text style={styles.name} numberOfLines={2}>
                    {product.basicInfo.name}
                </Text>
                <View style={styles.footer}>
                    <View>
                        <Text style={styles.price}>₹{product.pricing.basePrice.toLocaleString()}</Text>
                        <Text style={styles.minOrder}>Min: {product.pricing.moq} {product.pricing.unit}</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.addButton, addingToCart && styles.addButtonDisabled]}
                        onPress={handleAddPress}
                        disabled={addingToCart}
                    >
                        {addingToCart ? (
                            <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                            <Icon name="plus" size={20} color={colors.white} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        marginBottom: spacing.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        width: '48%',
    },
    image: {
        width: '100%',
        height: 120,
        backgroundColor: '#f0f0f0',
    },
    content: {
        padding: spacing.sm,
    },
    category: {
        fontSize: 10,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        fontWeight: fontWeight.bold,
        marginBottom: 4,
    },
    name: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.semiBold,
        color: colors.text,
        height: 36,
        marginBottom: 8,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    price: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.bold,
        color: colors.primary,
    },
    minOrder: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    addButton: {
        backgroundColor: colors.primary,
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButtonDisabled: {
        opacity: 0.7,
    },
});
