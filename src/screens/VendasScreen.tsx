import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StatusBar,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Text from '../components/Text';
import Button from '../components/Button';
import Campo from '../components/Campo';
import PecaFoto from '../components/PecaFoto';
import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../theme/colors';
import { atualizarEnvio, fetchVendas, mensagemDeErro } from '../lib/inventory';
import { SituacaoEnvio, VendaApp, VendasResponse } from '../types/api';
import { ENVIO, dataHoraCurta } from '../utils/estoque';
import { formatarMoeda } from '../utils/format';

const ABAS: (SituacaoEnvio | 'todos')[] = ['pending', 'shipped', 'delivered', 'todos'];

function endereco(e: Record<string, string>): string {
  const linha1 = [e.street, e.number].filter(Boolean).join(', ');
  const linha2 = [e.complement, e.district].filter(Boolean).join(' · ');
  const linha3 = [e.city && e.state ? `${e.city}/${e.state}` : e.city, e.postal_code].filter(Boolean).join(' · ');
  return [linha1, linha2, linha3].filter(Boolean).join('\n');
}

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <View className="flex-row justify-between gap-3">
      <Text className={`text-sm flex-1 ${forte ? 'text-ink font-sans-bold' : 'text-ink-3 font-sans-medium'}`}>{rotulo}</Text>
      <Text className={`text-sm ${forte ? 'text-ink font-sans-bold' : 'text-ink-3 font-sans-medium'}`}>{valor}</Text>
    </View>
  );
}

/** Quanto a loja recebe deste pedido: total - taxa Lookly - tarifa do Mercado Pago. */
function ResumoRepasse({ v }: { v: VendaApp }) {
  if (v.net_total == null) return null;
  const pct = Number(v.items[0]?.platform_fee_percent ?? 0);
  const taxa = Number(v.fee_total ?? 0);
  const tarifa = Number(v.mp_fee_total ?? 0);
  const pago = v.items.length > 0 && v.items.every((i) => i.payout_status === 'paid');
  return (
    <View className="mt-3 bg-surface-2 border border-surface-5 rounded-card p-3 gap-1">
      <Linha rotulo="Valor das peças" valor={formatarMoeda(v.total, true)} />
      <Linha
        rotulo={`Taxa Lookly (${String(pct).replace('.', ',')}%${v.items[0]?.fee_rule === 'demo' ? ', demonstração' : v.items[0]?.fee_rule === 'carencia' ? ', carência' : ''})`}
        valor={taxa > 0 ? `− ${formatarMoeda(taxa, true)}` : formatarMoeda(0, true)}
      />
      <Linha rotulo="Tarifa do Mercado Pago" valor={tarifa > 0 ? `− ${formatarMoeda(tarifa, true)}` : '—'} />
      <View className="border-t border-dotted border-ink-5 mt-1 pt-1">
        <Linha rotulo={pago ? 'Repassado para você' : 'Você recebe'} valor={formatarMoeda(v.net_total, true)} forte />
      </View>
    </View>
  );
}

/**
 * Vendas do app para separar e enviar (`GET /inventory/sales`). Só pedidos com
 * pagamento aprovado; mostra apenas as peças desta loja. Marcar como enviado
 * (com código de rastreio, opcional) atualiza o pedido de quem comprou quando
 * todas as lojas do pedido tiverem enviado.
 */
