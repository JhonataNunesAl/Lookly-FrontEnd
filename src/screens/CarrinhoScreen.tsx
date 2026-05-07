import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../types'; // Assumindo que seu tipo Product está aqui
import Toast from '../components/Toast';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

// Tipo local para item do carrinho
interface CartItem extends Product {
  quantity: number;
  selectedSize: string;
}

export default function CarrinhoScreen(): React.ReactElement {
  // Mock de dados para exemplo - Na vida real viria de um Context ou Redux
  const navigation = useNavigation();
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: '1',
      name: 'Jaqueta Puffer Noir',
      brand: 'Lookly Studio',
      price: 299.90,
      price_range: 'budget',
      category: 'casaco',
      image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea',
      style_tags: ['casual', 'boho'],
      colors: ['Preto'],
      gender: 'feminino',
      description: 'Uma jaqueta puffer super estilosa e quentinha, perfeita para os dias frios.',
      quantity: 1,
      selectedSize: 'G'
    },
  ]);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  };

  // Lógica de Cálculos
  const subtotal = useMemo(() => 
    cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0), 
  [cartItems]);

  const updateQuantity = (id: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
    showToast('Item removido do carrinho');
  };

  // Componente de Item da Lista
  const renderItem = ({ item }: { item: CartItem }) => (
    <View className="flex-row bg-surface/40 rounded-3xl p-4 mb-4 border border-white/5">
      <Image 
        source={{ uri: item.image }} 
        className="w-24 h-32 rounded-2xl bg-zinc-800"
        resizeMode="cover"
      />
      
      <View className="flex-1 ml-4 justify-between py-1">
        <View>
          <View className="flex-row justify-between items-start">
            <Text className="text-white font-bold text-lg leading-tight flex-1" numberOfLines={1}>
              {item.name}
            </Text>
            <TouchableOpacity onPress={() => removeItem(item.id)}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
          <Text className="text-ink-4 text-xs uppercase tracking-widest mt-1">
            {item.brand} • Tam: {item.selectedSize}
          </Text>
        </View>

        <View className="flex-row justify-between items-center">
          <Text className="text-brand font-bold text-lg">
            R$ {(item.price * item.quantity).toFixed(2)}
          </Text>
          
          <View className="flex-row items-center bg-white/10 rounded-full px-2 py-1">
            <TouchableOpacity 
              onPress={() => updateQuantity(item.id, -1)}
              className="w-8 h-8 items-center justify-center"
            >
              <Ionicons name="remove" size={18} color="white" />
            </TouchableOpacity>
            
            <Text className="text-white font-bold mx-3 w-4 text-center">
              {item.quantity}
            </Text>
            
            <TouchableOpacity 
              onPress={() => updateQuantity(item.id, 1)}
              className="w-8 h-8 items-center justify-center"
            >
              <Ionicons name="add" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  // Estado Vazio
  if (cartItems.length === 0) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-10">
        <View className="w-20 h-20 bg-surface rounded-full items-center justify-center mb-6">
          <Ionicons name="cart-outline" size={40} color="#444" />
        </View>
        <Text className="text-white text-xl font-bold">Carrinho vazio</Text>
        <Text className="text-ink-4 text-center mt-2">
          Parece que você ainda não escolheu seu look favorito hoje.
        </Text>
        <TouchableOpacity className="mt-8 bg-brand px-8 py-4 rounded-full" onPress={() => {navigation.goBack()}}>
          <Text className="text-white font-bold">Voltar para o Feed</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="light-content" />
      
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-2 pb-6">
          <Text className="text-white text-2xl font-bold tracking-tight">
            Meu Carrinho
          </Text>
          <View className="bg-brand/20 px-3 py-1 rounded-full">
            <Text className="text-brand-light font-bold">{cartItems.length} Itens</Text>
          </View>
        </View>

        {/* List */}
        <FlatList
          data={cartItems}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />

        {/* Footer Checkout */}
        <View className="absolute bottom-0 left-0 right-0">
          <LinearGradient
            colors={['transparent', 'rgba(10,10,10,0.9)', '#0a0a0a']}
            style={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 40 }}
          >
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-ink-4 text-sm">Total do pedido</Text>
                <Text className="text-white text-3xl font-black">
                  R$ {subtotal.toFixed(2)}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-success text-xs font-bold uppercase">Frete Grátis</Text>
                <Text className="text-ink-4 text-xs italic">em até 10x sem juros</Text>
              </View>
            </View>

            <TouchableOpacity 
              activeOpacity={0.8}
              className="bg-brand h-16 rounded-2xl flex-row items-center justify-center shadow-lg shadow-brand/40"
              onPress={() => showToast('Finalizando compra')}
            >
              <Text className="text-white text-lg font-bold mr-2">Finalizar Compra</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </SafeAreaView>

      <Toast message={toastMsg} visible={toastVisible} />
    </View>
  );
}