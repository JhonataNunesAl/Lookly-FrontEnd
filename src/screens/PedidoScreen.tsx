import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StatusBar, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Text from '../components/Text';
import Button from '../components/Button';
import PecaFoto from '../components/PecaFoto';
import ScreenHeader from '../components/ScreenHeader';
import { Pedido } from '../types/commerce';
import { abrirPagamento, fetchOrders } from '../lib/commerce';
import { formatarMoeda } from '../utils/format';
import { colors } from '../theme/colors';

function situacao(p: Pedido): { titulo: string; texto: string; icone: keyof typeof Ionicons.glyphMap; cor: string } {
  if (p.payment_status === 'refunded' || p.status === 'canceled') {
    return { titulo: 'Cancelado', texto: 'Este pedido foi cancelado ou estornado.', icone: 'close', cor: colors.ink.DEFAULT };
  }
  if (p.payment_status === 'refused') {
    return { titulo: 'Pagamento recusado', texto: 'Tente pagar de novo com outro meio.', icone: 'alert', cor: colors.danger };
  }
  if (p.status === 'delivered') return { titulo: 'Entregue', texto: 'Aproveite seu look!', icone: 'home', cor: colors.seal.DEFAULT };
  if (p.status === 'shipped') return { titulo: 'Enviado', texto: 'Seu pedido está a caminho.', icone: 'cube', cor: colors.seal.DEFAULT };
  if (p.status === 'paid') {
    return { titulo: 'Pagamento confirmado', texto: 'A loja está preparando seu pedido.', icone: 'checkmark', cor: colors.seal.DEFAULT };
  }
  return {
    titulo: 'Aguardando pagamento',
    texto: 'Se você já pagou, a confirmação do Mercado Pago chega em instantes.',
    icone: 'time-outline',
    cor: colors.ink.DEFAULT,
  };
}

const ETAPAS = ['Pedido', 'Pagamento', 'Envio', 'Entrega'];
function etapa(p: Pedido): number {
  return { pending: 0, paid: 1, shipped: 2, delivered: 3, canceled: 0 }[p.status] ?? 0;
}

function dataCurta(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Meus pedidos — vêm de `/orders`. O pedido recém-pago (vindo do Mercado Pago)
 *  aparece primeiro; "Atualizar" relê a confirmação do pagamento. */
export default function PedidoScreen(): React.ReactElement {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<any>();
  const destaque: string | undefined = route.params?.pedidoId;
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [erro, setErro] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    setErro(false);
    try {
      setPedidos(await fetchOrders());
    } catch {
      setErro(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const atualizar = async () => {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  };

  const ordenados = (pedidos ?? []).slice().sort((a, b) => (a.id === destaque ? -1 : b.id === destaque ? 1 : 0));

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScreenHeader
        title="Meus pedidos"
        subtitle={pedidos && pedidos.length > 0 ? `${pedidos.length} ${pedidos.length === 1 ? 'pedido' : 'pedidos'}` : undefined}
        onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainUser'))}
      />

      {pedidos === null && !erro ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.ink.DEFAULT} size="large" />
        </View>
      ) : erro ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-ink text-xl font-display-bold text-center">Não foi possível carregar seus pedidos</Text>
          <View className="mt-6 self-stretch">
            <Button variant="primary" label="Tentar de novo" icon="refresh" onPress={carregar} />
          </View>
        </View>
      ) : ordenados.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 rounded-lg bg-ink items-center justify-center mb-4">
            <Ionicons name="cube-outline" size={32} color={colors.signal.DEFAULT} />
          </View>
          <Text className="text-ink text-2xl font-display-bold text-center">Nenhum pedido ainda</Text>
          <Text className="text-ink-4 text-base text-center mt-2">Quando você finalizar uma compra, ela aparece aqui.</Text>
          <View className="mt-6 self-stretch">
            <Button variant="secondary" label="Voltar para o feed" onPress={() => navigation.navigate('MainUser')} />
          </View>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} />}
        >
          <View className="mb-3">
            <Button variant="secondary" label="Atualizar" icon="refresh" onPress={atualizar} loading={atualizando} />
          </View>
          {ordenados.map((p) => {
            const s = situacao(p);
            const atual = etapa(p);
            const end = p.shipping_address;
            return (
              <View key={p.id} className={`bg-surface rounded-card border p-4 mb-4 ${p.id === destaque ? 'border-seal border-2' : 'border-surface-5'}`}>
                <View className="flex-row items-center mb-3">
                  <View className="w-11 h-11 rounded-lg items-center justify-center" style={{ backgroundColor: s.cor }}>
                    <Ionicons name={s.icone} size={24} color={colors.white} />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-ink text-lg font-display-bold">{s.titulo}</Text>
                    <Text className="text-ink-4 text-sm">
                      Nº {p.id.slice(0, 8).toUpperCase()} · {dataCurta(p.created_at)}
                    </Text>
                  </View>
                </View>
                <Text className="text-ink-3 text-sm mb-3">{s.texto}</Text>

                {p.status !== 'canceled' && (
                  <View className="flex-row items-center mb-4">
                    {ETAPAS.map((nome, i) => (
                      <React.Fragment key={nome}>
                        <View className="items-center">
                          <View className={`w-3.5 h-3.5 rounded-sm ${i <= atual ? 'bg-seal' : 'bg-surface-5'}`} />
                          <Text className={`text-xs mt-1 ${i <= atual ? 'text-ink font-sans-bold' : 'text-ink-4'}`}>{nome}</Text>
                        </View>
                        {i < ETAPAS.length - 1 && <View className={`flex-1 h-[2px] mx-1 mb-4 ${i < atual ? 'bg-seal' : 'bg-surface-5'}`} />}
                      </React.Fragment>
                    ))}
                  </View>
                )}

                {p.items.map((it) => (
                  <View key={it.look_id} className="flex-row items-center mb-2">
                    <PecaFoto uri={it.photo} compact className="w-12 h-16 rounded-lg" />
                    <View className="flex-1 ml-3">
                      <Text className="text-ink text-base font-sans-bold" numberOfLines={1}>{it.name}</Text>
                      <Text className="text-ink-4 text-sm">{it.quantity} × {formatarMoeda(Number(it.unit_price), true)}</Text>
                    </View>
                  </View>
                ))}

                {end?.street ? (
                  <Text className="text-ink-3 text-sm mt-1 leading-5">
                    {end.street}, {end.number}{end.complement ? ` • ${end.complement}` : ''}{'\n'}
                    {end.district}, {end.city} - {end.state} · CEP {end.postal_code}
                  </Text>
                ) : null}

                <View className="flex-row items-end mt-3 pt-3 border-t border-dashed border-ink">
                  <Text className="text-ink text-lg font-display-bold">Total</Text>
                  <View className="flex-1 mx-2 mb-2 border-b border-dotted border-ink-5" />
                  <Text className="text-seal text-xl font-display-bold">{formatarMoeda(Number(p.total), true)}</Text>
                </View>

                {p.payment_url && p.payment_status !== 'approved' ? (
                  <View className="mt-3">
                    <Button
                      variant="primary"
                      label={p.payment_status === 'refused' ? 'Tentar pagar de novo' : 'Pagar agora'}
                      icon="card-outline"
                      onPress={() => abrirPagamento(p.payment_url!)}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
