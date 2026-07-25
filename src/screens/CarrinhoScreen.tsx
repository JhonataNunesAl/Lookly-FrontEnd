import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CartItem } from '../types/commerce';
import { fetchCart, updateCartItemQuantity, removeFromCart } from '../lib/commerce';
import Toast from '../components/Toast';
import Button from '../components/Button';
import { colors, PAGE_FADE } from '../theme/colors';

/**
 * Carrinho — rascunho de comércio (ver src/lib/commerce.ts e
 * src/types/commerce.ts). O carrinho em si e "Finalizar Compra" continuam
 * mock: o backend não tem pedidos/pagamento ainda. O que mudou: os dados
 * saem de `lib/commerce.ts` (não mais de um `useState` mockado direto na
 * tela) e os dois botões que não levavam a lugar nenhum agora dizem o porquê
 * em vez de fingir que funcionam.
 */
export default function CarrinhoScreen(): React.ReactElement {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useFocusEffect(useCallback(() => {
    fetchCart().then(setCartItems);
  }, []));

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  };

  const subtotal = cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);

  const updateQuantity = (lookId: string, delta: number) => {
    const item = cartItems.find((i) => i.lookId === lookId);
    if (!item) return;
    const newQty = Math.max(1, item.quantity + delta);
    setCartItems((prev) => prev.map((i) => (i.lookId === lookId ? { ...i, quantity: newQty } : i)));
    updateCartItemQuantity(lookId, newQty);
  };

  const removeItem = (lookId: string) => {
    setCartItems((prev) => prev.filter((i) => i.lookId !== lookId));
    removeFromCart(lookId);
    showToast('Item removido do carrinho');
  };

  const irParaCheckout = () => {
    navigation.navigate('ComingSoon', {
      title: 'Finalizar compra',
      description: 'Checkout e pagamento ainda não existem no backend — ver "Commerce invariants" no CLAUDE.md do Lucker antes de construir isso.',
      icon: 'card-outline',
    });
  };

  const renderItem = ({ item }: { item: CartItem }) => (
    <View className="flex-row bg-surface rounded-card p-4 mb-4 border border-surface-4">
      <Image
        source={{ uri: item.photo }}
        className="w-24 h-32 rounded-2xl bg-surface-4"
        resizeMode="cover"
      />

      <View className="flex-1 ml-4 justify-between py-1">
        <View>
          <View className="flex-row justify-between items-start">
            <Text className="text-ink font-bold text-lg leading-tight flex-1" numberOfLines={1}>
              {item.name}
            </Text>
            <TouchableOpacity onPress={() => removeItem(item.lookId)}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
          {item.selectedSize ? (
            <Text className="text-ink-4 text-xs uppercase tracking-widest mt-1">
              Tam: {item.selectedSize}
            </Text>
          ) : null}
        </View>

        <View className="flex-row justify-between items-center">
          <Text className="text-brand font-bold text-lg">
            R$ {(item.unitPrice * item.quantity).toFixed(2)}
          </Text>

          <View className="flex-row items-center bg-surface-3 border border-surface-4 rounded-full px-2 py-1">
            <TouchableOpacity
              onPress={() => updateQuantity(item.lookId, -1)}
              className="w-8 h-8 items-center justify-center"
            >
              <Ionicons name="remove" size={18} color={colors.ink.DEFAULT} />
            </TouchableOpacity>

            <Text className="text-ink font-bold mx-3 w-4 text-center">
              {item.quantity}
            </Text>

            <TouchableOpacity
              onPress={() => updateQuantity(item.lookId, 1)}
              className="w-8 h-8 items-center justify-center"
            >
              <Ionicons name="add" size={18} color={colors.ink.DEFAULT} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  if (cartItems.length === 0) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-10">
        <View className="w-20 h-20 bg-surface-3 rounded-full items-center justify-center mb-6">
          <Ionicons name="cart-outline" size={40} color={colors.ink[5]} />
        </View>
        <Text className="text-ink text-xl font-bold">Carrinho vazio</Text>
        <Text className="text-ink-4 text-center mt-2">
          Parece que você ainda não escolheu seu look favorito hoje.
        </Text>
        <View className="mt-8 self-stretch">
          <Button variant="primary" label="Voltar para o Feed" onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" />

      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-2 pb-6">
          <Text className="text-ink text-2xl font-bold tracking-tight">
            Meu Carrinho
          </Text>
          <View className="bg-brand/10 border border-brand/25 px-3 py-1 rounded-full">
            <Text className="text-brand font-bold">{cartItems.length} Itens</Text>
          </View>
        </View>

        {/* List */}
        <FlatList
          data={cartItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.lookId}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />

        {/* Footer Checkout */}
        <View className="absolute bottom-0 left-0 right-0">
          <LinearGradient
            colors={[...PAGE_FADE]}
            style={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 40 }}
          >
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-ink-4 text-sm">Total do pedido</Text>
                <Text className="text-ink text-3xl font-black">
                  R$ {subtotal.toFixed(2)}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-success text-xs font-bold uppercase">Frete Grátis</Text>
                <Text className="text-ink-4 text-xs italic">em até 10x sem juros</Text>
              </View>
            </View>

            <Button variant="primary" label="Finalizar Compra" icon="arrow-forward" onPress={irParaCheckout} />
          </LinearGradient>
        </View>
      </SafeAreaView>

      <Toast message={toastMsg} visible={toastVisible} />
    </View>
  );
}
