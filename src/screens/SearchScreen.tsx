import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
  StatusBar,
  ListRenderItemInfo,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRODUCTS } from '../data/products';
import { Product, Category, StyleTag } from '../types';
import { recordInteraction } from '../utils/algorithm';
import Toast from '../components/Toast';

// ─── Filter data ──────────────────────────────────────────────────────────────

const CATEGORIES: Array<'todos' | Category> = [
  'todos', 'vestido', 'calça', 'saia', 'top',
  'blazer', 'casaco', 'conjunto', 'bermuda', 'short',
];

const STYLE_TAGS: StyleTag[] = [
  'casual', 'boho', 'minimalista', 'streetwear',
  'elegante', 'romântico', 'vintage', 'preppy', 'gótico', 'esportivo',
];

// Extracts unique brands from the catalog — always in sync with the data
const ALL_BRANDS = [...new Set(PRODUCTS.map((p) => p.brand))].sort();

// ─── Reusable filter pill ─────────────────────────────────────────────────────

interface PillProps {
  label: string;
  active: boolean;
  onPress: () => void;
  variant?: 'default' | 'brand';
}

const Pill: React.FC<PillProps> = ({ label, active, onPress, variant = 'default' }) => {
  const isBrand = variant === 'brand';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className={`px-4 py-2 rounded-full border
        ${active
          ? isBrand
            ? 'bg-white border-white'
            : 'bg-brand border-brand'
          : 'bg-transparent border-surface-4'
        }`}
    >
      <Text
        className={`text-xs font-medium capitalize
          ${active
            ? isBrand ? 'text-background font-bold' : 'text-white'
            : 'text-ink-4'
          }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// ─── Section label inside filter panel ───────────────────────────────────────

const FilterLabel: React.FC<{ title: string }> = ({ title }) => (
  <Text className="text-ink-4 text-2xs tracking-widest uppercase px-4 mb-2 mt-4 first:mt-2">
    {title}
  </Text>
);

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SearchScreen(): React.ReactElement {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'todos' | Category>('todos');
  const [activeStyle, setActiveStyle] = useState<StyleTag | ''>('');
  const [activeBrand, setActiveBrand] = useState('');
  const [filtered, setFiltered] = useState<Product[]>(PRODUCTS);
  const [selected, setSelected] = useState<Product | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Animate filter panel height
  const panelAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(panelAnim, {
      toValue: filtersOpen ? 1 : 0,
      tension: 60,
      friction: 12,
      useNativeDriver: false,
    }).start();
  }, [filtersOpen, panelAnim]);

  const panelMaxHeight = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 340],
  });

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  }, []);

  const activeFilterCount = [
    activeCategory !== 'todos',
    activeStyle !== '',
    activeBrand !== '',
  ].filter(Boolean).length;

  const clearAllFilters = useCallback(() => {
    setActiveCategory('todos');
    setActiveStyle('');
    setActiveBrand('');
  }, []);

  // ── Filter logic ──────────────────────────────────────────────────────────

  useEffect(() => {
    const q = query.trim().toLowerCase();
    let result = PRODUCTS;

    if (q) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.style_tags.some((t) => t.includes(q)) ||
          p.category.includes(q),
      );
    }
    if (activeCategory !== 'todos') {
      result = result.filter((p) => p.category === activeCategory);
    }
    if (activeStyle) {
      result = result.filter((p) => p.style_tags.includes(activeStyle as StyleTag));
    }
    if (activeBrand) {
      result = result.filter((p) => p.brand === activeBrand);
    }

    setFiltered(result);
  }, [query, activeCategory, activeStyle, activeBrand]);

  // ── Grid card ─────────────────────────────────────────────────────────────

  const renderProduct = useCallback(
    ({ item }: ListRenderItemInfo<Product>) => (
      <TouchableOpacity
        className="flex-1 bg-surface rounded-2xl overflow-hidden"
        onPress={() => setSelected(item)}
        activeOpacity={0.85}
      >
        <Image source={{ uri: item.image }} className="w-full h-48" resizeMode="cover" />
        <View className="p-2.5 gap-0.5">
          <Text className="text-ink-5 text-2xs tracking-widest uppercase">
            {item.brand}
          </Text>
          <Text className="text-white text-sm font-semibold" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-brand text-sm font-bold">
            R$ {item.price.toFixed(2)}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [],
  );

  // ── Modal interactions ────────────────────────────────────────────────────

  const handleLike = async () => {
    if (!selected) return;
    await recordInteraction(selected, 'like');
    showToast('Curtido! ❤️');
    setSelected(null);
  };

  const handleSave = async () => {
    if (!selected) return;
    await recordInteraction(selected, 'save');
    showToast('Salvo nos favoritos 🔖');
    setSelected(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      <SafeAreaView>

        {/* ── Search bar + filter toggle ── */}
        <View className="flex-row items-center gap-2 mx-4 mt-3">
          <View className="flex-1 flex-row items-center gap-2 px-4 py-2.5
                           bg-surface rounded-xl border border-surface-4">
            <Ionicons name="search-outline" size={17} color="#555" />
            <TextInput
              className="flex-1 text-white text-sm"
              placeholder="Buscar peças, marcas ou estilos..."
              placeholderTextColor="#555"
              value={query}
              onChangeText={setQuery}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={17} color="#555" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter button with active-count badge */}
          <TouchableOpacity
            onPress={() => setFiltersOpen((v) => !v)}
            activeOpacity={0.8}
            className={`w-11 h-11 rounded-xl border items-center justify-center
              ${filtersOpen || activeFilterCount > 0
                ? 'bg-brand/15 border-brand'
                : 'bg-surface border-surface-4'
              }`}
          >
            <Ionicons
              name={filtersOpen ? 'options' : 'options-outline'}
              size={20}
              color={filtersOpen || activeFilterCount > 0 ? '#a78bfa' : '#666'}
            />
            {activeFilterCount > 0 && (
              <View className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full
                               bg-brand items-center justify-center">
                <Text className="text-white text-2xs font-bold leading-none">
                  {activeFilterCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Collapsible filter panel ── */}
        <Animated.View style={{ maxHeight: panelMaxHeight, overflow: 'hidden' }}>
          <View className="pb-3">

            <FilterLabel title="Categoria" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {CATEGORIES.map((cat) => (
                <Pill key={cat} label={cat} active={activeCategory === cat}
                  onPress={() => setActiveCategory(cat)} />
              ))}
            </ScrollView>

            <FilterLabel title="Estilo" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              <Pill label="todos" active={activeStyle === ''} onPress={() => setActiveStyle('')} />
              {STYLE_TAGS.map((st) => (
                <Pill key={st} label={st} active={activeStyle === st}
                  onPress={() => setActiveStyle(st === activeStyle ? '' : st)} />
              ))}
            </ScrollView>

            <FilterLabel title="Marca / Loja" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              <Pill label="todas" active={activeBrand === ''} onPress={() => setActiveBrand('')} variant="brand" />
              {ALL_BRANDS.map((brand) => (
                <Pill key={brand} label={brand} active={activeBrand === brand} variant="brand"
                  onPress={() => setActiveBrand(brand === activeBrand ? '' : brand)} />
              ))}
            </ScrollView>

            {activeFilterCount > 0 && (
              <TouchableOpacity onPress={clearAllFilters}
                className="flex-row items-center gap-1.5 mx-4 mt-3">
                <Ionicons name="close-circle-outline" size={14} color="#a78bfa" />
                <Text className="text-brand text-xs font-medium">Limpar todos os filtros</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* ── Result count + active brand chip ── */}
        <View className="flex-row items-center justify-between px-4 mt-2 mb-1">
          <Text className="text-ink-6 text-xs">
            {filtered.length} {filtered.length === 1 ? 'peça' : 'peças'} encontradas
          </Text>
          {activeBrand !== '' && (
            <TouchableOpacity onPress={() => setActiveBrand('')}
              className="flex-row items-center gap-1 bg-white/10 rounded-full px-2.5 py-1">
              <Text className="text-white text-xs">{activeBrand}</Text>
              <Ionicons name="close" size={12} color="#aaa" />
            </TouchableOpacity>
          )}
        </View>

      </SafeAreaView>

      {/* ── Product grid ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={renderProduct}
        contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 40 }}
        columnWrapperStyle={{ gap: 12 }}
        ListEmptyComponent={
          <View className="items-center pt-20 gap-3">
            <Ionicons name="shirt-outline" size={52} color="#2a2a2a" />
            <Text className="text-ink-4 text-base font-medium">Nenhuma peça encontrada</Text>
            {activeFilterCount > 0 && (
              <TouchableOpacity onPress={clearAllFilters}>
                <Text className="text-brand text-sm">Limpar filtros</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* ── Product detail modal ── */}
      <Modal transparent animationType="slide" visible={!!selected}
        onRequestClose={() => setSelected(null)}>
        {selected && (
          <View className="flex-1 bg-black/65 justify-end">
            <View className="bg-surface rounded-t-3xl overflow-hidden max-h-[88%]">
              <View className="items-center pt-3 pb-1">
                <View className="w-10 h-1 rounded-full bg-surface-4" />
              </View>
              <Image source={{ uri: selected.image }} className="w-full h-72" resizeMode="cover" />
              <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
                <Text className="text-ink-4 text-2xs tracking-widest uppercase mb-1">
                  {selected.brand}  ·  {selected.gender}
                </Text>
                <Text className="text-white text-2xl font-bold mb-1">{selected.name}</Text>
                <Text className="text-brand text-xl font-bold mb-3">R$ {selected.price.toFixed(2)}</Text>
                <Text className="text-ink-2 text-sm leading-6 mb-4">{selected.description}</Text>
                <View className="flex-row flex-wrap gap-2 mb-6">
                  {selected.style_tags.map((t) => (
                    <View key={t} className="bg-surface-3 rounded-full px-3 py-1">
                      <Text className="text-ink-3 text-xs">{t}</Text>
                    </View>
                  ))}
                  {selected.colors.map((c) => (
                    <View key={c} className="bg-brand/10 border border-brand/25 rounded-full px-3 py-1">
                      <Text className="text-brand-light text-xs">{c}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity onPress={handleLike} className="bg-brand rounded-2xl py-4 items-center mb-3">
                  <Text className="text-white text-base font-bold">❤️  Curtir esta peça</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} className="border border-surface-5 rounded-2xl py-3.5 items-center">
                  <Text className="text-ink-3 text-base">🔖  Salvar nos favoritos</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>

      <Toast message={toastMsg} visible={toastVisible} />
    </View>
  );
}