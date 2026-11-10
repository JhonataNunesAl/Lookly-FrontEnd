import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LookResponse, SellerResponse, CategoryResponse } from '../types/api';
import { searchLooks, searchSellers } from '../lib/sellers';
import { fetchCategories } from '../lib/categories';
import { saveLook } from '../lib/feed';
import { addToCart, mensagemDeErroCarrinho } from '../lib/commerce';
import PecaRow, { refDaPeca } from '../components/PecaRow';
import Toast from '../components/Toast';
import ProductDetailSheet from '../components/ProductDetailSheet';
import FiltroSheet from '../components/FiltroSheet';
import Button from '../components/Button';
import {
  FILTROS_VAZIOS,
  FiltrosBusca,
  contarFiltros,
  descreverFiltros,
  removerFiltro,
} from '../lib/filtros';
import { colors } from '../theme/colors';
import { contar } from '../utils/format';

/**
 * Busca real de looks e lojas (GET /api/looks/search, GET /api/sellers/search).
 * Antes rodava 100% sobre um catálogo mockado local (`data/products.ts`) —
 * curtir/salvar ali nunca tocava o backend. O `FilterSheet.tsx` antigo foi
 * removido junto (filtrava estilo/marca, que não existem na peça); o filtro
 * de hoje (`FiltroSheet`) só usa o que o servidor sabe filtrar: preço, tamanho,
 * estoque e ordem.
 */

type Aba = 'looks' | 'lojas';
const DEBOUNCE_MS = 400;

