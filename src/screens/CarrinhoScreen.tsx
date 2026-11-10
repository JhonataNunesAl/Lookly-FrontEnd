import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import Text from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CartItem } from '../types/commerce';
import { fetchCart, updateCartItemQuantity, removeFromCart, mensagemDeErroCarrinho } from '../lib/commerce';
import { formatarMoeda, partesDoPreco } from '../utils/format';
import Toast from '../components/Toast';
import Button from '../components/Button';
import PecaFoto from '../components/PecaFoto';
import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../theme/colors';

/**
 * Carrinho — itens vêm de `/cart-items` de verdade (ver src/lib/commerce.ts).
 * "Finalizar compra" continua mock: o backend não tem pedidos/pagamento ainda.
 * Sem frete nem parcelamento na tela: nenhum dos dois existe no produto, então
 * não aparecem como promessa.
 */
export default function CarrinhoScreen(): React.ReactElement {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setCartItems(await fetchCart());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  };

  const subtotal = cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const totalPartes = partesDoPreco(subtotal);

  // Itens com uma atualização em voo: o backend soma/subtrai deltas, então dois
  // toques rápidos antes da resposta embaralhavam a quantidade.
  const emVoo = useRef(new Set<string>()).current;

  const updateQuantity = async (lookId: string, delta: number) => {
    const item = cartItems.find((i) => i.lookId === lookId);
    if (!item || emVoo.has(lookId)) return;
    // "−" na quantidade 1 NÃO remove: o backend apagaria o item enquanto a tela
    // continuava mostrando 1. Remover é a lixeira.
    if (item.quantity + delta < 1) return;
    emVoo.add(lookId);
    const previous = cartItems;
    const newQty = item.quantity + delta;
    setCartItems((prev) => prev.map((i) => (i.lookId === lookId ? { ...i, quantity: newQty } : i)));
    try {
      await updateCartItemQuantity(lookId, delta, item.quantity);
    } catch (e) {
      setCartItems(previous);
      showToast(mensagemDeErroCarrinho(e, 'Não foi possível atualizar a quantidade'));
    } finally {
      emVoo.delete(lookId);
    }
  };

  const removeItem = async (lookId: string) => {
    const previous = cartItems;
    setCartItems((prev) => prev.filter((i) => i.lookId !== lookId));
    try {
      await removeFromCart(lookId);
      showToast('Item removido do carrinho');
    } catch {
      setCartItems(previous);
      showToast('Não foi possível remover. Tente de novo.');
    }
  };

  const irParaCheckout = () => {
    navigation.navigate('ComingSoon', {
      title: 'Finalizar compra',
      description: 'Checkout e pagamento ainda não existem no backend — ver "Commerce invariants" no CLAUDE.md do Lucker antes de construir isso.',
      icon: 'card-outline',
    });
  };

  const renderItem = ({ item }: { item: CartItem }) => (
    <View className="flex-row bg-surface rounded-card border border-surface-5 p-3 mb-3">
      <PecaFoto uri={item.photo} compact className="w-24 h-32 rounded-lg" />

      <View className="flex-1 ml-3 justify-between">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 pr-2">
            <Text className="text-ink text-base font-sans-bold" numberOfLines={2}>
              {item.name}
            </Text>
            {item.selectedSize ? (
              <Text className="text-ink-4 text-sm font-sans-medium mt-0.5">Tamanho {item.selectedSize}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => removeItem(item.lookId)}
            accessibilityRole="button"
            accessibilityLabel={`Remover ${item.name} do carrinho`}
            className="w-12 h-12 -mt-1 -mr-1 items-center justify-center"
          >
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-between items-center">
          <Text className="text-ink text-xl font-display-bold">
            {formatarMoeda(item.unitPrice * item.quantity, true)}
          </Text>

          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => updateQuantity(item.lookId, -1)}
              disabled={item.quantity <= 1}
              accessibilityRole="button"
              accessibilityState={{ disabled: item.quantity <= 1 }}
              accessibilityLabel={`Diminuir quantidade de ${item.name}`}
              className={`w-12 h-12 rounded-lg bg-ink items-center justify-center ${item.quantity <= 1 ? 'opacity-40' : ''}`}
            >
              <Ionicons name="remove" size={22} color={colors.white} />
            </TouchableOpacity>

            <Text className="text-ink text-lg font-display-bold w-9 text-center">{item.quantity}</Text>

            <TouchableOpacity
              onPress={() => updateQuantity(item.lookId, 1)}
              accessibilityRole="button"
              accessibilityLabel={`Aumentar quantidade de ${item.name}`}
              className="w-12 h-12 rounded-lg bg-ink items-center justify-center"
            >
              <Ionicons name="add" size={22} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const quantidadeTotal = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScreenHeader
        title="Meu carrinho"
        subtitle={
          !loading && !error && cartItems.length > 0
            ? `${quantidadeTotal} ${quantidadeTotal === 1 ? 'peça' : 'peças'}`
            : undefined
        }
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.ink.DEFAULT} size="large" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 rounded-lg bg-danger items-center justify-center mb-4">
            <Ionicons name="cloud-offline-outline" size={32} color={colors.white} />
          </View>
          <Text className="text-ink text-xl font-display-bold text-center">Não foi possível carregar o carrinho</Text>
          <View className="mt-6 self-stretch">
            <Button variant="primary" label="Tentar de novo" icon="refresh" onPress={load} />
          </View>
        </View>
      ) : cartItems.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 rounded-lg bg-ink items-center justify-center mb-4">
            <Ionicons name="bag-outline" size={32} color={colors.signal.DEFAULT} />
          </View>
          <Text className="text-ink text-2xl font-display-bold text-center">Carrinho vazio</Text>
          <Text className="text-ink-4 text-base text-center mt-2">
            Abra os detalhes de uma peça no feed e toque em Adicionar ao carrinho.
          </Text>
          <View className="mt-6 self-stretch">
            <Button variant="primary" label="Voltar ao feed" icon="arrow-back" onPress={() => navigation.goBack()} />
          </View>
        </View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.lookId}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          />

          {/* Nota de pedido: linha tracejada de destaque e o total em serifa */}
          <SafeAreaView edges={['bottom']} className="bg-surface border-t-2 border-dashed border-ink">
            <View className="px-5 pt-3 pb-4">
              <View className="flex-row items-end mb-3">
                <Text className="text-ink text-xl font-display-bold">Total</Text>
                <View className="flex-1 mx-2 mb-2 border-b border-dotted border-ink-5" />
                {totalPartes && (
                  <Text className="text-seal text-display-sm font-display-bold">
                    R$ {totalPartes.inteiro},{totalPartes.centavos}
                  </Text>
                )}
              </View>
              <Button variant="primary" label="Finalizar compra" icon="arrow-forward" onPress={irParaCheckout} />
            </View>
          </SafeAreaView>
        </>
      )}

      <Toast message={toastMsg} visible={toastVisible} />
    </View>
  );
}
