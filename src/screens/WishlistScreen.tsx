import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Text from '../components/Text';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LookResponse } from '../types/api';
import { fetchSavedLooks, removeSavedLook } from '../lib/wardrobe';
import { addToCart, mensagemDeErroCarrinho } from '../lib/commerce';
import Toast from '../components/Toast';
import Button from '../components/Button';
import PecaRow from '../components/PecaRow';
import ScreenHeader from '../components/ScreenHeader';
import ProductDetailSheet from '../components/ProductDetailSheet';
import { colors } from '../theme/colors';


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
              showToast('Peça removida dos salvos');
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
    <PecaRow
      look={item}
      onPress={() => setDetailLook(item)}
      trailing={
        <TouchableOpacity
          onPress={() => handleRemove(item.id)}
          accessibilityRole="button"
          accessibilityLabel={`Remover ${item.name} dos salvos`}
          className="w-12 h-12 -mt-2 -mr-2 items-center justify-center"
        >
          <View className="w-9 h-9 rounded-lg bg-ink items-center justify-center">
            <Ionicons name="close" size={20} color={colors.white} />
          </View>
        </TouchableOpacity>
      }
    />
  );

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScreenHeader
        title="Salvos"
        subtitle={
          !loading && !error
            ? `${items.length} ${items.length === 1 ? 'peça salva' : 'peças salvas'}`
            : undefined
        }
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.ink.DEFAULT} size="large" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 rounded-lg bg-danger items-center justify-center mb-4">
            <Ionicons name="cloud-offline-outline" size={32} color={colors.white} />
          </View>
          <Text className="text-ink text-xl font-display-bold text-center">Não foi possível carregar</Text>
          <View className="mt-6 self-stretch">
            <Button variant="primary" label="Tentar de novo" icon="refresh" onPress={load} />
          </View>
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 rounded-lg bg-ink items-center justify-center mb-4">
            <Ionicons name="bookmark-outline" size={32} color={colors.signal.DEFAULT} />
          </View>
          <Text className="text-ink text-2xl font-display-bold text-center">Nenhuma peça salva</Text>
          <Text className="text-ink-4 text-base text-center mt-2">
            Toque em Salvar no feed para guardar as peças que você quer rever depois.
          </Text>
          <View className="mt-6 self-stretch">
            <Button variant="primary" label="Ir para o feed" icon="arrow-forward" onPress={() => navigation.navigate('Feed')} />
          </View>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
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
        onAddToCart={() => detailLook && handleAddToCart(detailLook)}
      />
      <Toast message={toastMsg} visible={toastVisible} />
    </View>
  );
}
