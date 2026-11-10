import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Linking,
  Alert,
} from 'react-native';
import Text from '../components/Text';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { StatBoard, SectionTitle, MenuButton } from '../components/PanelKit';
import Button from '../components/Button';
import { SellerResponse } from '../types/api';
import { fetchMyStore, updateMyStore } from '../lib/sellers';
import { enviarFoto, erroDeUpload, escolherFotos } from '../lib/media';
import { supabase } from '../lib/supabase';

/**
 * Perfil da marca — a aba "Perfil" da área de empresa.
 *
 * Era 100% mock (`LOJA` fixo). Agora usa `GET /api/sellers/me`, que já
 * existia no backend sem nenhuma tela chamando. `ITENS_ATIVOS` não tem
 * equivalente real fácil (contaria só looks ativos da 1ª página de
 * `/sellers/{id}/looks`, o que mentiria pra lojas com mais de uma página) —
 * removido em vez de fingir precisão.
 *
 * O CNPJ NÃO aparece aqui de propósito: no v2 o documento é cifrado no
 * servidor e nunca volta em claro no payload da loja.
 */
export default function CompanyProfileScreen(): React.ReactElement {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [loja, setLoja] = useState<SellerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [trocandoLogo, setTrocandoLogo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setLoja(await fetchMyStore());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  /** Escolhe uma foto quadrada, envia e grava como logo da loja. */
  const trocarLogo = async () => {
    try {
      const [foto] = await escolherFotos({ max: 1, recortar: [1, 1] });
      if (!foto) return;
      setTrocandoLogo(true);
      const url = await enviarFoto(foto);
      setLoja(await updateMyStore({ store_logo_url: url }));
    } catch (e) {
      Alert.alert('Logo', erroDeUpload(e));
    } finally {
      setTrocandoLogo(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const abrirSite = () => {
    if (!loja?.store_url) return;
    const url = /^https?:\/\//.test(loja.store_url) ? loja.store_url : `https://${loja.store_url}`;
    Linking.openURL(url).catch(() => {});
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={colors.ink.DEFAULT} size="large" />
      </View>
    );
  }

  if (error || !loja) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-10">
        <View className="w-16 h-16 rounded-lg bg-danger items-center justify-center mb-4">
          <Ionicons name="cloud-offline-outline" size={32} color={colors.white} />
        </View>
        <Text className="text-ink text-xl font-display-bold text-center">Não foi possível carregar sua loja</Text>
        <View className="mt-6 self-stretch">
          <Button variant="primary" label="Tentar de novo" icon="refresh" onPress={load} />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

        {/* ── Cabeçalho da marca: logo, nome e nota ── */}
        <SafeAreaView edges={['top']} className="bg-background border-b-2 border-ink">
          <View className="flex-row items-center gap-4 px-5 pt-4 pb-5">
            {loja.store_logo_url ? (
              <Image source={{ uri: loja.store_logo_url }} className="w-20 h-20 rounded-card border border-surface-5 bg-surface-4" />
            ) : (
              <View className="w-20 h-20 rounded-card bg-ink items-center justify-center">
                <Ionicons name="storefront" size={40} color={colors.signal.DEFAULT} />
              </View>
            )}

            <View className="flex-1">
              <Text className="text-ink text-2xl font-display-bold" numberOfLines={1}>
                {loja.store_name}
              </Text>
              <View className="flex-row items-center gap-1 mt-0.5">
                <Ionicons name="star" size={16} color={colors.ink.DEFAULT} />
                <Text className="text-ink-2 text-base font-sans-semibold">
                  {loja.total_reviews
                    ? `${String(loja.rating).replace('.', ',')} · ${loja.total_reviews} ${loja.total_reviews === 1 ? 'avaliação' : 'avaliações'}`
                    : 'Sem avaliações ainda'}
                </Text>
              </View>
            </View>

            <Button
              variant="icon"
              icon="camera"
              accessibilityLabel="Trocar logo da loja"
              onPress={trocarLogo}
              loading={trocandoLogo}
            />
          </View>
          {loja.description ? (
            <Text className="text-ink-2 text-base leading-6 px-5 pb-5">{loja.description}</Text>
          ) : null}
        </SafeAreaView>

        <View className="bg-ink px-5 py-1">
          <StatBoard
            items={[
              { label: 'Nota', value: loja.total_reviews ? String(loja.rating).replace('.', ',') : '—' },
              { label: 'Avaliações', value: loja.total_reviews ?? 0 },
            ]}
          />
        </View>

        {/* ── Menu ── */}
        <View className="px-4 mt-6 gap-y-3">
          <SectionTitle title="Minha Loja" />

          <MenuButton
            icon="shirt-outline"
            label="Catálogo de Peças"
            onPress={() => navigation.navigate('Catalogo')}
          />
          <MenuButton
            icon="add-circle-outline"
            label="Publicar Nova Peça"
            onPress={() => navigation.navigate('AddProduct')}
          />
          <MenuButton
            icon="cube-outline"
            label="Pedidos Recebidos"
            onPress={() => navigation.navigate('ComingSoon', {
              title: 'Pedidos recebidos',
              description: 'Os pedidos da sua loja aparecem aqui quando o checkout e o pagamento existirem — hoje o backend ainda não tem pedidos.',
              icon: 'cube-outline',
            })}
          />

          <SectionTitle title="Dados da Empresa" />

          {/* Documento fiscal: o número é cifrado no servidor e não volta no
              payload da loja, então aqui é ação de cadastro/atualização, não
              exibição do valor em claro. */}
          <MenuButton
            icon="document-text-outline"
            label="Documento fiscal (CPF/CNPJ)"
            onPress={() => navigation.navigate('SellerDocument')}
          />
          <MenuButton
            icon="storefront-outline"
            label="Branding e Descrição"
            onPress={() => navigation.navigate('EditStore', { loja })}
          />
          {loja.store_url ? (
            <MenuButton
              icon="link-outline"
              label={loja.store_url}
              onPress={abrirSite}
            />
          ) : null}

          <SectionTitle title="Preferências" />

          <MenuButton
            icon="notifications-outline"
            label="Notificações"
            onPress={() => navigation.navigate('ComingSoon', {
              title: 'Notificações',
              description: 'Central de notificações da loja ainda não existe — pedidos, avaliações e alertas de estoque vão aparecer aqui.',
              icon: 'notifications-outline',
            })}
          />

          <View className="mt-4">
            <Button variant="danger" label="Sair da conta" icon="log-out-outline" onPress={handleLogout} />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
