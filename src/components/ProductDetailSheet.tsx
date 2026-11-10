import React, { useEffect, useRef } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Linking,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from './Text';
import { Ionicons } from '@expo/vector-icons';
import { LookResponse } from '../types/api';
import { colors } from '../theme/colors';
import { formatarNumero, partesDoPreco } from '../utils/format';
import { refDaPeca } from './PecaRow';
import Button from './Button';
import { ordenarTamanhos } from '../utils/tamanhos';
import PecaFoto from './PecaFoto';

const { width, height } = Dimensions.get('window');
const PHOTO_HEIGHT = Math.round(height * 0.36);

interface ProductDetailSheetProps {
  look: LookResponse | null;
  onClose: () => void;
  onSave: () => void;
  onAddToCart: () => void;
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
  onAddToCart,
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

  // O sheet não é um Modal: sem isso o Voltar do Android desempilha a tela
  // em vez de fechar o detalhe.
  useEffect(() => {
    if (!look) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [look, onClose]);

  if (!look) return null;

  const abrirLink = () => {
    if (look.buy_link) Linking.openURL(look.buy_link).catch(() => {});
  };

  const preco = partesDoPreco(look.price);

  return (
    <>
      {/* Scrim / backdrop */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        accessible={false}
        className="absolute inset-0 bg-black/60 z-10"
      />

      {/* Sheet */}
      <Animated.View
        style={{ transform: [{ translateY }], height: height * 0.88 }}
        className="absolute bottom-0 left-0 right-0 bg-background overflow-hidden z-20"
      >
        {/* Fotos — carrossel horizontal (o look tem de 1 a 6), em moldura vermelha */}
        <View className="mx-4 mt-3 border-2 border-seal p-1 bg-surface" style={{ height: PHOTO_HEIGHT }}>
          <View className="flex-1 border border-ink overflow-hidden">
            {look.photos.length > 1 ? (
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                {look.photos.map((uri, i) => (
                  <PecaFoto key={`${uri}-${i}`} uri={uri} style={{ width: width - 32 - 12, height: '100%' }} />
                ))}
              </ScrollView>
            ) : (
              <PecaFoto uri={look.photos[0]} className="flex-1" />
            )}
          </View>

          {look.photos.length > 1 && (
            <View className="absolute bottom-3 left-3 bg-surface border border-ink rounded-lg px-3 h-8 items-center justify-center">
              <Text className="text-ink text-sm font-sans-bold">{look.photos.length} fotos</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          className="absolute top-1 right-1 w-12 h-12 rounded-lg bg-ink items-center justify-center"
        >
          <Ionicons name="close" size={24} color={colors.white} />
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          className="px-5 pt-5"
          showsVerticalScrollIndicator={false}
        >
          {/* Ficha: nome, código de item e dados ligados ao valor por pontilhado */}
          <Text className="text-ink text-3xl font-display-bold" numberOfLines={3}>{look.name}</Text>
          <Text className="text-ink-4 text-sm font-mono mt-1">{refDaPeca(look.id)}</Text>

          {look.description ? (
            <Text className="text-ink-2 text-base font-display-italic leading-6 mt-3">{look.description}</Text>
          ) : null}

          <View className="mt-4 border-t-2 border-ink">
            {look.sizes && look.sizes.length > 0 ? (
              <View className="flex-row items-end py-2">
                <Text className="text-ink-3 text-base">Tamanhos</Text>
                <View className="flex-1 mx-2 mb-2 border-b border-dotted border-ink-5" />
                <Text className="text-ink text-base font-mono-bold">{ordenarTamanhos(look.sizes).join('  ')}</Text>
              </View>
            ) : null}
            <View className="flex-row items-end py-2">
              <Text className="text-ink-3 text-base">Curtidas</Text>
              <View className="flex-1 mx-2 mb-2 border-b border-dotted border-ink-5" />
              <Text className="text-ink text-base font-sans-bold">{formatarNumero(look.likes_count)}</Text>
            </View>
            <View className="flex-row items-end py-2">
              <Text className="text-ink-3 text-base">Salvos</Text>
              <View className="flex-1 mx-2 mb-2 border-b border-dotted border-ink-5" />
              <Text className="text-ink text-base font-sans-bold">{formatarNumero(look.saves_count)}</Text>
            </View>
            <View className="flex-row items-end pt-2 pb-3 border-t border-ink">
              <Text className="text-ink text-lg font-display-bold">Preço</Text>
              <View className="flex-1 mx-2 mb-2 border-b border-dotted border-ink-5" />
              <Text className="text-seal text-display-sm font-display-bold">
                {preco ? `R$ ${preco.inteiro},${preco.centavos}` : 'Sem preço'}
              </Text>
            </View>
          </View>

          {/* CTAs */}
          <View className="gap-3 mt-2">
            <Button variant="primary" label="Adicionar ao carrinho" icon="bag-add-outline" onPress={onAddToCart} />
            {look.buy_link ? (
              <Button variant="secondary" label="Comprar na loja" icon="open-outline" onPress={abrirLink} />
            ) : null}
            <Button variant="secondary" label="Salvar peça" icon="bookmark-outline" onPress={onSave} />
          </View>
        </ScrollView>
      </Animated.View>
    </>
  );
};

export default ProductDetailSheet;
