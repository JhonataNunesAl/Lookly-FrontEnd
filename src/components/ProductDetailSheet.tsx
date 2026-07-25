import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LookResponse } from '../types/api';
import { colors } from '../theme/colors';
import { formatarMoeda, formatarNumero } from '../utils/format';

const { width, height } = Dimensions.get('window');

interface ProductDetailSheetProps {
  look: LookResponse | null;
  onClose: () => void;
  onSave: () => void;
}

/**
 * Detalhe do look em bottom sheet. Modelo v2: fotos + nome + preço + descrição
 * + link de compra. Não há tamanhos/variantes (comércio não existe no backend)
 * nem tags/cores/marca (o look não carrega esses atributos).
 */
const ProductDetailSheet: React.FC<ProductDetailSheetProps> = ({
  look,
  onClose,
  onSave,
}) => {
  const translateY = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: look ? 0 : height,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [look, translateY]);

  if (!look) return null;

  const abrirLink = () => {
    if (look.buy_link) Linking.openURL(look.buy_link).catch(() => {});
  };

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
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          className="absolute top-4 right-5 z-30 w-9 h-9 rounded-full bg-ink/40 items-center justify-center"
        >
          <Ionicons name="close" size={18} color={colors.white} />
        </TouchableOpacity>

        {/* Fotos — carrossel horizontal (o look tem de 1 a 6) */}
        {look.photos.length > 1 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {look.photos.map((uri, i) => (
              <Image
                key={`${uri}-${i}`}
                source={{ uri }}
                style={{ width, height: 288 }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        ) : (
          <Image source={{ uri: look.photos[0] }} className="w-full h-72" resizeMode="cover" />
        )}

        <ScrollView
          contentContainerStyle={{ paddingBottom: 48 }}
          className="px-5 pt-4"
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-ink text-2xl font-bold mb-1">{look.name}</Text>

          {look.price != null && (
            <Text className="text-brand text-xl font-bold mb-3">
              {formatarMoeda(look.price, true)}
            </Text>
          )}

          {/* Prova social — o look traz esses contadores */}
          <View className="flex-row gap-4 mb-4">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="heart" size={15} color={colors.brand.DEFAULT} />
              <Text className="text-ink-4 text-sm">{formatarNumero(look.likes_count)} curtidas</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="bookmark" size={15} color={colors.ink[4]} />
              <Text className="text-ink-4 text-sm">{formatarNumero(look.saves_count)} salvos</Text>
            </View>
          </View>

          {look.description ? (
            <Text className="text-ink-2 text-sm leading-6 mb-5">{look.description}</Text>
          ) : null}

          {/* CTAs */}
          {look.buy_link ? (
            <TouchableOpacity
              onPress={abrirLink}
              accessibilityRole="button"
              className="bg-brand rounded-2xl py-4 items-center mb-3 flex-row justify-center gap-2"
            >
              <Ionicons name="bag-handle-outline" size={18} color={colors.white} />
              <Text className="text-white text-base font-bold">Comprar na loja</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={onSave}
            accessibilityRole="button"
            className="border border-surface-5 rounded-2xl py-3.5 items-center flex-row justify-center gap-2"
          >
            <Ionicons name="bookmark-outline" size={17} color={colors.ink[3]} />
            <Text className="text-ink-3 text-base">Salvar peça</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </>
  );
};

export default ProductDetailSheet;
