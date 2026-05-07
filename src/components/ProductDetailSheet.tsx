import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Product } from '../types';

const { height } = Dimensions.get('window');

const SIZES = ['PP', 'P', 'M', 'G', 'GG'] as const;
type Size = (typeof SIZES)[number];

interface ProductDetailSheetProps {
  product: Product | null;
  onClose: () => void;
  onSave: () => void;
  onBuy: () => void;
}

const ProductDetailSheet: React.FC<ProductDetailSheetProps> = ({
  product,
  onClose,
  onSave,
  onBuy,
}) => {
  const translateY = useRef(new Animated.Value(height)).current;
  const [selectedSize, setSelectedSize] = useState<Size | null>(null);

  useEffect(() => {
    if (product) {
      setSelectedSize(null);
      Animated.spring(translateY, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: height,
        duration: 280,
        useNativeDriver: true,
      }).start();
    }
  }, [product, translateY]);

  if (!product) return null;

  return (
    <>
      {/* Scrim / backdrop */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        className="absolute inset-0 bg-black/60 z-10"
      />

      {/* Sheet */}
      <Animated.View
        style={{ transform: [{ translateY }], height: height * 0.84 }}
        className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-3xl
                   overflow-hidden z-20"
      >
        {/* Close button */}
        <TouchableOpacity
          onPress={onClose}
          className="absolute top-4 right-5 z-30"
        >
          <Text className="text-ink-4 text-sm">✕  fechar</Text>
        </TouchableOpacity>

        {/* Hero image */}
        <Image
          source={{ uri: product.image }}
          className="w-full h-64"
          resizeMode="cover"
        />

        <ScrollView
          contentContainerStyle={{ paddingBottom: 48 }}
          className="px-5 pt-4"
          showsVerticalScrollIndicator={false}
        >
          {/* Meta */}
          <Text className="text-ink-4 text-2xs tracking-widest uppercase mb-1">
            {product.brand}  ·  {product.gender}
          </Text>
          <Text className="text-white text-2xl font-bold mb-1">{product.name}</Text>
          <Text className="text-brand text-xl font-bold mb-3">
            R$ {product.price.toFixed(2)}
          </Text>

          <Text className="text-ink-2 text-sm leading-6 mb-4">
            {product.description}
          </Text>

          {/* Tags */}
          <View className="flex-row flex-wrap gap-2 mb-5">
            {product.style_tags.map((tag) => (
              <View
                key={tag}
                className="bg-surface-3 border border-surface-5 rounded-full px-3 py-1"
              >
                <Text className="text-ink-3 text-xs">{tag}</Text>
              </View>
            ))}
            {product.colors.map((color) => (
              <View
                key={color}
                className="bg-brand/10 border border-brand/30 rounded-full px-3 py-1"
              >
                <Text className="text-brand-light text-xs">{color}</Text>
              </View>
            ))}
          </View>

          {/* Size picker */}
          <Text className="text-ink-4 text-2xs tracking-widest uppercase mb-3">
            Tamanho
          </Text>
          <View className="flex-row gap-2 mb-6">
            {SIZES.map((sz) => {
              const active = selectedSize === sz;
              return (
                <TouchableOpacity
                  key={sz}
                  onPress={() => setSelectedSize(sz)}
                  className={`w-12 h-12 rounded-xl border items-center justify-center
                    ${active
                      ? 'border-brand bg-brand/15'
                      : 'border-surface-5 bg-transparent'
                    }`}
                >
                  <Text
                    className={`text-sm font-semibold ${active ? 'text-brand' : 'text-ink-3'}`}
                  >
                    {sz}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* CTAs */}
          <TouchableOpacity
            onPress={onBuy}
            className="bg-brand rounded-2xl py-4 items-center mb-3"
          >
            <Text className="text-white text-base font-bold">
              Adicionar ao carrinho
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onSave}
            className="border border-surface-5 rounded-2xl py-3.5 items-center"
          >
            <Text className="text-ink-3 text-base">🔖  Salvar peça</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </>
  );
};

export default ProductDetailSheet;
