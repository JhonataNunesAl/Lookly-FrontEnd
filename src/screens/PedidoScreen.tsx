import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  SafeAreaView,
  ScrollView,
  Image,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Order } from '../types/commerce';
import { fetchOrders } from '../lib/commerce';
import { colors } from '../theme/colors';
import Button from '../components/Button';

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Aguardando pagamento',
  paid: 'Pagamento confirmado',
  preparing: 'Preparando envio',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

/**
 * Confirmação de pedido — rascunho de comércio (ver src/lib/commerce.ts).
 * Antes todo botão daqui era `onPress` ausente; "Voltar para o Feed" agora
 * navega de verdade, "Acompanhar Entrega" leva pra "Em breve" (rastreio não
 * existe) em vez de não fazer nada.
 */
export default function PedidoScreen(): React.ReactElement {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders().then((orders) => {
      setOrder(orders[0] ?? null);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={colors.brand.DEFAULT} size="large" />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-10">
        <Ionicons name="cube-outline" size={40} color={colors.ink[5]} />
        <Text className="text-ink text-lg font-bold text-center mt-4">Nenhum pedido encontrado</Text>
      </SafeAreaView>
    );
  }

  const subOrder = order.subOrders[0];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" />

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>

        {/* Header de Sucesso */}
        <View className="items-center py-10">
          <View className="w-20 h-20 bg-success/10 rounded-full items-center justify-center mb-4">
            <Ionicons name="checkmark-circle" size={60} color={colors.success} />
          </View>
          <Text className="text-ink text-2xl font-bold">Pedido Realizado!</Text>
          <Text className="text-ink-4 mt-1 text-center">
            Obrigado pela compra. Estamos preparando seu look com cuidado.
          </Text>
        </View>

        {/* Card de Status */}
        <View className="bg-surface border border-surface-4 rounded-card p-5 mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-ink-4 text-xs uppercase tracking-tighter">Número do Pedido</Text>
              <Text className="text-ink font-bold text-lg">{order.id}</Text>
            </View>
            <View className="bg-brand/10 border border-brand/25 px-3 py-1 rounded-full">
              <Text className="text-brand font-bold text-xs">{STATUS_LABEL[subOrder?.status ?? 'preparing']}</Text>
            </View>
          </View>

          {/* Stepper de Status Simplificado */}
          <View className="flex-row items-center justify-between mt-2 px-2">
            <View className="items-center">
              <View className="w-3 h-3 rounded-full bg-brand" />
              <Text className="text-ink text-[10px] mt-1 font-medium">Pedido</Text>
            </View>
            <View className="flex-1 h-[2px] bg-brand mx-2" />
            <View className="items-center">
              <View className="w-3 h-3 rounded-full bg-brand" />
              <Text className="text-ink text-[10px] mt-1 font-medium">Pagamento</Text>
            </View>
            <View className="flex-1 h-[2px] bg-surface-5 mx-2" />
            <View className="items-center">
              <View className="w-3 h-3 rounded-full bg-surface-5" />
              <Text className="text-ink-4 text-[10px] mt-1">Envio</Text>
            </View>
            <View className="flex-1 h-[2px] bg-surface-5 mx-2" />
            <View className="items-center">
              <View className="w-3 h-3 rounded-full bg-surface-5" />
              <Text className="text-ink-4 text-[10px] mt-1">Entrega</Text>
            </View>
          </View>
        </View>

        {/* Resumo do Produto */}
        <Text className="text-ink font-bold text-lg mb-4">Itens do Pedido</Text>
        {subOrder?.items.map((item) => (
          <View key={item.id} className="flex-row items-center bg-surface rounded-2xl p-3 mb-6 border border-surface-4">
            <Image source={{ uri: item.photo }} className="w-16 h-20 rounded-xl bg-surface-4" />
            <View className="ml-4 flex-1">
              <Text className="text-ink font-semibold">{item.lookName}</Text>
              {item.selectedSize ? (
                <Text className="text-ink-4 text-xs">Tamanho: {item.selectedSize}</Text>
              ) : null}
              <Text className="text-brand font-bold mt-1">R$ {Number(item.unitPrice).toFixed(2)}</Text>
            </View>
          </View>
        ))}

        {/* Detalhes de Entrega */}
        <View className="bg-surface rounded-card p-5 mb-8 border border-surface-4">
          <View className="flex-row items-center mb-4">
            <Ionicons name="location-outline" size={20} color={colors.brand.DEFAULT} />
            <Text className="text-ink font-bold ml-2">Endereço de Entrega</Text>
          </View>
          <Text className="text-ink-4 text-sm leading-5">
            {order.address.line1}{order.address.line2 ? ` • ${order.address.line2}` : ''}{"\n"}
            {order.address.neighborhood}, {order.address.city} - {order.address.state}{"\n"}
            CEP: {order.address.zipCode}
          </Text>
        </View>

      </ScrollView>

      {/* Botões de Ação Fixos */}
      <View className="p-5 bg-background border-t border-surface-4 gap-y-3">
        <Button
          variant="primary"
          label="Acompanhar Entrega"
          onPress={() => navigation.navigate('ComingSoon', {
            title: 'Rastreio de entrega',
            description: 'Acompanhamento de envio em tempo real ainda não existe — depende da camada de comércio e de integração com transportadora.',
            icon: 'navigate-outline',
          })}
        />
        <Button variant="secondary" label="Voltar para o Feed" onPress={() => navigation.navigate('MainUser')} />
      </View>
    </SafeAreaView>
  );
}
