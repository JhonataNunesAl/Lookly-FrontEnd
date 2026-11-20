import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import Text from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { MeterBar, SectionHeader, StatBoard } from '../components/PanelKit';
import Button from '../components/Button';
import { CategoryResponse, LookResponse, Metricas } from '../types/api';
import { fetchTodosMeusLooks } from '../lib/sellers';
import { fetchMetricas, Periodo } from '../lib/inventory';
import PainelVendas, { SeletorPeriodo } from '../components/PainelVendas';
import { fetchCategories } from '../lib/categories';
import { contar, formatarNumero } from '../utils/format';
import { interessePorCategoria, maisEngajadas, resumirLoja } from '../utils/loja';

/**
 * Insights da marca — "quanto vendi, o que gira, o que está parado e o que o
 * público procura".
 *
 * Vendas, lucro, giro e visualizações vêm de `GET /inventory/metrics` (pedidos
 * pagos no app + vendas registradas fora dele). O interesse (curtidas e salvos)
 * continua calculado sobre o catálogo (`GET /looks/mine`).
 */
export default function CompanyInsightsScreen(): React.ReactElement {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [looks, setLooks] = useState<LookResponse[]>([]);
  const [categorias, setCategorias] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo>(30);
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [carregandoMetricas, setCarregandoMetricas] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [ps, cs, m] = await Promise.all([
        fetchTodosMeusLooks(),
        fetchCategories().catch(() => [] as CategoryResponse[]),
        fetchMetricas(periodo).catch(() => null),
      ]);
      setLooks(ps);
      setCategorias(cs);
      setMetricas(m);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const trocarPeriodo = async (p: Periodo) => {
    setPeriodo(p);
    setCarregandoMetricas(true);
    try {
      setMetricas(await fetchMetricas(p));
    } catch {
      // mantém o período anterior na tela
    } finally {
      setCarregandoMetricas(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const resumo = resumirLoja(looks);
  const ranking = maisEngajadas(looks, 5);
  const porCategoria = interessePorCategoria(looks, categorias);
  const maxInteresse = Math.max(...ranking.map((p) => p.likes_count + p.saves_count), 1);
  const intencao = resumo.curtidas > 0 ? Math.round((resumo.salvos / resumo.curtidas) * 100) : null;
  const destaque = ranking[0];

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

        {/* ── Cabeçalho ── */}
        <SafeAreaView edges={['top']} className="bg-background">
          <View className="px-5 pt-3 pb-3">
            <Text className="text-ink text-3xl font-display-bold">Insights</Text>
            <Text className="text-ink-3 text-base font-display-italic">Vendas, giro do estoque e o que o público procura</Text>
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
            <Text className="text-ink text-xl font-display-bold text-center">Não foi possível carregar os insights</Text>
            <View className="mt-6 self-stretch">
              <Button variant="primary" label="Tentar de novo" icon="refresh" onPress={load} />
            </View>
          </View>
        ) : looks.length === 0 ? (
          <View className="px-8 py-16 items-center">
            <MaterialCommunityIcons name="abacus" size={64} color={colors.ink[5]} />
            <Text className="text-ink text-2xl font-display-bold text-center mt-3">Nada para medir ainda</Text>
            <Text className="text-ink-4 text-base font-display-italic text-center mt-1">
              Os insights aparecem depois que você publicar peças e o público começar a curtir e salvar.
            </Text>
            <View className="mt-6 self-stretch">
              <Button variant="primary" label="Publicar peça" icon="add" onPress={() => navigation.navigate('AddProduct')} />
            </View>
          </View>
        ) : (
          <>
            {/* ── Vendas, lucro e giro (GET /inventory/metrics) ── */}
            <View className="mt-4">
              <SeletorPeriodo valor={periodo} onChange={trocarPeriodo} />
            </View>
            {carregandoMetricas ? (
              <View className="py-10 items-center">
                <ActivityIndicator color={colors.ink.DEFAULT} />
              </View>
            ) : metricas ? (
              <PainelVendas m={metricas} />
            ) : (
              <Text className="text-ink-4 text-base font-display-italic px-5 mt-3">
                Não foi possível carregar as vendas agora. Puxe para atualizar mais tarde.
              </Text>
            )}

            {/* ── Interesse: curtidas, salvos e a intenção de compra ── */}
            <View className="mt-8">
              <SectionHeader title="Interesse do público" />
            </View>
            <View className="bg-ink px-5 py-2">
              <StatBoard
                items={[
                  { label: 'Curtidas', value: formatarNumero(resumo.curtidas) },
                  { label: 'Salvos', value: formatarNumero(resumo.salvos) },
                  { label: 'Salvos a cada 100 curtidas', value: intencao == null ? '—' : String(intencao) },
                ]}
              />
            </View>
            <Text className="text-ink-4 text-sm font-display-italic px-5 mt-2">
              Salvar é o gesto de quem quer comprar; quanto mais salvos por curtida, mais perto da compra.
            </Text>

            {/* ── Ranking de peças ── */}
            <View className="mt-6">
              <SectionHeader title="Peças que mais engajam" />
              <View className="mx-4 bg-surface border border-surface-5 rounded-card p-5">
                {ranking.length === 0 ? (
                  <Text className="text-ink-4 text-base font-display-italic">
                    Ninguém curtiu nem salvou suas peças ainda.
                  </Text>
                ) : (
                  ranking.map((p) => (
                    <MeterBar
                      key={p.id}
                      label={p.name}
                      pct={Math.round(((p.likes_count + p.saves_count) / maxInteresse) * 100)}
                      valueLabel={`${contar(p.likes_count, 'curtida', 'curtidas')} · ${contar(p.saves_count, 'salvo', 'salvos')}`}
                    />
                  ))
                )}
              </View>
            </View>

            {/* ── Categorias ── */}
            {porCategoria.length > 0 && (
              <View className="mt-6">
                <SectionHeader title="Categorias que mais engajam" />
                <View className="mx-4 bg-surface border border-surface-5 rounded-card p-5">
                  {porCategoria.map((c) => (
                    <MeterBar key={c.nome} label={c.nome} pct={c.pct} />
                  ))}
                </View>
              </View>
            )}

            {/* ── Leitura acionável ── */}
            <View className="mt-6">
              <SectionHeader title="O que fazer com isso" />
              <View className="px-4 gap-y-2">
                {destaque && (
                  <View className="bg-surface border border-surface-5 rounded-card p-4">
                    <View className="flex-row items-center gap-2 mb-1">
                      <MaterialCommunityIcons name="trending-up" size={22} color={colors.success} />
                      <Text className="text-success text-base font-sans-bold">Está dando certo</Text>
                    </View>
                    <Text className="text-ink text-lg font-display-bold">{destaque.name}</Text>
                    <Text className="text-ink-3 text-base font-display-italic mt-0.5">
                      {contar(destaque.likes_count, 'curtida', 'curtidas')} e {contar(destaque.saves_count, 'salvo', 'salvos')}. Vale publicar
                      variações dessa peça — cor, estampa — enquanto o público está respondendo.
                    </Text>
                  </View>
                )}

                {resumo.semCurtidas.length > 0 && (
                  <View className="bg-surface border border-surface-5 rounded-card p-4">
                    <View className="flex-row items-center gap-2 mb-1">
                      <MaterialCommunityIcons name="trending-down" size={22} color={colors.danger} />
                      <Text className="text-danger text-base font-sans-bold">Vale rever</Text>
                    </View>
                    <Text className="text-ink text-lg font-display-bold">
                      {contar(resumo.semCurtidas.length, 'peça sem nenhuma curtida', 'peças sem nenhuma curtida')}
                    </Text>
                    <Text className="text-ink-3 text-base font-display-italic mt-0.5">
                      Costuma ser a foto de capa ou o preço. Troque a primeira foto e veja se o interesse muda.
                    </Text>
                  </View>
                )}

                {resumo.semEstoque.length > 0 && (
                  <View className="bg-surface border border-surface-5 rounded-card p-4">
                    <View className="flex-row items-center gap-2 mb-1">
                      <MaterialCommunityIcons name="package-variant-closed-remove" size={22} color={colors.danger} />
                      <Text className="text-danger text-base font-sans-bold">Reponha o estoque</Text>
                    </View>
                    <Text className="text-ink-3 text-base font-display-italic">
                      {contar(resumo.semEstoque.length, 'peça está', 'peças estão')} sem estoque — quem quer comprar não consegue.
                    </Text>
                  </View>
                )}
              </View>
            </View>

          </>
        )}
      </ScrollView>
    </View>
  );
}
