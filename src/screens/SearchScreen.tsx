import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LookResponse, SellerResponse, CategoryResponse } from '../types/api';
import { searchLooks, searchSellers } from '../lib/sellers';
import { fetchCategories } from '../lib/categories';
import { saveLook } from '../lib/feed';
import { formatarMoeda } from '../utils/format';
import Toast from '../components/Toast';
import ProductDetailSheet from '../components/ProductDetailSheet';
import { colors } from '../theme/colors';

/**
 * Busca real de looks e lojas (GET /api/looks/search, GET /api/sellers/search).
 * Antes rodava 100% sobre um catálogo mockado local (`data/products.ts`) —
 * curtir/salvar ali nunca tocava o backend. `FilterSheet.tsx` foi removido
 * junto: filtrava estilo/marca, atributos que `LookResponse` não tem.
 */

type Aba = 'looks' | 'lojas';
const DEBOUNCE_MS = 400;

export default function SearchScreen(): React.ReactElement {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [aba, setAba] = useState<Aba>('looks');
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [looks, setLooks] = useState<LookResponse[]>([]);
  const [sellers, setSellers] = useState<SellerResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [detailLook, setDetailLook] = useState<LookResponse | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  const runSearch = useCallback(async () => {
    setLoading(true);
    try {
      if (aba === 'looks') {
        const res = await searchLooks(query.trim() || undefined, selectedCategory ?? undefined);
        setLooks(res.items);
      } else {
        const res = await searchSellers(query.trim() || undefined);
        setSellers(res.items);
      }
    } catch {
      // mantém a lista anterior; a tela não trava por causa de uma busca falha
    } finally {
      setLoading(false);
    }
  }, [aba, query, selectedCategory]);

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

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <SafeAreaView>
        {/* Busca + abas */}
        <View className="flex-row items-center gap-2 mx-4 mt-3">
          <View className="flex-1 flex-row items-center gap-2 px-4 py-2.5 bg-surface rounded-xl border border-surface-4">
            <Ionicons name="search-outline" size={17} color={colors.ink[5]} />
            <TextInput
              className="flex-1 text-ink text-sm"
              placeholder={aba === 'looks' ? 'Buscar peças...' : 'Buscar lojas...'}
              placeholderTextColor={colors.ink[6]}
              value={query}
              onChangeText={setQuery}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={17} color={colors.ink[5]} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View className="flex-row gap-2 mx-4 mt-3">
          {(['looks', 'lojas'] as Aba[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setAba(tab)}
              className={`flex-1 py-2.5 rounded-xl items-center border ${
                aba === tab ? 'bg-brand border-brand' : 'bg-surface border-surface-4'
              }`}
            >
              <Text className={`text-sm font-bold ${aba === tab ? 'text-white' : 'text-ink-4'}`}>
                {tab === 'looks' ? 'Looks' : 'Lojas'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Categorias — só se aplica à busca de looks */}
        {aba === 'looks' && categories.length > 0 && (
          <FlatList
            horizontal
            data={categories}
            keyExtractor={(c) => c.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingTop: 12 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setSelectedCategory(item.slug === selectedCategory ? null : item.slug)}
                className={`px-4 py-2 rounded-full border ${
                  selectedCategory === item.slug ? 'bg-brand border-brand' : 'bg-surface border-surface-4'
                }`}
              >
                <Text className={`text-xs font-bold ${selectedCategory === item.slug ? 'text-white' : 'text-ink-4'}`}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand.DEFAULT} size="large" />
        </View>
      ) : aba === 'looks' ? (
        <FlatList
          key="looks-grid"
          data={looks}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={({ item }) => (
            <TouchableOpacity
              className="flex-1 bg-surface border border-surface-4 rounded-2xl overflow-hidden"
              onPress={() => setDetailLook(item)}
              activeOpacity={0.85}
            >
              <Image source={{ uri: item.photos[0] }} className="w-full h-48" resizeMode="cover" />
              <View className="p-2.5 gap-0.5">
                <Text className="text-ink text-sm font-semibold" numberOfLines={1}>{item.name}</Text>
                {item.price != null && (
                  <Text className="text-brand text-sm font-bold">{formatarMoeda(item.price, true)}</Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 110 }}
          columnWrapperStyle={{ gap: 12 }}
          ListEmptyComponent={
            <View className="items-center pt-20 gap-3">
              <Ionicons name="shirt-outline" size={52} color={colors.surface[5]} />
              <Text className="text-ink-4 text-base font-medium">Nenhuma peça encontrada</Text>
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
              className="flex-row items-center gap-3 mx-4 mb-3 bg-surface border border-surface-4 rounded-2xl p-3"
              onPress={() => navigation.navigate('StoreDetail', { sellerId: item.id })}
              activeOpacity={0.85}
            >
              <Image
                source={{ uri: item.store_logo_url ?? undefined }}
                className="w-14 h-14 rounded-2xl bg-surface-4"
              />
              <View className="flex-1">
                <Text className="text-ink text-sm font-bold" numberOfLines={1}>{item.store_name}</Text>
                {item.description ? (
                  <Text className="text-ink-4 text-xs mt-0.5" numberOfLines={2}>{item.description}</Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.ink[6]} />
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 110 }}
          ListEmptyComponent={
            <View className="items-center pt-20 gap-3">
              <Ionicons name="storefront-outline" size={52} color={colors.surface[5]} />
              <Text className="text-ink-4 text-base font-medium">Nenhuma loja encontrada</Text>
            </View>
          }
        />
      )}

      <ProductDetailSheet
        look={detailLook}
        onClose={() => setDetailLook(null)}
        onSave={() => detailLook && handleSave(detailLook)}
      />
      <Toast message={toastMsg} visible={toastVisible} />
    </View>
  );
}
