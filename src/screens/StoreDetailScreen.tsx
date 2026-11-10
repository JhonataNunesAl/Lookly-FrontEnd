import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StatusBar,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/Text';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { SellerResponse, LookResponse } from '../types/api';
import { fetchSellerPublic, fetchSellerLooks } from '../lib/sellers';
import { saveLook } from '../lib/feed';
import { addToCart, mensagemDeErroCarrinho } from '../lib/commerce';
import { formatarNumero } from '../utils/format';
import Toast from '../components/Toast';
import ProductDetailSheet from '../components/ProductDetailSheet';
import Button from '../components/Button';
import PecaRow from '../components/PecaRow';
import ScreenHeader from '../components/ScreenHeader';
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
  const cursorRef = useRef<string | null>(null);
  const carregandoMaisRef = useRef(false);
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
      cursorRef.current = looksData.next_cursor;
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [params.sellerId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Próxima página da vitrine (antes só os 20 primeiros looks apareciam).
  const carregarMais = useCallback(async () => {
    if (!cursorRef.current || carregandoMaisRef.current) return;
    carregandoMaisRef.current = true;
    try {
      const mais = await fetchSellerLooks(params.sellerId, cursorRef.current);
      cursorRef.current = mais.next_cursor;
      setLooks((atual) => [...atual, ...mais.items]);
    } catch {
      // tenta de novo no próximo fim de lista
    } finally {
      carregandoMaisRef.current = false;
    }
  }, [params.sellerId]);

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

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={colors.ink.DEFAULT} size="large" />
      </View>
    );
  }

  if (error || !seller) {
    return (
      <View className="flex-1 bg-background">
        <ScreenHeader title="Loja" onBack={() => navigation.goBack()} />
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 rounded-lg bg-danger items-center justify-center mb-4">
            <Ionicons name="storefront-outline" size={32} color={colors.white} />
          </View>
          <Text className="text-ink text-xl font-display-bold text-center">
            Não foi possível carregar esta loja
          </Text>
          <View className="mt-6 self-stretch">
            <Button variant="primary" label="Tentar de novo" icon="refresh" onPress={load} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScreenHeader
        title={seller.store_name}
        subtitle={
          seller.rating != null
            ? `${seller.rating} de 5 · ${formatarNumero(seller.total_reviews ?? 0)} avaliações`
            : undefined
        }
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={looks}
        keyExtractor={(item) => item.id}
        onEndReached={carregarMais}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="flex-row items-center gap-4 mb-4">
            {seller.store_logo_url ? (
              <Image source={{ uri: seller.store_logo_url }} className="w-16 h-16 rounded-lg bg-surface-4" />
            ) : (
              <View className="w-16 h-16 rounded-lg bg-ink items-center justify-center">
                <Ionicons name="storefront" size={30} color={colors.signal.DEFAULT} />
              </View>
            )}
            {seller.description ? (
              <Text className="flex-1 text-ink-2 text-base leading-6">{seller.description}</Text>
            ) : (
              <View className="flex-1" />
            )}
          </View>
        }
        ListEmptyComponent={
          <Text className="text-ink-4 text-base text-center mt-10 px-8">
            Esta loja ainda não publicou nenhuma peça.
          </Text>
        }
        renderItem={({ item }) => <PecaRow look={item} onPress={() => setDetailLook(item)} />}
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
