import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Text from '../components/Text';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { fetchMyLooks, updateLookStock, deleteLook } from '../lib/sellers';
import { fetchCategories } from '../lib/categories';
import { LookResponse, CategoryResponse } from '../types/api';
import { contar, formatarMoeda } from '../utils/format';
import Button from '../components/Button';
import PecaFoto from '../components/PecaFoto';
import { refDaPeca } from '../components/PecaRow';

const TODAS = 'todas';
const STATUS_ROTULO: Record<string, string> = {
  draft: 'Rascunho',
  under_review: 'Em revisão',
  removed: 'Removida',
};

/** Catálogo da loja: as peças que a loja publicou, com estoque e ações. */
export default function CompanyCatalogScreen(): React.ReactElement {
  const [looks, setLooks] = useState<LookResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(TODAS);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [editingLook, setEditingLook] = useState<LookResponse | null>(null);
  const [stockInput, setStockInput] = useState('0');
  const [saving, setSaving] = useState(false);

  const cursorRef = useRef<string | null>(null);
  const carregandoMaisRef = useRef(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    fetchMyLooks()
      .then((res) => {
        cursorRef.current = res.next_cursor;
        setLooks(res.items);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  // Próxima página do catálogo (antes lojas com mais de 20 peças perdiam o resto).
  const carregarMais = useCallback(async () => {
    if (!cursorRef.current || carregandoMaisRef.current) return;
    carregandoMaisRef.current = true;
    try {
      const mais = await fetchMyLooks(cursorRef.current);
      cursorRef.current = mais.next_cursor;
      setLooks((atual) => [...atual, ...mais.items]);
    } catch {
      // tenta de novo no próximo fim de lista
    } finally {
      carregandoMaisRef.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      fetchCategories().then(setCategories).catch(() => {});
    }, [load]),
  );

  const filteredProducts = useMemo(() => {
    return looks.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === TODAS || item.category_id === filter;
      return matchesSearch && matchesFilter;
    });
  }, [looks, search, filter]);

  const openStockEditor = (item: LookResponse) => {
    setEditingLook(item);
    setStockInput(String(item.stock_quantity));
  };

  const handleSaveStock = async () => {
    if (!editingLook) return;
    setSaving(true);
    try {
      const atualizado = await updateLookStock(editingLook.id, Number(stockInput || '0'));
      setLooks((prev) => prev.map((l) => (l.id === atualizado.id ? atualizado : l)));
      setEditingLook(null);
    } catch {
      Alert.alert('Ops', 'Não foi possível atualizar o estoque agora.');
    } finally {
      setSaving(false);
    }
  };

  const confirmarRemocao = (item: LookResponse) => {
    Alert.alert(
      'Remover peça',
      `“${item.name}” sai do catálogo e do feed. Isso não pode ser desfeito.`,
      [
        { text: 'Manter', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const antes = looks;
            setLooks((atual) => atual.filter((l) => l.id !== item.id));
            try {
              await deleteLook(item.id);
            } catch {
              setLooks(antes);
              Alert.alert('Ops', 'Não foi possível remover a peça agora.');
            }
          },
        },
      ],
    );
  };

  const renderProduct = ({ item }: { item: LookResponse }) => {
    const rotuloStatus = STATUS_ROTULO[item.status];
    return (
      <View className="bg-surface rounded-card border border-surface-5 p-3 mb-3">
        <View className="flex-row">
          <View className="p-1 border border-ink bg-surface self-start">
            <PecaFoto uri={item.photos[0]} compact className="w-20 h-28" />
          </View>

          <View className="flex-1 ml-3">
            <Text className="text-ink text-lg font-display-bold" numberOfLines={2}>{item.name}</Text>
            <Text className="text-ink-4 text-sm font-mono">{refDaPeca(item.id)}</Text>
            <Text className="text-seal text-xl font-display-bold">
              {item.price != null ? formatarMoeda(item.price, true) : 'Sem preço'}
            </Text>

            {/* Estoque e situação = ícone + texto, nunca só a cor */}
            <View className="flex-row items-center mt-1 gap-1.5">
              <MaterialCommunityIcons
                name={item.stock_quantity > 0 ? 'package-variant-closed' : 'package-variant-closed-remove'}
                size={18}
                color={item.stock_quantity > 0 ? colors.success : colors.danger}
              />
              <Text className={`text-sm font-sans-semibold ${item.stock_quantity > 0 ? 'text-success' : 'text-danger'}`}>
                {item.stock_quantity > 0 ? `${item.stock_quantity} em estoque` : 'Sem estoque'}
              </Text>
            </View>
            {rotuloStatus ? (
              <View className="flex-row items-center mt-0.5 gap-1.5">
                <MaterialCommunityIcons name="clock-outline" size={18} color={colors.warning} />
                <Text className="text-warning text-sm font-sans-semibold">{rotuloStatus}</Text>
              </View>
            ) : null}
            <Text className="text-ink-3 text-sm font-display-italic mt-0.5">
              {contar(item.likes_count, 'curtida', 'curtidas')} · {contar(item.saves_count, 'salvo', 'salvos')}
            </Text>
          </View>
        </View>

        {/* Ações — texto sublinhado entre filetes pontilhados, como as notas de rodapé */}
        <View className="flex-row border-t border-dotted border-ink-5 mt-3">
          <TouchableOpacity
            onPress={() => navigation.navigate('AddProduct', { look: item })}
            accessibilityRole="button"
            accessibilityLabel={`Editar ${item.name}`}
            className="flex-1 min-h-12 items-center justify-center"
          >
            <Text className="text-ink text-base font-sans-bold underline">Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openStockEditor(item)}
            accessibilityRole="button"
            accessibilityLabel={`Ajustar estoque de ${item.name}`}
            className="flex-1 min-h-12 items-center justify-center"
          >
            <Text className="text-ink text-base font-sans-bold underline">Estoque</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => confirmarRemocao(item)}
            accessibilityRole="button"
            accessibilityLabel={`Remover ${item.name}`}
            className="flex-1 min-h-12 items-center justify-center"
          >
            <Text className="text-seal text-base font-sans-bold underline">Remover</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const opcoes = [{ id: TODAS, name: 'Todas' }, ...categories];

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Cabeçalho (aba raiz: sem "voltar") */}
      <SafeAreaView edges={['top']} className="bg-background">
        <View className="flex-row items-center px-5 min-h-16 py-2 gap-3">
          <View className="flex-1">
            <Text className="text-ink text-3xl font-display-bold">Catálogo</Text>
            <Text className="text-ink-3 text-base font-display-italic">
              {!loading && !error ? contar(looks.length, 'peça publicada', 'peças publicadas') : 'Suas peças'}
            </Text>
          </View>
          <Button
            variant="icon"
            icon="add"
            accessibilityLabel="Publicar nova peça"
            onPress={() => navigation.navigate('AddProduct')}
          />
        </View>
        <View className="h-[5px] border-t-2 border-b border-ink" />
      </SafeAreaView>

      {/* Campo de busca — linha de preencher */}
      <View className="mx-4 mt-4 flex-row items-center bg-surface border border-surface-5 border-b-2 border-b-ink px-3 min-h-14">
        <MaterialCommunityIcons name="magnify" size={24} color={colors.ink[4]} />
        <TextInput
          placeholder="Procurar entre as suas peças"
          placeholderTextColor={colors.ink[5]}
          className="flex-1 ml-3 text-ink text-base font-sans-medium"
          textAlignVertical="center"
          style={{ paddingVertical: 0 }}
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Procurar entre as suas peças"
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch('')}
            accessibilityRole="button"
            accessibilityLabel="Limpar busca"
            className="w-12 h-12 -mr-3 items-center justify-center"
          >
            <MaterialCommunityIcons name="close" size={22} color={colors.ink.DEFAULT} />
          </TouchableOpacity>
        )}
      </View>

      {/* Índice de categorias */}
      {categories.length > 0 && (
        <View>
          <FlatList
            horizontal
            data={opcoes}
            keyExtractor={(c) => c.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 22 }}
            renderItem={({ item }) => {
              const ativa = filter === item.id;
              return (
                <TouchableOpacity
                  onPress={() => setFilter(item.id)}
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

      {/* Lista de itens */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.ink.DEFAULT} size="large" />
        </View>
      ) : error ? (
        <TouchableOpacity
          onPress={load}
          accessibilityRole="button"
          className="mx-4 mt-6 bg-danger rounded-card p-4 min-h-12 flex-row items-center gap-3"
        >
          <Ionicons name="cloud-offline-outline" size={22} color={colors.white} />
          <Text className="text-white text-sm font-sans-semibold flex-1">
            Não foi possível carregar seu catálogo. Toque para tentar de novo.
          </Text>
        </TouchableOpacity>
      ) : filteredProducts.length > 0 ? (
        <FlatList
          data={filteredProducts}
          keyExtractor={item => item.id}
          renderItem={renderProduct}
          onEndReached={carregarMais}
          onEndReachedThreshold={0.4}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="hanger" size={56} color={colors.ink[5]} />
          <Text className="text-ink text-xl font-display-bold text-center mt-3">
            {looks.length === 0 ? 'Nenhuma peça publicada ainda' : 'Nenhuma peça encontrada'}
          </Text>
          <Text className="text-ink-4 text-base font-display-italic text-center mt-1">
            {looks.length === 0 ? 'Publique a primeira e ela entra no feed.' : 'Tente ajustar a busca ou a categoria.'}
          </Text>
          {looks.length === 0 && (
            <View className="mt-6 self-stretch">
              <Button variant="primary" label="Publicar peça" icon="add" onPress={() => navigation.navigate('AddProduct')} />
            </View>
          )}
        </View>
      )}

      {/* Ajuste de estoque */}
      <Modal visible={!!editingLook} transparent animationType="fade" onRequestClose={() => setEditingLook(null)}>
        <View className="flex-1 bg-black/60 items-center justify-center px-8">
          <View className="bg-surface rounded-card border border-surface-5 p-6 w-full">
            <Text className="text-ink font-display-bold text-xl mb-1">Ajustar estoque</Text>
            <Text className="text-ink-4 text-base font-display-italic mb-5" numberOfLines={1}>{editingLook?.name}</Text>

            <View className="flex-row items-center justify-center gap-4 mb-6">
              <TouchableOpacity
                accessibilityLabel="Diminuir estoque"
                onPress={() => setStockInput((v) => String(Math.max(0, Number(v || '0') - 1)))}
                className="w-12 h-12 rounded-lg bg-ink items-center justify-center"
              >
                <Ionicons name="remove" size={22} color={colors.white} />
              </TouchableOpacity>
              <TextInput
                className="text-ink text-3xl font-display-black text-center w-20"
                keyboardType="number-pad"
                value={stockInput}
                onChangeText={(v) => setStockInput(v.replace(/\D/g, ''))}
                accessibilityLabel="Quantidade em estoque"
              />
              <TouchableOpacity
                accessibilityLabel="Aumentar estoque"
                onPress={() => setStockInput((v) => String(Number(v || '0') + 1))}
                className="w-12 h-12 rounded-lg bg-ink items-center justify-center"
              >
                <Ionicons name="add" size={22} color={colors.white} />
              </TouchableOpacity>
            </View>

            <View className="gap-y-2">
              <Button variant="primary" label="Salvar" onPress={handleSaveStock} loading={saving} />
              <Button variant="secondary" label="Cancelar" onPress={() => setEditingLook(null)} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
