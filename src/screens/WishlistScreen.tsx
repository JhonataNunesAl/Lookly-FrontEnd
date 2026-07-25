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
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LookResponse } from '../types/api';
import { fetchSavedLooks, removeSavedLook } from '../lib/wardrobe';
import { formatarMoeda } from '../utils/format';
import Toast from '../components/Toast';
import Button from '../components/Button';
import ProductDetailSheet from '../components/ProductDetailSheet';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 44) / 2; // Ajuste para 2 colunas com espaçamento

/** "Salvos" — a fonte é o backend (GET /api/saved-looks), o mesmo recurso que
 *  o gesto de salvar no feed grava. Antes esta tela lia de um catálogo mock
 *  local, então um save de verdade nunca aparecia aqui. */
export default function WishlistScreen(): React.ReactElement {
  const [items, setItems] = useState<LookResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [detailLook, setDetailLook] = useState<LookResponse | null>(null);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setItems(await fetchSavedLooks());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  };

  const handleRemove = (lookId: string) => {
    Alert.alert(
      'Remover dos salvos',
      'Deseja tirar esta peça da sua lista de desejos?',
      [
        { text: 'Manter', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const previous = items;
            setItems(items.filter((i) => i.id !== lookId));
            try {
              await removeSavedLook(lookId);
              showToast('Item removido 🗑️');
            } catch {
              setItems(previous);
              showToast('Não foi possível remover. Tente de novo.');
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: LookResponse }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => setDetailLook(item)}
      className="bg-surface rounded-card overflow-hidden border border-surface-4 mb-4"
      style={{ width: COLUMN_WIDTH }}
    >
      {/* Imagem com Gradiente Interno */}
      <View>
        <Image
          source={{ uri: item.photos[0] }}
          style={{ width: '100%', height: COLUMN_WIDTH * 1.3 }}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(20,17,15,0.35)', 'transparent']}
          className="absolute inset-0"
        />

        {/* Botão de Remover (X) */}
        <TouchableOpacity
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-ink/55 items-center justify-center"
          onPress={() => handleRemove(item.id)}
        >
          <Ionicons name="close" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Informações */}
      <View className="p-3">
        <Text className="text-ink text-xs font-medium h-8" numberOfLines={2}>
          {item.name}
        </Text>

        <View className="flex-row items-center justify-between mt-2">
          {item.price != null ? (
            <Text className="text-brand font-bold text-sm">
              {formatarMoeda(item.price, true)}
            </Text>
          ) : (
            <View />
          )}

          <View className="flex-row items-center gap-1">
            <Ionicons name="heart" size={13} color={colors.ink[5]} />
            <Text className="text-ink-5 text-2xs">{item.likes_count}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" />

      {/* Header com Botão Voltar */}
      <SafeAreaView>
        <View className="flex-row items-center px-5 pt-4 pb-2 gap-3">
          <Button variant="icon" icon="chevron-back" accessibilityLabel="Voltar" onPress={() => navigation.goBack()} />
          <View>
            <Text className="text-ink text-2xl font-bold tracking-tight">Desejos</Text>
            <Text className="text-ink-4 text-xs">
              {items.length} {items.length === 1 ? 'item salvo' : 'itens salvos'}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand.DEFAULT} size="large" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="cloud-offline-outline" size={30} color={colors.danger} />
          <Text className="text-ink text-lg font-bold text-center mt-4">
            Não foi possível carregar
          </Text>
          <View className="mt-6 self-stretch">
            <Button variant="primary" label="Tentar de novo" onPress={load} />
          </View>
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <View className="w-24 h-24 bg-surface-3 rounded-full items-center justify-center mb-6">
            <Ionicons name="heart-outline" size={40} color={colors.ink[5]} />
          </View>
          <Text className="text-ink text-xl font-bold mt-4 text-center">
            Sua lista está vazia
          </Text>
          <Text className="text-ink-4 text-sm text-center mt-2 leading-6">
            Salve as peças que você amou no feed para decidir depois ou esperar aquela promoção.
          </Text>
          <View className="mt-8 self-stretch">
            <Button variant="secondary" label="Explorar Looks" onPress={() => navigation.navigate('Feed')} />
          </View>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ProductDetailSheet
        look={detailLook}
        onClose={() => setDetailLook(null)}
        onSave={() => {
          // Já está nos salvos — abrir daqui é só pra ver detalhe, não salva de novo.
          setDetailLook(null);
          showToast('Essa peça já está nos seus salvos');
        }}
      />
      <Toast message={toastMsg} visible={toastVisible} />
    </View>
  );
}
