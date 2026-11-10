import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Text from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { SectionHeader, StatBoard } from '../components/PanelKit';
import Button from '../components/Button';
import PecaFoto from '../components/PecaFoto';
import { LookResponse, SellerResponse } from '../types/api';
import { fetchMyStore, fetchTodosMeusLooks } from '../lib/sellers';
import { contar, formatarNumero } from '../utils/format';
import { ESTOQUE_BAIXO, maisEngajadas, resumirLoja } from '../utils/loja';

/**
 * Início da loja — "como está a vitrine agora e o que precisa de mim".
 *
 * Tudo aqui sai do catálogo real da loja (`GET /sellers/me` + `GET /looks/mine`):
 * peças, curtidas, salvos e estoque. Vendas e faturamento NÃO aparecem de
 * propósito — pedidos ainda não existem no backend, e um valor inventado numa
 * tela de dono de loja é pior do que a ausência dele. A faixa "Vendas" avisa
 * isso em vez de simular.
 */
export default function CompanyDashboardScreen(): React.ReactElement {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [loja, setLoja] = useState<SellerResponse | null>(null);
  const [looks, setLooks] = useState<LookResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [l, ps] = await Promise.all([fetchMyStore(), fetchTodosMeusLooks()]);
      setLoja(l);
      setLooks(ps);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const resumo = resumirLoja(looks);
  const destaques = maisEngajadas(looks, 3);

  // Itens de "Precisa de você": só aparecem os que têm ocorrência.
  const pendencias = [
    resumo.semEstoque.length > 0 && {
      id: 'sem-estoque',
      icone: 'package-variant-closed-remove' as const,
      cor: colors.danger,
      texto: `${contar(resumo.semEstoque.length, 'peça sem estoque', 'peças sem estoque')}`,
      dica: 'Fora de estoque ninguém consegue comprar.',
    },
    resumo.estoqueBaixo.length > 0 && {
      id: 'estoque-baixo',
      icone: 'package-variant' as const,
      cor: colors.warning,
      texto: `${contar(resumo.estoqueBaixo.length, 'peça acabando', 'peças acabando')}`,
      dica: `${ESTOQUE_BAIXO} unidades ou menos.`,
    },
    resumo.foraDoFeed.length > 0 && {
      id: 'fora-do-feed',
      icone: 'clock-outline' as const,
      cor: colors.warning,
      texto: `${contar(resumo.foraDoFeed.length, 'peça fora do feed', 'peças fora do feed')}`,
      dica: 'Rascunho, em revisão ou removida.',
    },
  ].filter(Boolean) as { id: string; icone: any; cor: string; texto: string; dica: string }[];

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

        {/* ── Cabeçalho: nome da loja ── */}
        <SafeAreaView edges={['top']} className="bg-background">
          <View className="px-5 pt-3 pb-3 flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-ink-3 text-base font-display-italic">Painel da loja</Text>
              <Text className="text-ink text-3xl font-display-bold" numberOfLines={1}>
                {loja?.store_name ?? 'Sua loja'}
              </Text>
            </View>
            <Button
              variant="icon"
              icon="notifications-outline"
              accessibilityLabel="Notificações"
              onPress={() => navigation.navigate('ComingSoon', {
                title: 'Notificações',
                description: 'Central de notificações da loja ainda não existe — pedidos, avaliações e alertas de estoque vão aparecer aqui.',
                icon: 'notifications-outline',
              })}
            />
          </View>
          <View className="h-[5px] border-t-2 border-b border-ink" />
        </SafeAreaView>

        {loading ? (
          <View className="py-20 items-center">
            <ActivityIndicator color={colors.ink.DEFAULT} size="large" />
          </View>
        ) : error ? (
          <View className="px-8 py-16 items-center">
            <View className="w-16 h-16 rounded-lg bg-danger items-center justify-center mb-4">
              <Ionicons name="cloud-offline-outline" size={32} color={colors.white} />
            </View>
            <Text className="text-ink text-xl font-display-bold text-center">Não foi possível carregar o painel</Text>
            <View className="mt-6 self-stretch">
              <Button variant="primary" label="Tentar de novo" icon="refresh" onPress={load} />
            </View>
          </View>
        ) : looks.length === 0 ? (
          <View className="px-8 py-16 items-center">
            <MaterialCommunityIcons name="storefront-outline" size={64} color={colors.ink[5]} />
            <Text className="text-ink text-2xl font-display-bold text-center mt-3">A vitrine está vazia</Text>
            <Text className="text-ink-4 text-base font-display-italic text-center mt-1">
              Publique a primeira peça e ela entra no feed de quem está folheando o catálogo.
            </Text>
            <View className="mt-6 self-stretch">
              <Button variant="primary" label="Publicar peça" icon="add" onPress={() => navigation.navigate('AddProduct')} />
            </View>
          </View>
        ) : (
          <>
            {/* ── A vitrine em números ── */}
            <View className="bg-ink px-5 py-2">
              <StatBoard
                items={[
                  { label: 'Peças publicadas', value: formatarNumero(resumo.pecas) },
                  { label: 'Curtidas', value: formatarNumero(resumo.curtidas) },
                  { label: 'Salvos', value: formatarNumero(resumo.salvos) },
                  { label: 'Unidades em estoque', value: formatarNumero(resumo.unidades) },
                ]}
              />
            </View>

            {/* ── Precisa de você ── */}
            <View className="mt-6">
              <SectionHeader title="Precisa de você" actionLabel="Ver catálogo" onAction={() => navigation.navigate('Catalogo')} />
              <View className="px-4 gap-y-2">
                {pendencias.length === 0 ? (
                  <View className="flex-row items-center gap-3 bg-surface border border-surface-5 rounded-card px-4 min-h-16">
                    <MaterialCommunityIcons name="check-circle-outline" size={26} color={colors.success} />
                    <Text className="text-ink text-base font-sans-semibold flex-1">
                      Tudo em dia: nenhuma peça sem estoque ou parada.
                    </Text>
                  </View>
                ) : (
                  pendencias.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => navigation.navigate('Catalogo')}
                      accessibilityRole="button"
                      className="flex-row items-center bg-surface border border-surface-5 rounded-card px-4 min-h-16 gap-3"
                    >
                      <MaterialCommunityIcons name={p.icone} size={26} color={p.cor} />
                      <View className="flex-1">
                        <Text className="text-ink text-base font-sans-bold">{p.texto}</Text>
                        <Text className="text-ink-4 text-sm font-display-italic">{p.dica}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.ink[5]} />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>

            {/* ── Mais procuradas ── */}
            <View className="mt-6">
              <SectionHeader title="Mais procuradas" actionLabel="Ver insights" onAction={() => navigation.navigate('Insights')} />
              <View className="px-4 gap-y-2">
                {destaques.length === 0 ? (
                  <Text className="text-ink-4 text-base font-display-italic">
                    Ainda ninguém curtiu nem salvou suas peças. Quando isso acontecer, as mais procuradas aparecem aqui.
                  </Text>
                ) : (
                  destaques.map((p, i) => (
                    <View key={p.id} className="flex-row items-center bg-surface border border-surface-5 rounded-card p-3 gap-3">
                      <Text className="text-seal text-3xl font-display-bold w-8 text-center">{i + 1}</Text>
                      <View className="p-1 border border-ink bg-surface">
                        <PecaFoto uri={p.photos[0]} compact className="w-12 h-16" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-ink text-base font-display-bold" numberOfLines={1}>{p.name}</Text>
                        <Text className="text-ink-3 text-sm font-display-italic">
                          {contar(p.likes_count, 'curtida', 'curtidas')} · {contar(p.saves_count, 'salvo', 'salvos')}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>

            {/* ── Vendas: ainda não existem ── */}
            <View className="mt-6 mx-4 border border-dashed border-ink-5 bg-surface-2 rounded-card p-4 flex-row gap-3">
              <MaterialCommunityIcons name="cash-register" size={26} color={colors.ink[4]} />
              <View className="flex-1">
                <Text className="text-ink text-base font-display-bold">Vendas e faturamento</Text>
                <Text className="text-ink-4 text-sm font-display-italic mt-0.5">
                  Aparecem aqui quando o checkout e os pedidos existirem. Hoje o app mostra só o que já é real: o que o público curte e salva.
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
