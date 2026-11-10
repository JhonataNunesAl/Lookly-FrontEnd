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
import { CategoryResponse, LookResponse } from '../types/api';
import { fetchTodosMeusLooks } from '../lib/sellers';
import { fetchCategories } from '../lib/categories';
import { contar, formatarNumero } from '../utils/format';
import { interessePorCategoria, maisEngajadas, resumirLoja } from '../utils/loja';

/**
 * Insights da marca — "o que o público está procurando e o que vale rever".
 *
 * Calculado sobre o catálogo real (`GET /looks/mine`): curtidas e salvos de cada
 * peça. Visualizações (impressões) e vendas ainda não são expostas pelo backend,
 * então não há "taxa de curtida" nem receita — um percentual sobre um
 * denominador que não existe seria inventado. O que dá para medir de verdade é a
 * intenção: de cada 100 curtidas, quantas viraram salvos (o gesto de quem quer comprar).
 */
export default function CompanyInsightsScreen(): React.ReactElement {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [looks, setLooks] = useState<LookResponse[]>([]);
  const [categorias, setCategorias] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [ps, cs] = await Promise.all([fetchTodosMeusLooks(), fetchCategories().catch(() => [] as CategoryResponse[])]);
      setLooks(ps);
      setCategorias(cs);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

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
            <Text className="text-ink-3 text-base font-display-italic">O que o público procura nas suas peças</Text>
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
            {/* ── Interesse: curtidas, salvos e a intenção de compra ── */}
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

            <View className="mt-6 mx-4 border border-dashed border-ink-5 bg-surface-2 rounded-card p-4 flex-row gap-3">
              <MaterialCommunityIcons name="eye-outline" size={26} color={colors.ink[4]} />
              <Text className="flex-1 text-ink-4 text-sm font-display-italic">
                Visualizações e vendas por peça entram aqui quando o backend passar a registrá-las. Hoje só curtidas e salvos são reais.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
