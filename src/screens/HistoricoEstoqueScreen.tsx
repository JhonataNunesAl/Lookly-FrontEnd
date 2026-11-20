import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StatusBar, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Text from '../components/Text';
import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../theme/colors';
import { fetchMovimentos } from '../lib/inventory';
import { Movimento, TipoMovimento } from '../types/api';
import { RootStackParamList } from '../types';
import { MOVIMENTOS, dataHoraCurta, rotuloCanal } from '../utils/estoque';
import { formatarMoeda } from '../utils/format';

const FILTROS: { id: TipoMovimento | null; rotulo: string }[] = [
  { id: null, rotulo: 'Tudo' },
  { id: 'venda_externa', rotulo: 'Vendas fora do app' },
  { id: 'venda_app', rotulo: 'Vendas no app' },
  { id: 'entrada', rotulo: 'Entradas' },
  { id: 'reserva', rotulo: 'Reservas' },
  { id: 'ajuste', rotulo: 'Ajustes' },
  { id: 'perda', rotulo: 'Perdas' },
  { id: 'devolucao', rotulo: 'Devoluções' },
];

/** Histórico de estoque: quem mexeu, quando, quanto e por quê (`GET /inventory/movements`). */
export default function HistoricoEstoqueScreen(): React.ReactElement {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'HistoricoEstoque'>>();
  const lookId = params?.lookId;
  const [kind, setKind] = useState<TipoMovimento | null>((params?.kind as TipoMovimento) ?? null);
  const [itens, setItens] = useState<Movimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const carregandoRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const r = await fetchMovimentos({ lookId, kind: kind ?? undefined });
      setItens(r.items);
      cursorRef.current = r.next_cursor;
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [lookId, kind]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const mais = async () => {
    if (!cursorRef.current || carregandoRef.current) return;
    carregandoRef.current = true;
    try {
      const r = await fetchMovimentos({ lookId, kind: kind ?? undefined, cursor: cursorRef.current });
      cursorRef.current = r.next_cursor;
      setItens((a) => [...a, ...r.items]);
    } catch {
      // tenta de novo no próximo fim de lista
    } finally {
      carregandoRef.current = false;
    }
  };

  const linha = ({ item: m }: { item: Movimento }) => {
    const info = MOVIMENTOS[m.kind] ?? MOVIMENTOS.ajuste;
    const ehReserva = m.kind === 'reserva' || m.kind === 'liberacao';
    const sinal = m.quantity > 0 ? `+${m.quantity}` : String(m.quantity);
    const cor = ehReserva ? colors.info : m.quantity >= 0 ? colors.success : colors.seal.DEFAULT;
    const venda = m.kind === 'venda_externa' || m.kind === 'venda_app';
    return (
      <View className="flex-row bg-surface border border-surface-5 rounded-card p-3 mb-2 gap-3">
        <View className="w-10 h-10 rounded-lg bg-ink items-center justify-center">
          <MaterialCommunityIcons name={info.icone} size={22} color={colors.white} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-ink text-base font-sans-bold flex-1" numberOfLines={1}>{info.rotulo}</Text>
            <Text className="text-base font-display-bold" style={{ color: cor }}>
              {sinal}{ehReserva ? ' reserv.' : ''}
            </Text>
          </View>
          {!lookId ? <Text className="text-ink-3 text-sm font-display-italic" numberOfLines={1}>{m.look_name}</Text> : null}
          <Text className="text-ink-4 text-sm font-sans-medium">
            {dataHoraCurta(m.created_at)} · ficou {m.stock_after} em estoque{m.reserved_after ? ` (${m.reserved_after} reserv.)` : ''}
          </Text>
          {venda && m.unit_price != null ? (
            <Text className="text-ink-3 text-sm font-sans-semibold">
              {formatarMoeda(Number(m.unit_price) * Math.abs(m.quantity), true)}
              {m.channel ? ` · ${rotuloCanal(m.channel)}` : m.kind === 'venda_app' ? ' · App Lookly' : ''}
            </Text>
          ) : null}
          {m.note ? <Text className="text-ink-3 text-sm font-display-italic">“{m.note}”</Text> : null}
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScreenHeader
        title={lookId ? 'Histórico da peça' : 'Histórico do estoque'}
        subtitle={params?.nome ?? 'Entradas, vendas, reservas e ajustes'}
        onBack={() => navigation.goBack()}
      />

      <View>
        <FlatList
          horizontal
          data={FILTROS}
          keyExtractor={(f) => f.id ?? 'tudo'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
          renderItem={({ item: f }) => {
            const ativo = kind === f.id;
            return (
              <TouchableOpacity
                onPress={() => setKind(f.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: ativo }}
                className={`min-h-11 px-3 justify-center ${ativo ? 'bg-ink border-2 border-ink' : 'bg-surface border border-surface-5'}`}
              >
                <Text className={`text-sm ${ativo ? 'text-white font-sans-bold' : 'text-ink-3 font-sans-semibold'}`}>{f.rotulo}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.ink.DEFAULT} size="large" />
        </View>
      ) : error ? (
        <TouchableOpacity onPress={load} className="mx-4 mt-6 bg-danger rounded-card p-4 min-h-12 flex-row items-center gap-3">
          <Ionicons name="cloud-offline-outline" size={22} color={colors.white} />
          <Text className="text-white text-sm font-sans-semibold flex-1">Não foi possível carregar o histórico. Toque para tentar de novo.</Text>
        </TouchableOpacity>
      ) : itens.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="history" size={56} color={colors.ink[5]} />
          <Text className="text-ink text-xl font-display-bold text-center mt-3">Nada registrado aqui</Text>
          <Text className="text-ink-4 text-base font-display-italic text-center mt-1">
            Cada venda, entrada, reserva ou ajuste de estoque aparece nesta lista.
          </Text>
        </View>
      ) : (
        <FlatList
          data={itens}
          keyExtractor={(m) => m.id}
          renderItem={linha}
          onEndReached={mais}
          onEndReachedThreshold={0.4}
          contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 24 }}
        />
      )}
    </View>
  );
}
