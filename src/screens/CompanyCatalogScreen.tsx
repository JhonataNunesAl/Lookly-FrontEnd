import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Text from '../components/Text';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { deleteLook } from '../lib/sellers';
import { fetchCategories } from '../lib/categories';
import { alterarStatusPeca, fetchItensEstoque, mensagemDeErro } from '../lib/inventory';
import { CategoryResponse, ItemEstoque, LookResponse, MovimentoCreate, OrdemEstoque, SituacaoEstoque } from '../types/api';
import { contar, formatarMoeda } from '../utils/format';
import { ORDENS, SITUACOES, rotuloCondicao } from '../utils/estoque';
import { ESTOQUE_BAIXO } from '../utils/loja';
import Button from '../components/Button';
import PecaFoto from '../components/PecaFoto';
import MovimentoSheet from '../components/MovimentoSheet';
import { refDaPeca } from '../components/PecaRow';

const STATUS_ROTULO: Record<string, string> = {
  draft: 'Pausada (fora do feed)',
  under_review: 'Em revisão',
  removed: 'Removida',
};

/**
 * Estoque da loja (aba "Itens"): cada peça com o que está à venda, reservado e
 * vendido, há quanto tempo está parada, e as ações do dia a dia de um brechó —
 * registrar venda feita fora do app, reservar para alguém, repor, corrigir a
 * contagem, pausar. A busca, os filtros e a ordem rodam no servidor
 * (`GET /inventory/items`), então funcionam com milhares de peças.
 */
