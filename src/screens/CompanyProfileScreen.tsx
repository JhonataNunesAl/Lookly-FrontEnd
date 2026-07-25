import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, View, Text, ScrollView, TouchableOpacity, StatusBar, Image, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { StatTile, SectionTitle, MenuButton } from '../components/PanelKit';
import Button from '../components/Button';
import { SellerResponse } from '../types/api';
import { fetchMyStore } from '../lib/sellers';
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
        <ActivityIndicator color={colors.brand.DEFAULT} size="large" />
      </View>
    );
  }

  if (error || !loja) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-10">
        <Ionicons name="cloud-offline-outline" size={30} color={colors.danger} />
        <Text className="text-ink text-lg font-bold text-center mt-4">Não foi possível carregar sua loja</Text>
        <View className="mt-6 self-stretch">
          <Button variant="primary" label="Tentar de novo" onPress={load} />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* ── Cartão da marca ── */}
        <View className="mx-4 mt-4 rounded-hero bg-ink p-6">
          <View className="flex-row items-center gap-4">
            <View className="relative">
              <Image
                source={{ uri: loja.store_logo_url ?? undefined }}
                className="w-20 h-20 rounded-3xl bg-ink-2"
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Trocar logo da loja"
                onPress={() => navigation.navigate('ComingSoon', {
                  title: 'Trocar logo',
                  description: 'Upload de imagem ainda não existe no app — precisa de um seletor de foto e um bucket de armazenamento.',
                  icon: 'camera-outline',
                })}
                className="absolute -bottom-1 -right-1 bg-brand w-8 h-8 rounded-full items-center justify-center border-2 border-ink"
              >
                <Ionicons name="camera" size={15} color={colors.white} />
              </TouchableOpacity>
            </View>

            <View className="flex-1">
              <Text className="text-background text-2xl font-bold" numberOfLines={1}>
                {loja.store_name}
              </Text>
              <View className="flex-row items-center gap-1 mt-1">
                <Ionicons name="star" size={12} color={colors.brand.light} />
                <Text className="text-ink-6 text-xs">
                  {loja.rating ?? '—'} · {loja.total_reviews ?? 0} avaliações
                </Text>
              </View>
            </View>
          </View>

          {loja.description ? (
            <Text className="text-ink-6 text-xs leading-5 mt-4">{loja.description}</Text>
          ) : null}

          <View className="flex-row gap-3 mt-6">
            <StatTile value={loja.rating ?? '—'} label="Nota" />
            <StatTile value={loja.total_reviews ?? 0} label="Avaliações" />
          </View>
        </View>

        {/* ── Menu ── */}
        <View className="px-4 mt-8 gap-y-3">
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
            onPress={() => navigation.navigate('Pedidos')}
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
