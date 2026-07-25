import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { SellerResponse, LookResponse } from '../types/api';
import { fetchSellerPublic, fetchSellerLooks } from '../lib/sellers';
import { saveLook } from '../lib/feed';
import { formatarNumero } from '../utils/format';
import Toast from '../components/Toast';
import ProductDetailSheet from '../components/ProductDetailSheet';
import Button from '../components/Button';
import { colors } from '../theme/colors';

type StoreDetailRoute = RouteProp<RootStackParamList, 'StoreDetail'>;

/** Vitrine pública de uma loja — para onde a busca leva quando o resultado é
 *  uma loja em vez de um look. Não existia nenhuma tela pública equivalente:
 *  `CompanyProfileScreen`/`CompanyCatalogScreen` são só a visão do dono. */
export default function StoreDetailScreen(): React.ReactElement {
  const { params } = useRoute<StoreDetailRoute>();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [seller, setSeller] = useState<SellerResponse | null>(null);
  const [looks, setLooks] = useState<LookResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [detailLook, setDetailLook] = useState<LookResponse | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [lojaData, looksData] = await Promise.all([
        fetchSellerPublic(params.sellerId),
        fetchSellerLooks(params.sellerId),
      ]);
      setSeller(lojaData);
      setLooks(looksData.items);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [params.sellerId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSave = async (look: LookResponse) => {
    try {
      await saveLook(look.id);
      showToast('Salvo nos favoritos');
    } catch {
      showToast('Sem conexão com o servidor');
    }
    setDetailLook(null);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={colors.brand.DEFAULT} size="large" />
      </View>
    );
  }

  if (error || !seller) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-10">
        <Ionicons name="storefront-outline" size={40} color={colors.ink[5]} />
        <Text className="text-ink text-lg font-bold text-center mt-4">
          Não foi possível carregar esta loja
        </Text>
        <View className="mt-6 self-stretch">
          <Button variant="primary" label="Tentar de novo" onPress={load} />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" />
      <SafeAreaView>
        <View className="flex-row items-center px-5 pt-4 pb-2 gap-3">
          <Button variant="icon" icon="chevron-back" accessibilityLabel="Voltar" onPress={() => navigation.goBack()} />
          <Text className="text-ink text-xl font-bold tracking-tight" numberOfLines={1}>
            {seller.store_name}
          </Text>
        </View>
      </SafeAreaView>

      <FlatList
        data={looks}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: 40, gap: 12 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="mx-4 mb-4 items-center">
            <Image
              source={{ uri: seller.store_logo_url ?? undefined }}
              className="w-20 h-20 rounded-3xl bg-surface-4 mb-3"
            />
            {seller.description ? (
              <Text className="text-ink-3 text-sm text-center leading-5 mb-2">{seller.description}</Text>
            ) : null}
            {seller.rating != null && (
              <View className="flex-row items-center gap-1">
                <Ionicons name="star" size={14} color={colors.brand.DEFAULT} />
                <Text className="text-ink-4 text-xs">
                  {seller.rating} · {formatarNumero(seller.total_reviews ?? 0)} avaliações
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <Text className="text-ink-4 text-sm text-center mt-10">
            Esta loja ainda não publicou nenhum look.
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setDetailLook(item)}
            className="flex-1 bg-surface rounded-2xl overflow-hidden border border-surface-4"
          >
            <Image source={{ uri: item.photos[0] }} className="w-full h-48" resizeMode="cover" />
            <View className="p-2.5">
              <Text className="text-ink text-sm font-semibold" numberOfLines={1}>{item.name}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <ProductDetailSheet
        look={detailLook}
        onClose={() => setDetailLook(null)}
        onSave={() => detailLook && handleSave(detailLook)}
      />
      <Toast message={toastMsg} visible={toastVisible} />
    </View>
  );
}
