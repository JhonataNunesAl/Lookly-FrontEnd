import React from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { SectionHeader } from '../components/PanelKit';
import { formatarMoeda, formatarNumero, formatarDelta } from '../utils/format';

/**
 * Home da empresa — "como minha loja está agora".
 *
 * Antes esta tela liderava com "Saldo Disponível" + botão "Sacar". Saldo é uma
 * operação financeira (carteira), não um sinal de saúde do negócio, e o backend
 * não tem pagamentos — o botão não levava a lugar nenhum. A home agora responde
 * as perguntas que o dono faz ao abrir o app: estou lucrando? melhorou? o que
 * precisa de mim hoje? o que está vendendo?
 *
 * MOCK: dados fixos, como no resto da área de empresa. Faturamento/pedidos viriam
 * de vendas (não existe no backend ainda); estoque viria dos looks do vendedor.
 */

const MES = 'Maio 2026';

const FINANCEIRO = {
  faturamento: 28450,
  faturamentoAnterior: 25310,
  lucro: 18436,
  margem: 64.8,
  ticketMedio: 338,
};

/** O que exige ação do lojista hoje — o motivo de ele abrir o app. */
const ACOES = [
  {
    id: 'envio',
    icon: 'cube-outline' as const,
    count: 5,
    label: 'Pedidos aguardando envio',
    tone: 'warning' as const,
    rota: 'Pedidos',
  },
  {
    id: 'sem-estoque',
    icon: 'alert-circle-outline' as const,
    count: 2,
    label: 'Peças sem estoque',
    tone: 'danger' as const,
    rota: 'Catalogo',
  },
  {
    id: 'estoque-baixo',
    icon: 'trending-down-outline' as const,
    count: 3,
    label: 'Peças com estoque baixo',
    tone: 'warning' as const,
    rota: 'Catalogo',
  },
];

const SEMANA = [
  { dia: 'seg', valor: 820 },
  { dia: 'ter', valor: 1140 },
  { dia: 'qua', valor: 960 },
  { dia: 'qui', valor: 1480 },
  { dia: 'sex', valor: 2130 },
  { dia: 'sáb', valor: 2640 },
  { dia: 'dom', valor: 1320 },
];

const MAIS_VENDIDOS = [
  {
    id: '1',
    nome: 'Jaqueta Bomber Y2K',
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=200',
    unidades: 42,
    receita: 12580,
  },
  {
    id: '2',
    nome: 'Calça Cargo Utilitária',
    image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=200',
    unidades: 31,
    receita: 8029,
  },
  {
    id: '3',
    nome: 'Camiseta Boxy Heavyweight',
    image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=200',
    unidades: 28,
    receita: 3637,
  },
];

const ALTURA_GRAFICO = 96;

