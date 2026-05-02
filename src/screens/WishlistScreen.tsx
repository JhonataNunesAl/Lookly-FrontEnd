import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ListRenderItemInfo,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Product } from '../types';
import { getWishlist, removeFromWishlist } from '../utils/algorithm';
import Toast from '../components/Toast';

export default function WishlistScreen(): React.ReactElement {
  const [items, setItems] = useState<Product[]>([]);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => setItems(await getWishlist()))();
    }, []),
  );

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  };

  const handleRemove = (id: string, name: string) => {
    Alert.alert(
      'Remover item',
      `Remover "${name}" dos salvos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            await removeFromWishlist(id);
            setItems(await getWishlist());
            showToast('Removido dos salvos');
          },
        },
      ],
    );
  };

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Product>) => (
      <View className="flex-row bg-surface rounded-2xl overflow-hidden border border-surface-3">
        <Image
          source={{ uri: item.image }}
          className="w-28 h-36"
          resizeMode="cover"
        />
        <View className="flex-1 p-3.5 justify-between">
          <View>
            <Text className="text-ink-5 text-2xs tracking-widest uppercase">
              {item.brand}
            </Text>
            <Text className="text-white text-sm font-semibold mt-0.5" numberOfLines={2}>
              {item.name}
            </Text>
            <Text className="text-brand text-base font-bold mt-1">
              R$ {item.price.toFixed(2)}
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-1.5 mt-1.5">
            {item.style_tags.slice(0, 2).map((t) => (
              <View key={t} className="bg-surface-3 rounded-full px-2.5 py-0.5">
                <Text className="text-ink-4 text-xs">{t}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity className="bg-brand rounded-xl py-2 items-center mt-2">
            <Text className="text-white text-xs font-bold">Comprar</Text>
          </TouchableOpacity>
        </View>

        {/* Remove button */}
        <TouchableOpacity
          className="absolute top-2.5 right-2.5"
          onPress={() => handleRemove(item.id, item.name)}
        >
          <Text className="text-lg">🗑</Text>
        </TouchableOpacity>
      </View>
    ),
    [],
  );

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      <SafeAreaView>
        <View className="px-5 pt-4 pb-2">
          <Text className="text-white text-2xl font-bold">Salvos</Text>
          <Text className="text-ink-4 text-xs mt-1">
            {items.length} {items.length === 1 ? 'peça' : 'peças'}
          </Text>
        </View>
      </SafeAreaView>

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <Text className="text-5xl">🛍️</Text>
          <Text className="text-white text-xl font-bold mt-4">
            Nada salvo ainda
          </Text>
          <Text className="text-ink-4 text-sm text-center mt-2 leading-6">
            Curta peças no feed ou toque em 🔖 para salvá-las aqui
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
        />
      )}

      <Toast message={toastMsg} visible={toastVisible} />
    </View>
  );
}
