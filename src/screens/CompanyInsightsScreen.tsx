import React from 'react';
import {
  View, Text, ScrollView, SafeAreaView, StatusBar, Image, DimensionValue,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { StatTile, MeterBar, SectionHeader } from '../components/PanelKit';
import { formatarNumero, formatarDelta } from '../utils/format';

/**
 * Insights da marca — "o que está dando certo e o que não".
 *
 * Antes esta aba renderizava o CompanyDashboardScreen, ou seja, era a mesma tela
 * que a home. O recorte agora é outro: a home fala de dinheiro e do que precisa
 * de ação hoje; aqui é referência — o público está gostando? o que repetir e o
 * que rever?
 *
 * MOCK: dados fixos. O real viria de uma agregação de `POST /api/swipes` por look
 * (RIGHT = curtiu/salvou, LEFT = passou), que o backend ainda não expõe.
 */

const PERIODO = 'Últimos 30 dias';

const RESUMO = {
  impressoes: 45231,
  curtidas: 8140,
  salvos: 2310,
  /** Variação da taxa de curtida, em pontos percentuais, vs. período anterior. */
  deltaTaxa: 2.4,
};

const PECAS = [
  {
    id: '1',
    nome: 'Jaqueta Bomber Y2K',
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=200',
    impressoes: 12840,
    curtidas: 3210,
  },
  {
    id: '2',
    nome: 'Calça Cargo Utilitária',
    image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=200',
    impressoes: 10520,
    curtidas: 1980,
  },
  {
    id: '3',
    nome: 'Camiseta Boxy Heavyweight',
    image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=200',
    impressoes: 9870,
    curtidas: 1420,
  },
  {
    id: '4',
    nome: 'Blazer Linho Minimal',
    image: 'https://images.unsplash.com/photo-1584735175315-9d5df23860e6?q=80&w=200',
    impressoes: 6430,
    curtidas: 620,
  },
  {
    id: '5',
    nome: 'Tênis Retro Runner',
    // Era a mesma foto do item 4 (bug de copy-paste) — trocado por uma distinta.
    image: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?q=80&w=200',
    impressoes: 5571,
    curtidas: 910,
  },
];

const CATEGORIAS = [
  { nome: 'casaco', pct: 38 },
  { nome: 'calça', pct: 27 },
  { nome: 'top', pct: 21 },
  { nome: 'blazer', pct: 14 },
];

/**
 * Barra divergente: distância da peça até a média da loja.
 *
 * Verde/vermelho aqui são tokens de status (a série *significa* bom/ruim), e
 * status nunca vai sozinho na cor — a direção da barra, a seta e o número com
 * sinal dizem a mesma coisa. Assim continua legível para quem não distingue
 * vermelho de verde.
 */
function DivergingBar({ delta, max }: { delta: number; max: number }): React.ReactElement {
  const largura: DimensionValue = `${Math.min((Math.abs(delta) / max) * 100, 100)}%`;
  const acima = delta >= 0;

  return (
    <View className="flex-row items-center h-3">
      {/* Braço negativo (cresce para a esquerda) */}
      <View className="flex-1 items-end">
        {!acima && (
          <View className="h-1.5 rounded-l-[4px] bg-danger" style={{ width: largura }} />
        )}
      </View>

      {/* Midpoint neutro = média da loja */}
      <View className="w-[1px] h-3 bg-ink-6" />

      {/* Braço positivo */}
      <View className="flex-1">
        {acima && (
          <View className="h-1.5 rounded-r-[4px] bg-success" style={{ width: largura }} />
        )}
      </View>
    </View>
  );
}

export default function CompanyInsightsScreen(): React.ReactElement {
  const taxaMedia = Math.round((RESUMO.curtidas / RESUMO.impressoes) * 100);

  const analisadas = PECAS.map((p) => {
    const taxa = Math.round((p.curtidas / p.impressoes) * 100);
    return { ...p, taxa, delta: taxa - taxaMedia };
  }).sort((a, b) => b.delta - a.delta);

  // Escala simétrica: os dois braços usam o mesmo passo por ponto percentual
  const maxDelta = Math.max(...analisadas.map((p) => Math.abs(p.delta)), 1);

  const destaque = analisadas[0];
  const pior = analisadas[analisadas.length - 1];

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" />

      <SafeAreaView className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

          {/* ── Cabeçalho ── */}
          <View className="px-6 pt-4 pb-6">
            <Text className="text-ink-4 text-xs font-bold uppercase tracking-widest">
              {PERIODO}
            </Text>
            <Text className="text-ink text-2xl font-bold mt-0.5">Insights</Text>
            <Text className="text-ink-4 text-sm mt-1">
              O que está dando certo e o que vale rever.
            </Text>
          </View>

          {/* ── Alcance ── */}
          <View className="flex-row gap-3 px-4">
            <StatTile tone="surface" value={formatarNumero(RESUMO.impressoes)} label="Viram" />
            <StatTile tone="surface" value={formatarNumero(RESUMO.curtidas)} label="Curtiram" />
            <StatTile tone="surface" value={formatarNumero(RESUMO.salvos)} label="Salvaram" />
          </View>

          {/* ── Taxa de curtida ──
              Uma razão contra um limite: medidor + número grande, não pizza de
              duas fatias nem gráfico de uma barra só. */}
          <View className="mx-4 mt-4 rounded-hero bg-ink p-6">
            <Text className="text-ink-6 text-2xs font-bold uppercase tracking-widest">
              Taxa de curtida
            </Text>

            <View className="flex-row items-end gap-2 mt-2 mb-4">
              <Text className="text-background text-5xl font-black leading-none">
                {taxaMedia}%
              </Text>
              <View className="flex-row items-center gap-1 mb-1">
                <Ionicons
                  name={RESUMO.deltaTaxa >= 0 ? 'arrow-up' : 'arrow-down'}
                  size={14}
                  color={colors.brand.light}
                />
                <Text className="text-brand-light text-xs font-bold">
                  {formatarDelta(RESUMO.deltaTaxa, ' pts')}
                </Text>
              </View>
            </View>

            <View className="h-1.5 rounded-full bg-ink-2 overflow-hidden">
              <View className="h-full rounded-full bg-brand" style={{ width: `${taxaMedia}%` }} />
            </View>
            <Text className="text-ink-6 text-2xs mt-3 leading-4">
              De cada 100 pessoas que viram suas peças no feed, {taxaMedia} deslizaram
              para curtir.
            </Text>
          </View>

          {/* ── O que está dando certo e o que não ── */}
          <View className="mt-8">
            <SectionHeader title="Comparado à sua média" />
            <View className="mx-4 bg-surface border border-surface-4 rounded-card p-5">
              <Text className="text-ink-4 text-xs leading-5 mb-5">
                Cada peça em relação à média da loja ({taxaMedia}%). À direita, o que
                puxa a marca para cima; à esquerda, o que segura.
              </Text>

              {analisadas.map((peca) => (
                <View key={peca.id} className="mb-5">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-ink-3 text-sm font-medium flex-1" numberOfLines={1}>
                      {peca.nome}
                    </Text>
                    {/* Status = ícone + texto, nunca só a cor */}
                    <View className="flex-row items-center gap-1 ml-3">
                      <Ionicons
                        name={peca.delta >= 0 ? 'arrow-up' : 'arrow-down'}
                        size={12}
                        color={peca.delta >= 0 ? colors.success : colors.danger}
                      />
                      <Text
                        className={`text-xs font-bold ${
                          peca.delta >= 0 ? 'text-success' : 'text-danger'
                        }`}
                        style={{ fontVariant: ['tabular-nums'] }}
                      >
                        {peca.delta >= 0 ? '+' : ''}{peca.delta} pts
                      </Text>
                    </View>
                  </View>
                  <DivergingBar delta={peca.delta} max={maxDelta} />
                </View>
              ))}
            </View>
          </View>

          {/* ── Leitura acionável ── */}
          <View className="mt-8">
            <SectionHeader title="O que fazer com isso" />
            <View className="px-4 gap-y-3">

              <View className="bg-surface border border-surface-4 rounded-card p-5">
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="w-7 h-7 rounded-xl bg-success/10 items-center justify-center">
                    <Ionicons name="trending-up" size={15} color={colors.success} />
                  </View>
                  <Text className="text-success text-2xs font-bold uppercase tracking-widest">
                    Está dando certo
                  </Text>
                </View>
                <Text className="text-ink text-sm font-bold">{destaque.nome}</Text>
                <Text className="text-ink-4 text-xs leading-5 mt-1">
                  {destaque.taxa}% de curtida, {destaque.delta} pts acima da sua média.
                  Vale publicar variações dessa peça — cor, estampa — enquanto o
                  público está respondendo.
                </Text>
              </View>

              <View className="bg-surface border border-surface-4 rounded-card p-5">
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="w-7 h-7 rounded-xl bg-danger/10 items-center justify-center">
                    <Ionicons name="trending-down" size={15} color={colors.danger} />
                  </View>
                  <Text className="text-danger text-2xs font-bold uppercase tracking-widest">
                    Vale rever
                  </Text>
                </View>
                <Text className="text-ink text-sm font-bold">{pior.nome}</Text>
                <Text className="text-ink-4 text-xs leading-5 mt-1">
                  {pior.taxa}% de curtida, {Math.abs(pior.delta)} pts abaixo da média,
                  mesmo com {formatarNumero(pior.impressoes)} pessoas vendo. Alcance não
                  é o problema — troque a primeira foto ou revise o preço antes de
                  investir mais nela.
                </Text>
              </View>

            </View>
          </View>

          {/* ── Categorias ── */}
          <View className="mt-8">
            <SectionHeader title="Categorias que mais engajam" />
            <View className="mx-4 bg-surface border border-surface-4 rounded-card p-5">
              {CATEGORIAS.map((cat) => (
                <MeterBar key={cat.nome} label={cat.nome} pct={cat.pct} />
              ))}
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