export default function VendasScreen(): React.ReactElement {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [aba, setAba] = useState<SituacaoEnvio | 'todos'>('pending');
  const [dados, setDados] = useState<VendasResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [enviando, setEnviando] = useState<VendaApp | null>(null);
  const [rastreio, setRastreio] = useState('');
  const [salvando, setSalvando] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setDados(await fetchVendas(aba));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [aba]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const marcar = async (venda: VendaApp, status: 'shipped' | 'delivered', codigo?: string) => {
    setSalvando(true);
    try {
      await atualizarEnvio(venda.order_id, status, codigo);
      setEnviando(null);
      load();
    } catch (e) {
      Alert.alert('Ops', mensagemDeErro(e, 'Não foi possível atualizar o pedido agora.'));
    } finally {
      setSalvando(false);
    }
  };

  const cartao = ({ item: v }: { item: VendaApp }) => (
    <View className="bg-surface border border-surface-5 rounded-card p-4 mb-3">
      <View className="flex-row items-center gap-2">
        <Text className="text-ink text-lg font-display-bold flex-1" numberOfLines={1}>
          {v.buyer_name || 'Cliente do app'}
        </Text>
        <View className={`px-2 py-0.5 ${v.fulfillment_status === 'pending' ? 'bg-seal' : 'bg-ink'}`}>
          <Text className="text-white text-xs font-sans-bold">{ENVIO[v.fulfillment_status]}</Text>
        </View>
      </View>
      <Text className="text-ink-4 text-sm font-sans-medium">
        Pedido {v.order_id.slice(0, 8).toUpperCase()} · pago em {dataHoraCurta(v.created_at)}
      </Text>

      <View className="mt-3 gap-2">
        {v.items.map((i) => (
          <View key={i.order_item_id} className="flex-row items-center gap-3">
            <View className="p-0.5 border border-ink bg-surface">
              <PecaFoto uri={i.photo} compact className="w-10 h-14" />
            </View>
            <View className="flex-1">
              <Text className="text-ink text-base font-sans-semibold" numberOfLines={1}>{i.name}</Text>
              <Text className="text-ink-4 text-sm font-sans-medium">
                {i.quantity} × {formatarMoeda(i.unit_price, true)}
                {i.tracking_code ? ` · rastreio ${i.tracking_code}` : ''}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View className="mt-3 border-t border-dotted border-ink-5 pt-3 flex-row gap-3">
        <MaterialCommunityIcons name="map-marker-outline" size={20} color={colors.ink[4]} />
        <Text className="text-ink-3 text-sm font-sans-medium flex-1">{endereco(v.shipping_address) || 'Endereço não informado'}</Text>
        <Text className="text-seal text-lg font-display-bold">{formatarMoeda(v.total, true)}</Text>
      </View>

      <ResumoRepasse v={v} />

      {v.fulfillment_status === 'pending' ? (
        <View className="mt-3">
          <Button variant="primary" label="Marcar como enviado" icon="paper-plane-outline" onPress={() => { setRastreio(''); setEnviando(v); }} />
        </View>
      ) : v.fulfillment_status === 'shipped' ? (
        <View className="mt-3">
          <Button variant="secondary" label="Marcar como entregue" icon="checkmark-done" onPress={() => marcar(v, 'delivered')} />
        </View>
      ) : null}
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScreenHeader
        title="Vendas"
        subtitle="Pedidos pagos no app"
        onBack={() => navigation.goBack()}
        right={
          <Button
            variant="icon"
            icon="receipt-outline"
            accessibilityLabel="Vendas fora do app"
            onPress={() => navigation.navigate('HistoricoEstoque', { kind: 'venda_externa', nome: 'Vendas registradas fora do app' })}
          />
        }
      />

      <View className="flex-row px-4 pt-3 gap-2">
        {ABAS.map((a) => {
          const ativa = a === aba;
          const n = dados?.counts?.[a];
          return (
            <TouchableOpacity
              key={a}
              onPress={() => setAba(a)}
              accessibilityRole="button"
              accessibilityState={{ selected: ativa }}
              className={`flex-1 min-h-11 items-center justify-center ${ativa ? 'bg-ink border-2 border-ink' : 'bg-surface border border-surface-5'}`}
            >
              <Text className={`text-sm ${ativa ? 'text-white font-sans-bold' : 'text-ink-3 font-sans-semibold'}`}>
                {a === 'todos' ? 'Todas' : ENVIO[a]}{n != null ? ` ${n}` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.ink.DEFAULT} size="large" />
        </View>
      ) : error ? (
        <TouchableOpacity onPress={load} className="mx-4 mt-6 bg-danger rounded-card p-4 min-h-12 flex-row items-center gap-3">
          <Ionicons name="cloud-offline-outline" size={22} color={colors.white} />
          <Text className="text-white text-sm font-sans-semibold flex-1">Não foi possível carregar as vendas. Toque para tentar de novo.</Text>
        </TouchableOpacity>
      ) : !dados || dados.items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="package-variant" size={56} color={colors.ink[5]} />
          <Text className="text-ink text-xl font-display-bold text-center mt-3">
            {aba === 'pending' ? 'Nada para enviar agora' : 'Nenhum pedido aqui'}
          </Text>
          <Text className="text-ink-4 text-base font-display-italic text-center mt-1">
            Quando alguém comprar uma peça sua pelo app e o pagamento for aprovado, o pedido aparece aqui.
          </Text>
        </View>
      ) : (
        <FlatList
          data={dados.items}
          keyExtractor={(v) => v.order_id}
          renderItem={cartao}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        />
      )}

      {/* Enviar: código de rastreio opcional */}
      <Modal visible={!!enviando} transparent animationType="fade" onRequestClose={() => setEnviando(null)}>
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="bg-surface rounded-card border border-surface-5 p-6 w-full gap-4">
            <Text className="text-ink font-display-bold text-xl">Marcar como enviado</Text>
            <Campo
              rotulo="Código de rastreio"
              placeholder="Ex.: BR123456789BR"
              autoCapitalize="characters"
              value={rastreio}
              onChangeText={setRastreio}
              maxLength={60}
              dica="Opcional. Aparece para você no pedido."
            />
            <Button variant="primary" label="Confirmar envio" loading={salvando} onPress={() => enviando && marcar(enviando, 'shipped', rastreio.trim() || undefined)} />
            <Button variant="secondary" label="Cancelar" onPress={() => setEnviando(null)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