export default function SearchScreen(): React.ReactElement {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [aba, setAba] = useState<Aba>('looks');
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosBusca>(FILTROS_VAZIOS);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const [looks, setLooks] = useState<LookResponse[]>([]);
  const [sellers, setSellers] = useState<SellerResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [detailLook, setDetailLook] = useState<LookResponse | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cada busca ganha um número; resposta de busca antiga (digitou mais, trocou
  // de aba) é descartada em vez de sobrescrever a mais nova.
  const buscaRef = useRef(0);
  const cursorRef = useRef<string | null>(null);
  const carregandoMaisRef = useRef(false);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  const runSearch = useCallback(async () => {
    const busca = ++buscaRef.current;
    cursorRef.current = null;
    setLoading(true);
    try {
      if (aba === 'looks') {
        const res = await searchLooks(query.trim() || undefined, selectedCategory ?? undefined, null, filtros);
        if (busca !== buscaRef.current) return;
        cursorRef.current = res.next_cursor;
        setLooks(res.items);
      } else {
        const res = await searchSellers(query.trim() || undefined);
        if (busca !== buscaRef.current) return;
        cursorRef.current = res.next_cursor;
        setSellers(res.items);
      }
    } catch {
      // mantém a lista anterior; a tela não trava por causa de uma busca falha
    } finally {
      if (busca === buscaRef.current) setLoading(false);
    }
  }, [aba, query, selectedCategory, filtros]);

  // Próxima página ao chegar no fim da lista (antes só a primeira página
  // aparecia — buscas com mais de 20 resultados ficavam truncadas).
  const carregarMais = useCallback(async () => {
    if (!cursorRef.current || carregandoMaisRef.current || loading) return;
    carregandoMaisRef.current = true;
    const busca = buscaRef.current;
    try {
      if (aba === 'looks') {
        const res = await searchLooks(query.trim() || undefined, selectedCategory ?? undefined, cursorRef.current, filtros);
        if (busca !== buscaRef.current) return;
        cursorRef.current = res.next_cursor;
        setLooks((atual) => [...atual, ...res.items]);
      } else {
        const res = await searchSellers(query.trim() || undefined, cursorRef.current);
        if (busca !== buscaRef.current) return;
        cursorRef.current = res.next_cursor;
        setSellers((atual) => [...atual, ...res.items]);
      }
    } catch {
      // tenta de novo no próximo fim de lista
    } finally {
      carregandoMaisRef.current = false;
    }
  }, [aba, query, selectedCategory, filtros, loading]);

  // Debounce: buscar a cada tecla sobrecarrega o servidor por nada.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runSearch, DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [runSearch]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  };

  const handleSave = async (look: LookResponse) => {
    try {
      await saveLook(look.id);
      showToast('Salvo nos favoritos');
    } catch {
      showToast('Sem conexão com o servidor');
    }
    setDetailLook(null);
  };

  const handleAddToCart = async (look: LookResponse) => {
    try {
      await addToCart({
        lookId: look.id,
        name: look.name,
        photo: look.photos[0] ?? '',
        unitPrice: Number(look.price ?? 0),
        quantity: 1,
      });
      setDetailLook(null);
      showToast('Item adicionado ao carrinho!');
    } catch (e: any) {
      showToast(mensagemDeErroCarrinho(e));
    }
  };

  const ativoCount = aba === 'looks' ? looks.length : sellers.length;
  const temMais = cursorRef.current != null;

  // Opções do índice de categorias: "Todas" limpa o filtro.
  const opcoes = [{ id: 'todas', slug: null as string | null, name: 'Todas' }, ...categories];

  const nFiltros = contarFiltros(filtros);
  const etiquetas = descreverFiltros(filtros);

  const cabecalhoLista = (
    <Text className="text-ink-3 text-base font-display-italic mb-3">
      {loading
        ? 'Procurando…'
        : `${ativoCount}${temMais ? '+' : ''} ${
            aba === 'looks' ? (ativoCount === 1 ? 'peça' : 'peças') : ativoCount === 1 ? 'loja' : 'lojas'
          } ${aba === 'looks' && nFiltros > 0 ? 'com esses filtros' : 'no catálogo'}`}
    </Text>
  );

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Cabeçalho da página: título, campo de busca e o fichário de abas */}
      <SafeAreaView edges={['top']} className="bg-background">
        <View className="px-5 pt-3 pb-2">
          <Text className="text-ink text-3xl font-display-bold">Busca</Text>
          <Text className="text-ink-3 text-base font-display-italic">Peças e lojas do catálogo</Text>
        </View>

        {/* Campo: linha de preencher de cupom — papel claro, filete fino e sublinhado de tinta */}
        <View className="mx-4 flex-row gap-2">
        <View className="flex-1 flex-row items-center bg-surface border border-surface-5 border-b-2 border-b-ink px-3 min-h-14">
          <MaterialCommunityIcons name="book-search-outline" size={24} color={colors.ink[4]} />
          <TextInput
            className="flex-1 ml-3 text-ink text-base font-sans-medium"
            textAlignVertical="center"
            style={{ paddingVertical: 0 }}
            placeholder={aba === 'looks' ? 'Procurar uma peça' : 'Procurar uma loja'}
            placeholderTextColor={colors.ink[5]}
            value={query}
            onChangeText={setQuery}
            accessibilityLabel={aba === 'looks' ? 'Procurar uma peça' : 'Procurar uma loja'}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              accessibilityRole="button"
              accessibilityLabel="Limpar busca"
              className="w-12 h-12 -mr-3 items-center justify-center"
            >
              <MaterialCommunityIcons name="close" size={22} color={colors.ink.DEFAULT} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtrar: só para peças (loja não tem preço nem tamanho) */}
        {aba === 'looks' && (
          <TouchableOpacity
            onPress={() => setMostrarFiltros(true)}
            accessibilityRole="button"
            accessibilityLabel={nFiltros > 0 ? `Filtrar. ${nFiltros} filtros ativos` : 'Filtrar'}
            className="px-3 min-h-14 flex-row items-center gap-1.5 bg-surface border border-surface-5 border-b-2 border-b-ink"
          >
            <MaterialCommunityIcons name="tune-variant" size={22} color={nFiltros > 0 ? colors.seal.DEFAULT : colors.ink.DEFAULT} />
            <Text className={`text-base ${nFiltros > 0 ? 'text-seal font-sans-bold' : 'text-ink font-sans-semibold'}`}>
              {nFiltros > 0 ? `Filtrar · ${nFiltros}` : 'Filtrar'}
            </Text>
          </TouchableOpacity>
        )}
        </View>

        {/* Abas de fichário: a aberta é a folha, a fechada fica recuada atrás dela */}
        <View className="flex-row items-end px-4 mt-4 gap-1">
          {(['looks', 'lojas'] as Aba[]).map((tab) => {
            const ativa = aba === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setAba(tab)}
                activeOpacity={0.85}
                accessibilityRole="tab"
                accessibilityState={{ selected: ativa }}
                className={`flex-1 items-center justify-center border-2 border-b-0 border-ink ${
                  ativa ? 'bg-surface min-h-14 -mb-[2px] z-10' : 'bg-surface-3 min-h-12'
                }`}
                style={{ borderTopLeftRadius: 4, borderTopRightRadius: 4 }}
              >
                {ativa && <View className="absolute top-0 left-0 right-0 h-[4px] bg-seal" />}
                <Text className={`text-xl ${ativa ? 'text-ink font-display-bold' : 'text-ink-4 font-display'}`}>
                  {tab === 'looks' ? 'Peças' : 'Lojas'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View className="h-[2px] bg-ink" />

        {/* Índice de categorias — texto sublinhado em vez de botões; só vale para peças */}
        {aba === 'looks' && categories.length > 0 && (
          <View className="bg-surface border-b border-surface-5">
            <FlatList
              horizontal
              data={opcoes}
              keyExtractor={(c) => c.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 22 }}
              renderItem={({ item }) => {
                const ativa = selectedCategory === item.slug;
                return (
                  <TouchableOpacity
                    onPress={() => setSelectedCategory(item.slug)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: ativa }}
                    className="min-h-12 justify-center"
                  >
                    <Text
                      className={`text-lg ${ativa ? 'text-seal font-display-bold' : 'text-ink-3 font-display-italic'}`}
                      style={ativa ? { textDecorationLine: 'underline', textDecorationColor: colors.seal.DEFAULT } : undefined}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        {/* Filtros valendo: etiquetas que saem com um toque */}
        {aba === 'looks' && etiquetas.length > 0 && (
          <View className="bg-surface-2 border-b border-surface-5">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 16, alignItems: 'center' }}
            >
              {etiquetas.map((e) => (
                <TouchableOpacity
                  key={e.chave}
                  onPress={() => setFiltros((f) => removerFiltro(f, e.chave))}
                  accessibilityRole="button"
                  accessibilityLabel={`Remover filtro: ${e.rotulo}`}
                  className="min-h-12 flex-row items-center gap-1"
                >
                  <Text className="text-ink text-base font-sans-semibold">{e.rotulo}</Text>
                  <MaterialCommunityIcons name="close" size={18} color={colors.ink[3]} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setFiltros(FILTROS_VAZIOS)}
                accessibilityRole="button"
                className="min-h-12 justify-center"
              >
                <Text className="text-seal text-base font-sans-bold underline">Limpar tudo</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </SafeAreaView>

      {loading && ativoCount === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.ink.DEFAULT} size="large" />
        </View>
      ) : aba === 'looks' ? (
        <FlatList
          key="looks-grid"
          data={looks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PecaRow look={item} onPress={() => setDetailLook(item)} />}
          onEndReached={carregarMais}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={cabecalhoLista}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="items-center pt-12 px-8">
              <MaterialCommunityIcons name="book-search-outline" size={56} color={colors.ink[5]} />
              <Text className="text-ink text-xl font-display-bold text-center mt-3">Nenhuma peça encontrada</Text>
              <Text className="text-ink-4 text-base font-display-italic text-center mt-1">
                {nFiltros > 0 ? 'Nenhuma peça combina com os filtros marcados.' : 'Tente outra palavra ou outra categoria.'}
              </Text>
              {nFiltros > 0 && (
                <View className="mt-5 self-stretch">
                  <Button variant="secondary" label="Limpar filtros" icon="refresh" onPress={() => setFiltros(FILTROS_VAZIOS)} />
                </View>
              )}
            </View>
          }
        />
      ) : (
        <FlatList
          key="lojas-list"
          data={sellers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              className="flex-row bg-surface rounded-card border border-surface-5 p-3 mb-3"
              onPress={() => navigation.navigate('StoreDetail', { sellerId: item.id })}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={`Loja ${item.store_name}`}
            >
              <View className="p-1 border border-ink bg-surface self-start">
                {item.store_logo_url ? (
                  <Image source={{ uri: item.store_logo_url }} className="w-[72px] h-[72px] bg-surface-3" />
                ) : (
                  <View className="w-[72px] h-[72px] bg-surface-3 items-center justify-center">
                    <MaterialCommunityIcons name="storefront-outline" size={36} color={colors.ink[5]} />
                  </View>
                )}
              </View>

              <View className="flex-1 ml-3">
                <Text className="text-ink text-lg font-display-bold" numberOfLines={2}>{item.store_name}</Text>
                <Text className="text-ink-4 text-sm font-mono mt-0.5">{refDaPeca(item.id).replace('Ref.', 'Loja')}</Text>
                {item.description ? (
                  <Text className="text-ink-3 text-base font-display-italic mt-0.5" numberOfLines={2}>{item.description}</Text>
                ) : null}
                <View className="flex-row items-center justify-between border-t border-dotted border-ink-5 pt-1 mt-2">
                  <Text className="text-ink-4 text-sm">
                    {item.rating != null && item.total_reviews
                      ? `Nota ${String(item.rating).replace('.', ',')} · ${contar(item.total_reviews, 'avaliação', 'avaliações')}`
                      : 'Sem avaliações ainda'}
                  </Text>
                  <Text className="text-seal text-sm font-sans-bold underline">Ver a loja</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          onEndReached={carregarMais}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={cabecalhoLista}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="items-center pt-12 px-8">
              <MaterialCommunityIcons name="storefront-outline" size={56} color={colors.ink[5]} />
              <Text className="text-ink text-xl font-display-bold text-center mt-3">Nenhuma loja encontrada</Text>
              <Text className="text-ink-4 text-base font-display-italic text-center mt-1">
                Tente outro nome.
              </Text>
            </View>
          }
        />
      )}

      <FiltroSheet
        visible={mostrarFiltros}
        filtros={filtros}
        onApply={(f) => { setFiltros(f); setMostrarFiltros(false); }}
        onClose={() => setMostrarFiltros(false)}
      />
      <ProductDetailSheet
        look={detailLook}
        onClose={() => setDetailLook(null)}
        onSave={() => detailLook && handleSave(detailLook)}
        onAddToCart={() => detailLook && handleAddToCart(detailLook)}
      />
      <Toast message={toastMsg} visible={toastVisible} />
    </View>
  );
}
