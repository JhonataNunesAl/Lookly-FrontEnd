import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  View,
  ScrollView,
  StatusBar,
} from 'react-native';
import Text from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Order } from '../types/commerce';
import { fetchOrders } from '../lib/commerce';
import { colors } from '../theme/colors';
import Button from '../components/Button';
import PecaFoto from '../components/PecaFoto';
import ScreenHeader from '../components/ScreenHeader';
import { formatarMoeda } from '../utils/format';

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
      <View className="flex-1 bg-background">
        <ScreenHeader title="Pedido" onBack={() => navigation.goBack()} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.ink.DEFAULT} size="large" />
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View className="flex-1 bg-background">
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <ScreenHeader title="Pedidos" onBack={() => navigation.goBack()} />
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 rounded-lg bg-ink items-center justify-center mb-4">
            <Ionicons name="cube-outline" size={32} color={colors.signal.DEFAULT} />
          </View>
          <Text className="text-ink text-2xl font-display-bold text-center">Nenhum pedido ainda</Text>
          <Text className="text-ink-4 text-base text-center mt-2">Quando você finalizar uma compra, ela aparece aqui.</Text>
        </View>
      </View>
    );
  }

  const subOrder = order.subOrders[0];
  const etapas = ['Pedido', 'Pagamento', 'Envio', 'Entrega'];
  const etapaAtual = { pending_payment: 0, paid: 1, preparing: 1, shipped: 2, delivered: 3, cancelled: 0 }[
    subOrder?.status ?? 'preparing'
  ] ?? 1;

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScreenHeader title="Pedido realizado" subtitle={`Nº ${order.id}`} onBack={() => navigation.goBack()} />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>

        {/* Situação: faixa preta com o status por extenso */}
        <View className="bg-ink rounded-card p-5 mb-3">
          <View className="flex-row items-center gap-3 mb-5">
            <View className="w-12 h-12 rounded-lg bg-seal items-center justify-center">
              <Ionicons name="checkmark" size={30} color={colors.white} />
            </View>
            <View className="flex-1">
              <Text className="text-white text-lg font-display-bold">{STATUS_LABEL[subOrder?.status ?? 'preparing']}</Text>
              <Text className="text-white text-sm">Estamos preparando seu look com cuidado.</Text>
            </View>
          </View>

          {/* Etapas: quadrados preenchidos até a etapa atual */}
          <View className="flex-row items-center">
            {etapas.map((nome, i) => (
              <React.Fragment key={nome}>
                <View className="items-center">
                  <View className={`w-4 h-4 rounded-sm ${i <= etapaAtual ? 'bg-seal' : 'bg-ink-3'}`} />
                  <Text className={`text-xs mt-1.5 ${i <= etapaAtual ? 'text-white font-sans-bold' : 'text-white/70'}`}>{nome}</Text>
                </View>
                {i < etapas.length - 1 && (
                  <View className={`flex-1 h-[3px] mx-1 mb-5 ${i < etapaAtual ? 'bg-seal' : 'bg-ink-3'}`} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Itens */}
        {subOrder?.items.map((item) => (
          <View key={item.id} className="flex-row items-center bg-surface rounded-card border border-surface-5 p-3 mb-2">
            <PecaFoto uri={item.photo} compact className="w-16 h-20 rounded-lg" />
            <View className="ml-3 flex-1">
              <Text className="text-ink text-base font-sans-bold" numberOfLines={2}>{item.lookName}</Text>
              {item.selectedSize ? (
                <Text className="text-ink-4 text-sm">Tamanho {item.selectedSize}</Text>
              ) : null}
              <Text className="text-ink text-lg font-display-bold mt-0.5">{formatarMoeda(Number(item.unitPrice), true)}</Text>
            </View>
          </View>
        ))}

        {/* Entrega */}
        <View className="bg-surface rounded-card border border-surface-5 p-5 mt-1">
          <View className="flex-row items-center gap-3 mb-3">
            <View className="w-10 h-10 rounded-lg bg-ink items-center justify-center">
              <Ionicons name="location" size={22} color={colors.white} />
            </View>
            <Text className="text-ink text-base font-sans-bold">Endereço de entrega</Text>
          </View>
          <Text className="text-ink-3 text-base leading-6">
            {order.address.line1}{order.address.line2 ? ` • ${order.address.line2}` : ''}{"\n"}
            {order.address.neighborhood}, {order.address.city} - {order.address.state}{"\n"}
            CEP: {order.address.zipCode}
          </Text>
        </View>

      </ScrollView>

      {/* Ações fixas */}
      <SafeAreaView edges={['bottom']} className="bg-background">
        <View className="px-4 pt-3 pb-3 gap-y-2">
          <Button
            variant="primary"
            label="Acompanhar entrega"
            icon="navigate-outline"
            onPress={() => navigation.navigate('ComingSoon', {
              title: 'Rastreio de entrega',
              description: 'Acompanhamento de envio em tempo real ainda não existe — depende da camada de comércio e de integração com transportadora.',
              icon: 'navigate-outline',
            })}
          />
          <Button variant="secondary" label="Voltar para o feed" onPress={() => navigation.navigate('MainUser')} />
        </View>
      </SafeAreaView>
    </View>
  );
}