export default function CompanyCatalogScreen(): React.ReactElement {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [itens, setItens] = useState<ItemEstoque[]>([]);
  const [counts, setCounts] = useState<Partial<Record<SituacaoEstoque, number>>>({});
  const [total, setTotal] = useState(0);
  const [categorias, setCategorias] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [error, setError] = useState(false);

  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [situacao, setSituacao] = useState<SituacaoEstoque>('todos');
  const [categoria, setCategoria] = useState<string | null>(null);
  const [ordem, setOrdem] = useState<OrdemEstoque>('recentes');
  const [ordemAberta, setOrdemAberta] = useState(false);

  const [movimentando, setMovimentando] = useState<LookResponse | null>(null);
  const [tipoInicial, setTipoInicial] = useState<MovimentoCreate['kind']>('venda_externa');
  const [menuDe, setMenuDe] = useState<ItemEstoque | null>(null);

  const offsetRef = useRef<number | null>(0);
  const carregandoMaisRef = useRef(false);
  const pedidoRef = useRef(0);

  // Busca com atraso: não dispara uma consulta por letra digitada.
  useEffect(() => {
    const t = setTimeout(() => setBuscaAplicada(busca), 350);
    return () => clearTimeout(t);
  }, [busca]);

  const load = useCallback(async (silencioso = false) => {
    const meu = ++pedidoRef.current;
    if (!silencioso) setLoading(true);
    setError(false);
    try {
      const res = await fetchItensEstoque({ q: buscaAplicada, situacao, categoryId: categoria, sort: ordem });
      if (meu !== pedidoRef.current) return; // resposta antiga de um filtro já trocado
      setItens(res.items);
      setCounts(res.counts);
      setTotal(res.total);
      offsetRef.current = res.next_offset;
    } catch {
      if (meu === pedidoRef.current) setError(true);
    } finally {
      if (meu === pedidoRef.current) {
        setLoading(false);
        setAtualizando(false);
      }
    }
  }, [buscaAplicada, situacao, categoria, ordem]);

  useFocusEffect(useCallback(() => { load(itens.length > 0); }, [load])); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchCategories().then(setCategorias).catch(() => {});
  }, []);

  const carregarMais = useCallback(async () => {
    if (offsetRef.current == null || carregandoMaisRef.current) return;
    carregandoMaisRef.current = true;
    const meu = pedidoRef.current;
    try {
      const res = await fetchItensEstoque({
        q: buscaAplicada, situacao, categoryId: categoria, sort: ordem, offset: offsetRef.current,
      });
      if (meu !== pedidoRef.current) return;
      offsetRef.current = res.next_offset;
      setItens((atual) => [...atual, ...res.items]);
    } catch {
      // tenta de novo no próximo fim de lista
    } finally {
      carregandoMaisRef.current = false;
    }
  }, [buscaAplicada, situacao, categoria, ordem]);

  /** Depois de uma movimentação: atualiza a peça na lista e as contagens. */
  const aposMudanca = () => load(true);

  const abrirMovimento = (item: LookResponse, tipo: MovimentoCreate['kind']) => {
    setMenuDe(null);
    setTipoInicial(tipo);
    setMovimentando(item);
  };

  const alternarPausa = async (item: ItemEstoque) => {
    setMenuDe(null);
    const novo = item.status === 'active' ? 'draft' : 'active';
    try {
      await alterarStatusPeca(item.id, novo);
      aposMudanca();
    } catch (e) {
      Alert.alert('Ops', mensagemDeErro(e, 'Não foi possível mudar a peça agora.'));
    }
  };

  const confirmarRemocao = (item: ItemEstoque) => {
    setMenuDe(null);
    Alert.alert(
      'Apagar peça',
      `“${item.name}” sai do catálogo e do feed. Isso não pode ser desfeito. Se só quer tirar do ar por um tempo, use "Pausar".`,
      [
        { text: 'Manter', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLook(item.id);
              aposMudanca();
            } catch (e) {
              Alert.alert('Não foi possível apagar', mensagemDeErro(e, 'Tente de novo em instantes.'));
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: ItemEstoque }) => {
    const rotuloStatus = STATUS_ROTULO[item.status];
    const reservado = item.reserved_quantity ?? 0;
    const disp = item.available_quantity;
    const corEstoque = item.stock_quantity <= 0 ? colors.danger : disp <= ESTOQUE_BAIXO ? colors.warning : colors.success;
    const condicao = rotuloCondicao(item.condition);
    const parado = item.status === 'active' && item.stock_quantity > 0 && (item.days_without_sale ?? 0) >= 30;

    return (
      <View className="bg-surface rounded-card border border-surface-5 p-3 mb-3">
        <View className="flex-row">
          <View className="p-1 border border-ink bg-surface self-start">
            <PecaFoto uri={item.photos[0]} compact className="w-20 h-28" />
          </View>

          <View className="flex-1 ml-3">
            <Text className="text-ink text-lg font-display-bold" numberOfLines={2}>{item.name}</Text>
            <Text className="text-ink-4 text-sm font-mono" numberOfLines={1}>
              {[refDaPeca(item.id), item.brand, condicao].filter(Boolean).join(' · ')}
            </Text>
            <Text className="text-seal text-xl font-display-bold">
              {item.price != null ? formatarMoeda(item.price, true) : 'Sem preço'}
            </Text>

            {/* Estoque: ícone + texto, nunca só a cor */}
            <View className="flex-row items-center mt-1 gap-1.5">
              <MaterialCommunityIcons
                name={item.stock_quantity > 0 ? 'package-variant-closed' : 'package-variant-closed-remove'}
                size={18}
                color={corEstoque}
              />
              <Text className="text-sm font-sans-semibold" style={{ color: corEstoque }}>
                {item.stock_quantity <= 0
                  ? 'Esgotada'
                  : reservado > 0
                    ? `${disp} à venda · ${reservado} reservada${reservado > 1 ? 's' : ''}`
                    : `${disp} em estoque`}
              </Text>
            </View>
            {rotuloStatus ? (
              <View className="flex-row items-center mt-0.5 gap-1.5">
                <MaterialCommunityIcons name={item.status === 'draft' ? 'pause-circle-outline' : 'clock-outline'} size={18} color={colors.warning} />
                <Text className="text-warning text-sm font-sans-semibold">{rotuloStatus}</Text>
              </View>
            ) : null}
            <Text className="text-ink-3 text-sm font-display-italic mt-0.5">
              {item.units_sold > 0
                ? `${contar(item.units_sold, 'vendida', 'vendidas')} · ${formatarMoeda(item.revenue)}`
                : 'Nenhuma venda ainda'}
              {parado ? ` · ${item.days_without_sale} dias parada` : ''}
            </Text>
          </View>
        </View>

        {/* Ações rápidas */}
        <View className="flex-row border-t border-dotted border-ink-5 mt-3">
          <TouchableOpacity
            onPress={() => abrirMovimento(item, 'venda_externa')}
            disabled={item.stock_quantity <= 0}
            accessibilityRole="button"
            accessibilityLabel={`Registrar venda de ${item.name}`}
            className="flex-1 min-h-12 items-center justify-center"
          >
            <Text className={`text-base font-sans-bold underline ${item.stock_quantity <= 0 ? 'text-ink-5 line-through' : 'text-ink'}`}>Vendi</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => abrirMovimento(item, item.stock_quantity <= 0 ? 'entrada' : 'reserva')}
            accessibilityRole="button"
            accessibilityLabel={`Movimentar estoque de ${item.name}`}
            className="flex-1 min-h-12 items-center justify-center"
          >
            <Text className="text-ink text-base font-sans-bold underline">Estoque</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddProduct', { look: item })}
            accessibilityRole="button"
            accessibilityLabel={`Editar ${item.name}`}
            className="flex-1 min-h-12 items-center justify-center"
          >
            <Text className="text-ink text-base font-sans-bold underline">Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMenuDe(item)}
            accessibilityRole="button"
            accessibilityLabel={`Mais ações para ${item.name}`}
            className="w-14 min-h-12 items-center justify-center"
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.ink.DEFAULT} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const opcoesCategoria = [{ id: null as string | null, name: 'Todas' }, ...categorias];
  const rotuloOrdem = ORDENS.find((o) => o.id === ordem)?.rotulo ?? '';

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Cabeçalho (aba raiz: sem "voltar") */}
      <SafeAreaView edges={['top']} className="bg-background">
        <View className="flex-row items-center px-5 min-h-16 py-2 gap-3">
          <View className="flex-1">
            <Text className="text-ink text-3xl font-display-bold">Estoque</Text>
            <Text className="text-ink-3 text-base font-display-italic">
              {counts.todos != null ? contar(counts.todos, 'peça cadastrada', 'peças cadastradas') : 'Suas peças'}
            </Text>
          </View>
          <Button
            variant="icon"
            icon="time-outline"
            accessibilityLabel="Histórico de movimentações"
            onPress={() => navigation.navigate('HistoricoEstoque')}
          />
          <Button
            variant="icon"
            icon="add"
            accessibilityLabel="Cadastrar nova peça"
            onPress={() => navigation.navigate('AddProduct')}
          />
        </View>
        <View className="h-[5px] border-t-2 border-b border-ink" />
      </SafeAreaView>

      {/* Busca */}
      <View className="mx-4 mt-3 flex-row items-center bg-surface border border-surface-5 border-b-2 border-b-ink px-3 min-h-14">
        <MaterialCommunityIcons name="magnify" size={24} color={colors.ink[4]} />
        <TextInput
          placeholder="Nome, descrição ou marca"
          placeholderTextColor={colors.ink[5]}
          className="flex-1 ml-3 text-ink text-base font-sans-medium"
          textAlignVertical="center"
          style={{ paddingVertical: 0 }}
          value={busca}
          onChangeText={setBusca}
          accessibilityLabel="Procurar no estoque"
        />
        {busca.length > 0 && (
          <TouchableOpacity
            onPress={() => setBusca('')}
            accessibilityRole="button"
            accessibilityLabel="Limpar busca"
            className="w-12 h-12 -mr-3 items-center justify-center"
          >
            <MaterialCommunityIcons name="close" size={22} color={colors.ink.DEFAULT} />
          </TouchableOpacity>
        )}
      </View>

      {/* Situação (com contagem) */}
      <View>
        <FlatList
          horizontal
          data={SITUACOES}
          keyExtractor={(s) => s.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, gap: 8 }}
          renderItem={({ item: s }) => {
            const ativa = situacao === s.id;
            const n = counts[s.id];
            return (
              <TouchableOpacity
                onPress={() => setSituacao(s.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: ativa }}
                className={`min-h-11 px-3 flex-row items-center gap-1.5 ${ativa ? 'bg-ink border-2 border-ink' : 'bg-surface border border-surface-5'}`}
              >
                <Text className={`text-sm ${ativa ? 'text-white font-sans-bold' : 'text-ink-3 font-sans-semibold'}`}>{s.rotulo}</Text>
                {n != null ? (
                  <Text className={`text-sm font-sans-bold ${ativa ? 'text-signal' : 'text-ink-4'}`}>{n}</Text>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Categoria + ordem */}
      <View className="flex-row items-center">
        {categorias.length > 0 ? (
          <FlatList
            horizontal
            data={opcoesCategoria}
            keyExtractor={(c) => c.id ?? 'todas'}
            showsHorizontalScrollIndicator={false}
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, gap: 18 }}
            renderItem={({ item: c }) => {
              const ativa = categoria === c.id;
              return (
                <TouchableOpacity
                  onPress={() => setCategoria(c.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ativa }}
                  className="min-h-12 justify-center"
                >
                  <Text
                    className={`text-base ${ativa ? 'text-seal font-display-bold' : 'text-ink-3 font-display-italic'}`}
                    style={ativa ? { textDecorationLine: 'underline', textDecorationColor: colors.seal.DEFAULT } : undefined}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        ) : <View className="flex-1" />}
        <TouchableOpacity
          onPress={() => setOrdemAberta(true)}
          accessibilityRole="button"
          accessibilityLabel={`Ordenar: ${rotuloOrdem}`}
          className="min-h-12 px-4 flex-row items-center gap-1 border-l border-surface-5"
        >
          <MaterialCommunityIcons name="sort" size={20} color={colors.ink.DEFAULT} />
          <Text className="text-ink text-sm font-sans-bold">Ordenar</Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.ink.DEFAULT} size="large" />
        </View>
      ) : error ? (
        <TouchableOpacity
          onPress={() => load()}
          accessibilityRole="button"
          className="mx-4 mt-6 bg-danger rounded-card p-4 min-h-12 flex-row items-center gap-3"
        >
          <Ionicons name="cloud-offline-outline" size={22} color={colors.white} />
          <Text className="text-white text-sm font-sans-semibold flex-1">
            Não foi possível carregar seu estoque. Toque para tentar de novo.
          </Text>
        </TouchableOpacity>
      ) : itens.length > 0 ? (
        <FlatList
          data={itens}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onEndReached={carregarMais}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={atualizando} onRefresh={() => { setAtualizando(true); load(true); }} />}
          ListHeaderComponent={
            total > itens.length || situacao !== 'todos' || buscaAplicada || categoria ? (
              <Text className="text-ink-4 text-sm font-display-italic mb-2">
                {contar(total, 'peça encontrada', 'peças encontradas')} · {rotuloOrdem.toLowerCase()}
              </Text>
            ) : null
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="hanger" size={56} color={colors.ink[5]} />
          <Text className="text-ink text-xl font-display-bold text-center mt-3">
            {counts.todos === 0 ? 'Nenhuma peça cadastrada ainda' : 'Nenhuma peça aqui'}
          </Text>
          <Text className="text-ink-4 text-base font-display-italic text-center mt-1">
            {counts.todos === 0 ? 'Cadastre a primeira e ela entra no feed.' : 'Tente outra busca, situação ou categoria.'}
          </Text>
          {counts.todos === 0 && (
            <View className="mt-6 self-stretch">
              <Button variant="primary" label="Cadastrar peça" icon="add" onPress={() => navigation.navigate('AddProduct')} />
            </View>
          )}
        </View>
      )}

      {/* Ordenar */}
      <Modal visible={ordemAberta} transparent animationType="fade" onRequestClose={() => setOrdemAberta(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setOrdemAberta(false)} className="flex-1 bg-black/60 justify-end">
          <View className="bg-background rounded-t-card border-t-2 border-ink p-4 pb-8">
            <Text className="text-ink text-xl font-display-bold mb-2 px-1">Ordenar por</Text>
            {ORDENS.map((o) => (
              <TouchableOpacity
                key={o.id}
                onPress={() => { setOrdem(o.id as OrdemEstoque); setOrdemAberta(false); }}
                accessibilityRole="button"
                accessibilityState={{ selected: ordem === o.id }}
                className="min-h-12 flex-row items-center px-1 border-b border-dotted border-ink-5"
              >
                <Text className={`flex-1 text-base ${ordem === o.id ? 'text-seal font-sans-bold' : 'text-ink font-sans-medium'}`}>{o.rotulo}</Text>
                {ordem === o.id ? <Ionicons name="checkmark" size={20} color={colors.seal.DEFAULT} /> : null}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Mais ações */}
      <Modal visible={!!menuDe} transparent animationType="fade" onRequestClose={() => setMenuDe(null)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setMenuDe(null)} className="flex-1 bg-black/60 justify-end">
          <View className="bg-background rounded-t-card border-t-2 border-ink p-4 pb-8">
            <Text className="text-ink text-xl font-display-bold px-1" numberOfLines={1}>{menuDe?.name}</Text>
            {menuDe ? (
              [
                { icone: 'package-variant-plus', rotulo: 'Chegou peça (entrada)', acao: () => abrirMovimento(menuDe, 'entrada') },
                { icone: 'bookmark-outline', rotulo: 'Reservar para alguém', acao: () => abrirMovimento(menuDe, 'reserva') },
                ...((menuDe.reserved_quantity ?? 0) > 0
                  ? [{ icone: 'bookmark-off-outline', rotulo: 'Desfazer reserva', acao: () => abrirMovimento(menuDe, 'liberacao') }]
                  : []),
                { icone: 'counter', rotulo: 'Corrigir contagem', acao: () => abrirMovimento(menuDe, 'ajuste') },
                { icone: 'package-variant-remove', rotulo: 'Perda ou avaria', acao: () => abrirMovimento(menuDe, 'perda') },
                { icone: 'keyboard-return', rotulo: 'Devolução', acao: () => abrirMovimento(menuDe, 'devolucao') },
                {
                  icone: 'history',
                  rotulo: 'Histórico da peça',
                  acao: () => { const m = menuDe; setMenuDe(null); navigation.navigate('HistoricoEstoque', { lookId: m.id, nome: m.name }); },
                },
                ...(menuDe.status === 'active' || menuDe.status === 'draft'
                  ? [{
                    icone: menuDe.status === 'active' ? 'pause-circle-outline' : 'play-circle-outline',
                    rotulo: menuDe.status === 'active' ? 'Pausar (tirar do feed)' : 'Reativar no feed',
                    acao: () => alternarPausa(menuDe),
                  }]
                  : []),
                { icone: 'trash-can-outline', rotulo: 'Apagar peça', acao: () => confirmarRemocao(menuDe), perigo: true },
              ].map((op: any) => (
                <TouchableOpacity
                  key={op.rotulo}
                  onPress={op.acao}
                  accessibilityRole="button"
                  className="min-h-12 flex-row items-center gap-3 px-1 border-b border-dotted border-ink-5"
                >
                  <MaterialCommunityIcons name={op.icone} size={22} color={op.perigo ? colors.danger : colors.ink.DEFAULT} />
                  <Text className={`text-base font-sans-semibold ${op.perigo ? 'text-danger' : 'text-ink'}`}>{op.rotulo}</Text>
                </TouchableOpacity>
              ))
            ) : null}
          </View>
        </TouchableOpacity>
      </Modal>

      <MovimentoSheet
        look={movimentando}
        tipoInicial={tipoInicial}
        onClose={() => setMovimentando(null)}
        onDone={() => { setMovimentando(null); aposMudanca(); }}
      />
    </View>
  );
}