export default function CompanyDashboardScreen(): React.ReactElement {
  // `any` é o atalho usado nas telas; dá para tipar com RootStackParamList (src/types)
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const deltaFaturamento =
    ((FINANCEIRO.faturamento - FINANCEIRO.faturamentoAnterior) /
      FINANCEIRO.faturamentoAnterior) *
    100;

  const maxDia = Math.max(...SEMANA.map((d) => d.valor));
  const totalSemana = SEMANA.reduce((acc, d) => acc + d.valor, 0);

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" />

      <SafeAreaView className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

          {/* ── Cabeçalho ── */}
          <View className="px-6 pt-4 pb-6 flex-row items-center justify-between">
            <View>
              <Text className="text-ink-4 text-xs font-bold uppercase tracking-widest">
                {MES}
              </Text>
              <Text className="text-ink text-2xl font-bold">Olá, Lookly Studio</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Notificações"
              onPress={() => navigation.navigate('ComingSoon', {
                title: 'Notificações',
                description: 'Central de notificações da loja ainda não existe — pedidos, avaliações e alertas de estoque vão aparecer aqui.',
                icon: 'notifications-outline',
              })}
              className="bg-surface w-12 h-12 rounded-2xl items-center justify-center border border-surface-4"
            >
              <Ionicons name="notifications-outline" size={22} color={colors.ink.DEFAULT} />
              <View className="absolute top-3 right-3 w-2 h-2 bg-brand rounded-full" />
            </TouchableOpacity>
          </View>

          {/* ── Saúde do negócio ──
              O número que o dono quer primeiro: quanto entrou, e se melhorou. */}
          <View className="mx-4 rounded-hero bg-ink p-6">
            <Text className="text-ink-6 text-2xs font-bold uppercase tracking-widest">
              Faturamento do mês
            </Text>

            <View className="flex-row items-end gap-2 mt-2">
              <Text className="text-background text-5xl font-black leading-none">
                {formatarMoeda(FINANCEIRO.faturamento)}
              </Text>
            </View>

            {/* Comparação com o mês anterior: seta + texto, não só cor */}
            <View className="flex-row items-center gap-1 mt-3">
              <Ionicons
                name={deltaFaturamento >= 0 ? 'arrow-up' : 'arrow-down'}
                size={14}
                color={colors.brand.light}
              />
              <Text className="text-brand-light text-xs font-bold">
                {formatarDelta(deltaFaturamento)}
              </Text>
              <Text className="text-ink-6 text-xs">vs. mês anterior</Text>
            </View>

            <View className="h-[1px] bg-ink-2 my-5" />

            <View className="flex-row justify-between">
              <View>
                <Text className="text-ink-6 text-2xs uppercase tracking-widest">Lucro</Text>
                <Text className="text-background text-base font-bold mt-1">
                  {formatarMoeda(FINANCEIRO.lucro)}
                </Text>
              </View>
              <View>
                <Text className="text-ink-6 text-2xs uppercase tracking-widest">Margem</Text>
                <Text className="text-background text-base font-bold mt-1">
                  {FINANCEIRO.margem.toString().replace('.', ',')}%
                </Text>
              </View>
              <View>
                <Text className="text-ink-6 text-2xs uppercase tracking-widest">Ticket médio</Text>
                <Text className="text-background text-base font-bold mt-1">
                  {formatarMoeda(FINANCEIRO.ticketMedio)}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Precisa de você ──
              Tokens de status sempre com ícone + texto: a cor nunca é o único sinal. */}
          <View className="mt-8">
            <SectionHeader title="Precisa de você" />
            <View className="px-4 gap-y-3">
              {ACOES.map((acao) => (
                <TouchableOpacity
                  key={acao.id}
                  onPress={() => navigation.navigate(acao.rota)}
                  accessibilityRole="button"
                  className="flex-row items-center justify-between bg-surface border border-surface-4 px-5 py-4 rounded-3xl"
                >
                  <View className="flex-row items-center gap-4">
                    <View
                      className={`w-10 h-10 rounded-2xl items-center justify-center ${
                        acao.tone === 'danger' ? 'bg-danger/10' : 'bg-warning/10'
                      }`}
                    >
                      <Ionicons
                        name={acao.icon}
                        size={20}
                        color={acao.tone === 'danger' ? colors.danger : colors.warning}
                      />
                    </View>
                    <View>
                      <Text
                        className={`text-lg font-black ${
                          acao.tone === 'danger' ? 'text-danger' : 'text-warning'
                        }`}
                      >
                        {acao.count}
                      </Text>
                      <Text className="text-ink-3 text-xs">{acao.label}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.ink[6]} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Vendas da semana ──
              Uma cor só: é a mesma medida ao longo dos dias, não sete séries. */}
          <View className="mt-8">
            <SectionHeader title="Vendas dos últimos 7 dias" />
            <View className="mx-4 bg-surface border border-surface-4 rounded-card p-5">
              <Text className="text-ink text-xl font-bold">
                {formatarMoeda(totalSemana)}
              </Text>
              <Text className="text-ink-4 text-xs mb-5">total na semana</Text>

              <View className="flex-row items-end justify-between gap-2" style={{ height: ALTURA_GRAFICO }}>
                {SEMANA.map((d) => {
                  const ehMax = d.valor === maxDia;
                  return (
                    <View key={d.dia} className="flex-1 items-center justify-end h-full">
                      {/* Rótulo só no melhor dia — um número em cada barra vira ruído */}
                      {ehMax && (
                        <Text className="text-ink-4 text-2xs font-bold mb-1">
                          {formatarNumero(d.valor)}
                        </Text>
                      )}
                      <View
                        className="w-full rounded-t-[4px] bg-brand"
                        style={{ height: Math.max((d.valor / maxDia) * (ALTURA_GRAFICO - 22), 3) }}
                      />
                    </View>
                  );
                })}
              </View>

              {/* Eixo: linha fina, um tom acima da superfície */}
              <View className="h-[1px] bg-surface-4 mt-2 mb-1.5" />
              <View className="flex-row justify-between gap-2">
                {SEMANA.map((d) => (
                  <Text key={d.dia} className="flex-1 text-center text-ink-5 text-2xs">
                    {d.dia}
                  </Text>
                ))}
              </View>
            </View>
          </View>

          {/* ── Mais vendidos ── */}
          <View className="mt-8">
            <SectionHeader
              title="Mais vendidos no mês"
              actionLabel="Ver catálogo"
              onAction={() => navigation.navigate('Catalogo')}
            />
            <View className="mx-4 bg-surface border border-surface-4 rounded-card p-5">
              {MAIS_VENDIDOS.map((p, i) => (
                <View
                  key={p.id}
                  className={`flex-row items-center gap-3 ${i < MAIS_VENDIDOS.length - 1 ? 'mb-4' : ''}`}
                >
                  <Image
                    source={{ uri: p.image }}
                    className="w-12 h-14 rounded-xl bg-surface-4"
                    resizeMode="cover"
                  />
                  <View className="flex-1">
                    <Text className="text-ink text-sm font-bold" numberOfLines={1}>
                      {p.nome}
                    </Text>
                    <Text className="text-ink-4 text-xs mt-0.5">
                      {p.unidades} unidades vendidas
                    </Text>
                  </View>
                  <Text
                    className="text-ink text-sm font-bold"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {formatarMoeda(p.receita)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
