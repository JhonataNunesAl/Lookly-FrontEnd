import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { PRODUCTS } from '../data/products';
import { Product, Category, StyleTag } from '../types';
import { recordInteraction } from '../utils/algorithm';
import Toast from '../components/Toast';

const CATEGORIES: Array<'todos' | Category> = [
  'todos', 'vestido', 'calça', 'saia', 'top',
  'blazer', 'casaco', 'conjunto', 'bermuda', 'short',
];

const STYLE_TAGS: StyleTag[] = [
  'casual', 'boho', 'minimalista', 'streetwear',
  'elegante', 'romântico', 'vintage', 'preppy', 'gótico', 'esportivo',
];

export default function SearchScreen(): React.ReactElement {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'todos' | Category>('todos');
  const [activeStyle, setActiveStyle] = useState<StyleTag | ''>('');
  const [filtered, setFiltered] = useState<Product[]>(PRODUCTS);
  const [selected, setSelected] = useState<Product | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
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
          p.style_tags.some((t) => t.includes(q)),
      );
    }
    if (activeCategory !== 'todos') {
      result = result.filter((p) => p.category === activeCategory);
    }
    if (activeStyle) {
      result = result.filter((p) =>
        p.style_tags.includes(activeStyle as StyleTag),
      );
    }
    setFiltered(result);
  }, [query, activeCategory, activeStyle]);

  // ── Grid card ─────────────────────────────────────────────────────────────

  const renderProduct = useCallback(
    ({ item }: ListRenderItemInfo<Product>) => (
      <TouchableOpacity
        className="flex-1 bg-surface rounded-2xl overflow-hidden"
        onPress={() => setSelected(item)}
        activeOpacity={0.85}
      >
        <Image
          source={{ uri: item.image }}
          className="w-full h-48"
          resizeMode="cover"
        />
        <View className="p-2.5">
          <Text className="text-ink-5 text-2xs tracking-widest uppercase">
            {item.brand}
          </Text>
          <Text className="text-white text-sm font-semibold mt-0.5" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-brand text-sm font-bold mt-1">
            R$ {item.price.toFixed(2)}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [],
  );

  // ── Interaction from modal ────────────────────────────────────────────────

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
        {/* Search bar */}
        <View className="flex-row items-center mx-4 mt-3 px-4 py-2.5
                         bg-surface rounded-xl border border-surface-4">
          <Text className="text-base mr-2">🔍</Text>
          <TextInput
            className="flex-1 text-white text-base"
            placeholder="Buscar peças, marcas ou estilos..."
            placeholderTextColor="#555"
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Text className="text-ink-4 text-sm">✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Category filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full border
                  ${active
                    ? 'bg-brand border-brand'
                    : 'bg-surface border-surface-4'
                  }`}
              >
                <Text
                  className={`text-sm capitalize
                    ${active ? 'text-white font-semibold' : 'text-ink-4'}`}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Style filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-2"
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          <TouchableOpacity
            onPress={() => setActiveStyle('')}
            className={`px-3 py-1.5 rounded-full border border-brand/30
              ${!activeStyle ? 'bg-brand/20' : 'bg-transparent'}`}
          >
            <Text className={`text-xs ${!activeStyle ? 'text-white' : 'text-brand'}`}>
              ✦ todos estilos
            </Text>
          </TouchableOpacity>

          {STYLE_TAGS.map((st) => {
            const active = activeStyle === st;
            return (
              <TouchableOpacity
                key={st}
                onPress={() => setActiveStyle(st === activeStyle ? '' : st)}
                className={`px-3 py-1.5 rounded-full border border-brand/30
                  ${active ? 'bg-brand/20' : 'bg-transparent'}`}
              >
                <Text className={`text-xs ${active ? 'text-white' : 'text-brand'}`}>
                  {st}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text className="text-ink-6 text-xs mx-4 mt-2 mb-1">
          {filtered.length} peças encontradas
        </Text>
      </SafeAreaView>

      {/* Product grid */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={renderProduct}
        contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 40 }}
        columnWrapperStyle={{ gap: 12 }}
        ListEmptyComponent={
          <View className="items-center pt-16">
            <Text className="text-4xl">🧺</Text>
            <Text className="text-ink-4 mt-3 text-base">Nenhuma peça encontrada</Text>
          </View>
        }
      />

      {/* Product detail modal */}
      <Modal
        transparent
        animationType="slide"
        visible={!!selected}
        onRequestClose={() => setSelected(null)}
      >
        {selected && (
          <View className="flex-1 bg-black/65 justify-end">
            <View className="bg-surface rounded-t-3xl overflow-hidden max-h-[88%]">
              <TouchableOpacity
                className="p-4 items-end"
                onPress={() => setSelected(null)}
              >
                <Text className="text-ink-4 text-sm">✕  fechar</Text>
              </TouchableOpacity>

              <Image
                source={{ uri: selected.image }}
                className="w-full h-72"
                resizeMode="cover"
              />

              <ScrollView
                contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
              >
                <Text className="text-ink-4 text-2xs tracking-widest uppercase mb-1">
                  {selected.brand}  ·  {selected.gender}
                </Text>
                <Text className="text-white text-2xl font-bold mb-1">
                  {selected.name}
                </Text>
                <Text className="text-brand text-xl font-bold mb-3">
                  R$ {selected.price.toFixed(2)}
                </Text>
                <Text className="text-ink-2 text-sm leading-6 mb-4">
                  {selected.description}
                </Text>

                <View className="flex-row flex-wrap gap-2 mb-5">
                  {selected.style_tags.map((t) => (
                    <View
                      key={t}
                      className="bg-surface-3 rounded-full px-3 py-1"
                    >
                      <Text className="text-ink-3 text-xs">{t}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  onPress={handleLike}
                  className="bg-brand rounded-2xl py-4 items-center mb-3"
                >
                  <Text className="text-white text-base font-bold">
                    ❤️  Curtir esta peça
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSave}
                  className="border border-surface-5 rounded-2xl py-3.5 items-center"
                >
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
