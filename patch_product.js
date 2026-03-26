const fs = require('fs');
const path = './src/screens/ecommerce/ProductDetailScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacement = `    const handleAddToCart = async () => {
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
                variantId: route.params?.variantId,
                quantity,
            });

            console.log('--- ADD TO CART RESPONSE ---');
            console.log('Response:', JSON.stringify(res, null, 2));

            if (res.success) {
                dispatch(addItem({ product, quantity }));
                Toast.show({
                    type: 'success',
                    text1: 'Added to Cart',
                    text2: \`\${quantity} units of \${product.basicInfo.name} added.\`,
                });
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Failed to Add',
                    text2: res.message || 'Error occurred while adding to cart.',
                });
            }
        } catch (error) {
            console.log('--- ADD TO CART ERROR ---');
            console.log('Error object:', error);
            if (error.response) {
                 console.log('Error response data:', error.response.data);
            }
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to connect to the server.',
            });
        } finally {
            setAddingToCart(false);
        }
    };`;

const regex = /const handleAddToCart = async \(\) => \{[\s\S]*?^\s*\};\s*$/m;
if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Patched successfully');
} else {
    console.log('Could not find handleAddToCart');
}
