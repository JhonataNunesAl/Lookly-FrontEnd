import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function PedidoScreen(): React.ReactElement {
  // Mock de dados do pedido
  const orderData = {
    id: '#LK-882910',
    status: 'Preparando envio',
    date: '07 de Maio, 2026',
    deliveryEstimate: '12 - 15 Mai',
    total: 'R$ 299,90',
    items: [
      {
        id: '1',
        name: 'Jaqueta Puffer Noir',
        image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea',
        size: 'G',
        price: 'R$ 299,90'
      }
    ]
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle="light-content" />
      
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        
        {/* Header de Sucesso */}
        <View className="items-center py-10">
          <View className="w-20 h-20 bg-success/20 rounded-full items-center justify-center mb-4">
            <Ionicons name="checkmark-circle" size={60} color="#10b981" />
          </View>
          <Text className="text-white text-2xl font-bold">Pedido Realizado!</Text>
          <Text className="text-ink-4 mt-1 text-center">
            Obrigado pela compra. Estamos preparando seu look com cuidado.
          </Text>
        </View>

        {/* Card de Status */}
        <View className="bg-surface/40 border border-white/5 rounded-3xl p-5 mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-ink-4 text-xs uppercase tracking-tighter">Número do Pedido</Text>
              <Text className="text-white font-bold text-lg">{orderData.id}</Text>
            </View>
            <View className="bg-brand/20 px-3 py-1 rounded-full">
              <Text className="text-brand-light font-bold text-xs">{orderData.status}</Text>
            </View>
          </View>

          {/* Stepper de Status Simplificado */}
          <View className="flex-row items-center justify-between mt-2 px-2">
            <View className="items-center">
              <View className="w-3 h-3 rounded-full bg-brand" />
              <Text className="text-white text-[10px] mt-1 font-medium">Pedido</Text>
            </View>
            <View className="flex-1 h-[2px] bg-brand mx-2" />
            <View className="items-center">
              <View className="w-3 h-3 rounded-full bg-brand" />
              <Text className="text-white text-[10px] mt-1 font-medium">Pagamento</Text>
            </View>
            <View className="flex-1 h-[2px] bg-white/10 mx-2" />
            <View className="items-center">
              <View className="w-3 h-3 rounded-full bg-white/20" />
              <Text className="text-ink-4 text-[10px] mt-1">Envio</Text>
            </View>
            <View className="flex-1 h-[2px] bg-white/10 mx-2" />
            <View className="items-center">
              <View className="w-3 h-3 rounded-full bg-white/20" />
              <Text className="text-ink-4 text-[10px] mt-1">Entrega</Text>
            </View>
          </View>
        </View>

        {/* Resumo do Produto */}
        <Text className="text-white font-bold text-lg mb-4">Itens do Pedido</Text>
        {orderData.items.map((item) => (
          <View key={item.id} className="flex-row items-center bg-surface/20 rounded-2xl p-3 mb-6 border border-white/5">
            <Image source={{ uri: item.image }} className="w-16 h-20 rounded-xl" />
            <View className="ml-4 flex-1">
              <Text className="text-white font-semibold">{item.name}</Text>
              <Text className="text-ink-4 text-xs">Tamanho: {item.size}</Text>
              <Text className="text-brand-light font-bold mt-1">{item.price}</Text>
            </View>
          </View>
        ))}

        {/* Detalhes de Entrega */}
        <View className="bg-surface/20 rounded-3xl p-5 mb-8 border border-white/5">
          <View className="flex-row items-center mb-4">
            <Ionicons name="location-outline" size={20} color="#a78bfa" />
            <Text className="text-white font-bold ml-2">Endereço de Entrega</Text>
          </View>
          <Text className="text-ink-4 text-sm leading-5">
            Rua das Fashionistas, 123 • Bloco A, Apt 42{"\n"}
            Jardins, São Paulo - SP{"\n"}
            CEP: 01234-567
          </Text>
          
          <View className="h-[1px] bg-white/5 my-4" />
          
          <View className="flex-row justify-between">
            <Text className="text-ink-4">Previsão de Entrega</Text>
            <Text className="text-white font-bold">{orderData.deliveryEstimate}</Text>
          </View>
        </View>

      </ScrollView>

      {/* Botões de Ação Fixos */}
      <View className="p-5 bg-background border-t border-white/5">
        <TouchableOpacity 
          activeOpacity={0.8}
          className="bg-brand h-14 rounded-2xl items-center justify-center mb-3"
        >
          <Text className="text-white font-bold text-base">Acompanhar Entrega</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="h-14 rounded-2xl items-center justify-center border border-white/10"
        >
          <Text className="text-white font-medium">Voltar para o Feed</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}