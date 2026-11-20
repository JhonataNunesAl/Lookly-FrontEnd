import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Text from './Text';
import PecaFoto from './PecaFoto';
import { MeterBar, SectionHeader, StatBoard } from './PanelKit';
import { colors } from '../theme/colors';
import { Metricas, PecaMetrica } from '../types/api';
import { Periodo } from '../lib/inventory';
import { diaCurto, rotuloCanal, variacao } from '../utils/estoque';
import { contar, formatarDelta, formatarMoeda, formatarNumero } from '../utils/format';

export const PERIODOS: { id: Periodo; rotulo: string }[] = [
  { id: 7, rotulo: '7 dias' },
  { id: 30, rotulo: '30 dias' },
  { id: 90, rotulo: '90 dias' },
  { id: 365, rotulo: '12 meses' },
];

export function SeletorPeriodo({ valor, onChange }: { valor: Periodo; onChange: (p: Periodo) => void }): React.ReactElement {
  return (
    <View className="flex-row px-4 gap-2">
      {PERIODOS.map((p) => {
        const ativo = p.id === valor;
        return (
          <TouchableOpacity
            key={p.id}
            onPress={() => onChange(p.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: ativo }}
            className={`flex-1 min-h-11 items-center justify-center ${ativo ? 'bg-ink border-2 border-ink' : 'bg-surface border border-surface-5'}`}
          >
            <Text className={`text-sm ${ativo ? 'text-white font-sans-bold' : 'text-ink-3 font-sans-semibold'}`}>{p.rotulo}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** Junta a série diária em no máximo `max` barras (semanas/meses em períodos longos). */
function agrupar(serie: Metricas['series'], max = 30) {
  const tamanho = Math.max(1, Math.ceil(serie.length / max));
  const grupos: { rotulo: string; valor: number }[] = [];
  for (let i = 0; i < serie.length; i += tamanho) {
    const fatia = serie.slice(i, i + tamanho);
    grupos.push({ rotulo: diaCurto(fatia[0].day), valor: fatia.reduce((s, p) => s + Number(p.revenue || 0), 0) });
  }
  return { grupos, tamanho };
}

/** Faturamento ao longo do período: uma barra por dia (ou por grupo de dias). */
export function GraficoFaturamento({ serie }: { serie: Metricas['series'] }): React.ReactElement {
  const { grupos, tamanho } = agrupar(serie);
  const maior = Math.max(...grupos.map((g) => g.valor), 0);
  const melhor = grupos.reduce((a, g) => (g.valor > a.valor ? g : a), grupos[0]);
  return (
    <View className="mx-4 bg-surface border border-surface-5 rounded-card p-4">
      {maior === 0 ? (
        <Text className="text-ink-4 text-base font-display-italic">Nenhuma venda no período.</Text>
      ) : (
        <>
          <View
            className="flex-row items-end h-32 gap-[2px]"
            accessible
            accessibilityLabel={`Faturamento por ${tamanho > 1 ? `grupo de ${tamanho} dias` : 'dia'}. Melhor: ${melhor.rotulo}, ${formatarMoeda(melhor.valor)}.`}
          >
            {grupos.map((g) => (
              <View key={g.rotulo} className="flex-1 h-full justify-end">
                <View
                  className={g.valor > 0 ? 'bg-seal rounded-t-sm' : 'bg-surface-4'}
                  style={{ height: g.valor > 0 ? `${Math.max((g.valor / maior) * 100, 3)}%` : 2 }}
                />
              </View>
            ))}
          </View>
          <View className="flex-row justify-between mt-1.5">
            <Text className="text-ink-4 text-xs font-sans-medium">{grupos[0]?.rotulo}</Text>
            <Text className="text-ink-4 text-xs font-sans-medium">
              {tamanho > 1 ? `cada barra = ${tamanho} dias` : 'por dia'}
            </Text>
            <Text className="text-ink-4 text-xs font-sans-medium">{grupos[grupos.length - 1]?.rotulo}</Text>
          </View>
          <Text className="text-ink-3 text-sm font-display-italic mt-2">
            Melhor {tamanho > 1 ? 'período' : 'dia'}: {melhor.rotulo}, {formatarMoeda(melhor.valor)}
          </Text>
        </>
      )}
    </View>
  );
}

function ListaPecas({ itens, valor, vazio }: { itens: PecaMetrica[]; valor: (p: PecaMetrica) => string; vazio: string }) {
  if (itens.length === 0) {
    return <Text className="text-ink-4 text-base font-display-italic px-4">{vazio}</Text>;
  }
  return (
    <View className="px-4 gap-y-2">
      {itens.map((p, i) => (
        <View key={p.look_id} className="flex-row items-center bg-surface border border-surface-5 rounded-card p-3 gap-3">
          <Text className="text-seal text-2xl font-display-bold w-6 text-center">{i + 1}</Text>
          <View className="p-0.5 border border-ink bg-surface">
            <PecaFoto uri={p.photo ?? undefined} compact className="w-10 h-14" />
          </View>
          <Text className="text-ink text-base font-display-bold flex-1" numberOfLines={2}>{p.name}</Text>
          <Text className="text-ink-3 text-sm font-sans-bold text-right">{valor(p)}</Text>
        </View>
      ))}
    </View>
  );
}

/** Vendas do app no período: taxa Lookly, tarifa do Mercado Pago e o líquido. */
function QuantoVoceRecebe({ m }: { m: Metricas }) {
  const t = m.platform_fee;
  const app = Number(m.revenue_app || 0);
  if (!t && app === 0) return null;
  const pct = t ? String(Number(t.current_percent)).replace('.', ',') : '0';
  return (
    <View className="mt-6">
      <SectionHeader title="Quanto você recebe" />
      {t && (
        <View className="mx-4 mb-3 flex-row gap-2 items-start bg-surface border border-seal rounded-card p-4">
          <MaterialCommunityIcons name="tag-heart-outline" size={22} color={colors.seal.DEFAULT} />
          <View className="flex-1">
            <Text className="text-ink text-base font-display-bold">Taxa Lookly hoje: {pct}%</Text>
            <Text className="text-ink-3 text-sm font-sans-medium mt-0.5">{t.message}</Text>
          </View>
        </View>
      )}
      {app > 0 && (
        <View className="mx-4 bg-surface border border-surface-5 rounded-card px-5 py-2">
          <StatBoard
            tone="surface"
            items={[
              { label: 'Vendido no app', value: formatarMoeda(app, true) },
              { label: 'Taxa Lookly', value: formatarMoeda(m.platform_fees ?? 0, true) },
              { label: 'Tarifa Mercado Pago', value: formatarMoeda(m.mp_fees ?? 0, true) },
              { label: 'Você recebe', value: formatarMoeda(m.net_revenue_app ?? app, true) },
            ]}
          />
        </View>
      )}
      {app > 0 && (
        <Text className="text-ink-4 text-sm font-display-italic px-5 mt-2">
          Só vendas pelo app. O que você vende fora do app não paga taxa nem tarifa.
        </Text>
      )}
    </View>
  );
}

/**
 * Bloco de vendas e estoque das Insights (`GET /inventory/metrics`): tudo real —
 * pedidos pagos no app somados às vendas registradas fora dele.
 */
export default function PainelVendas({ m }: { m: Metricas }): React.ReactElement {
  const receita = Number(m.revenue || 0);
  const delta = variacao(receita, Number(m.revenue_prev || 0));
  const canais = Object.entries(m.revenue_by_channel || {})
    .map(([c, v]) => ({ c, v: Number(v || 0) }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v);
  const lucro = m.gross_profit != null ? Number(m.gross_profit) : null;
  const comCusto = Number(m.revenue_with_cost || 0);
  const margem = lucro != null && comCusto > 0 ? Math.round((lucro / comCusto) * 100) : null;

  return (
    <View>
      {/* Vendas no período */}
      <View className="bg-ink px-5 py-2 mt-3">
        <StatBoard
          items={[
            { label: 'Faturamento', value: formatarMoeda(receita) },
            { label: 'Vendas', value: formatarNumero(m.sales_count) },
            { label: 'Peças vendidas', value: formatarNumero(m.units_sold) },
            { label: 'Ticket médio', value: m.avg_ticket != null ? formatarMoeda(m.avg_ticket) : '—' },
          ]}
        />
      </View>
      <Text className="text-ink-4 text-sm font-display-italic px-5 mt-2">
        {delta == null
          ? 'Sem vendas no período anterior para comparar.'
          : `${formatarDelta(delta)} de faturamento em relação aos ${m.period_days} dias anteriores.`}
      </Text>

      <View className="mt-6">
        <SectionHeader title="Faturamento no período" />
        <GraficoFaturamento serie={m.series} />
      </View>

      {canais.length > 0 && (
        <View className="mt-6">
          <SectionHeader title="Onde você vende" />
          <View className="mx-4 bg-surface border border-surface-5 rounded-card p-5">
            {canais.map((x) => (
              <MeterBar
                key={x.c}
                label={rotuloCanal(x.c)}
                pct={receita > 0 ? Math.round((x.v / receita) * 100) : 0}
                valueLabel={`${formatarMoeda(x.v)} · ${receita > 0 ? Math.round((x.v / receita) * 100) : 0}%`}
              />
            ))}
          </View>
        </View>
      )}

      <QuantoVoceRecebe m={m} />

      {/* Lucro */}
      <View className="mt-6">
        <SectionHeader title="Lucro e estoque" />
        <View className="mx-4 bg-surface border border-surface-5 rounded-card px-5 py-2">
          <StatBoard
            tone="surface"
            items={[
              { label: 'Lucro bruto estimado', value: lucro != null ? formatarMoeda(lucro) : '—' },
              { label: 'Margem', value: margem != null ? `${margem}%` : '—' },
              { label: 'Estoque a preço de venda', value: formatarMoeda(m.stock_value_price) },
              { label: 'Custo do estoque', value: formatarMoeda(m.stock_value_cost) },
            ]}
          />
        </View>
        <Text className="text-ink-4 text-sm font-display-italic px-5 mt-2">
          {lucro == null
            ? 'Informe quanto cada peça custou (em Editar) para ver o lucro e a margem.'
            : m.pieces_without_cost > 0
              ? `Lucro calculado só sobre peças com custo informado. ${contar(m.pieces_without_cost, 'peça em estoque está', 'peças em estoque estão')} sem custo.`
              : 'Lucro = valor vendido menos o custo das peças vendidas.'}
        </Text>
      </View>

      {/* Giro */}
      <View className="mt-6">
        <SectionHeader title="Giro do estoque" />
        <View className="mx-4 bg-surface border border-surface-5 rounded-card px-5 py-2">
          <StatBoard
            tone="surface"
            items={[
              { label: 'Do estoque que vendeu', value: m.sell_through_pct != null ? `${String(m.sell_through_pct).replace('.', ',')}%` : '—' },
              { label: 'Dias até vender (média)', value: m.avg_days_to_sell != null ? String(Math.round(m.avg_days_to_sell)) : '—' },
              { label: `Paradas há +${m.stale_days} dias`, value: formatarNumero(m.stale_count) },
              { label: 'Unidades em estoque', value: formatarNumero(m.units_in_stock) },
              { label: 'Reservadas', value: formatarNumero(m.units_reserved) },
            ]}
          />
        </View>
        <Text className="text-ink-4 text-sm font-display-italic px-5 mt-2">
          "Do estoque que vendeu" = peças vendidas no período ÷ (vendidas + o que ainda está em estoque).
        </Text>
      </View>

      <View className="mt-6">
        <SectionHeader title="Mais vendidas" />
        <ListaPecas
          itens={m.top_sold}
          valor={(p) => `${p.value} un.\n${formatarMoeda(p.detail ?? 0)}`}
          vazio="Nenhuma venda no período."
        />
      </View>

      {m.views != null && (
        <View className="mt-6">
          <SectionHeader title="Mais vistas" />
          <Text className="text-ink-4 text-sm font-display-italic px-5 -mt-1 mb-2">
            {contar(m.views, 'visualização', 'visualizações')} no feed no período
            {m.views > 0 && m.units_sold > 0 ? ` · 1 venda a cada ${formatarNumero(Math.max(1, Math.round(m.views / m.units_sold)))} vistas` : ''}
          </Text>
          <ListaPecas itens={m.top_viewed} valor={(p) => `${formatarNumero(p.value)}\nvistas`} vazio="Ninguém viu suas peças no feed no período." />
        </View>
      )}

      <View className="mt-6">
        <SectionHeader title="Paradas há mais tempo" />
        {m.stale.length > 0 && (
          <View className="mx-4 mb-2 flex-row gap-2 items-center">
            <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color={colors.warning} />
            <Text className="text-ink-3 text-sm font-display-italic flex-1">
              Troque a foto de capa, ajuste o preço ou faça um combo. Na aba Estoque, filtre por "Paradas".
            </Text>
          </View>
        )}
        <ListaPecas itens={m.stale} valor={(p) => `${p.value}\ndias`} vazio={`Nenhuma peça parada há mais de ${m.stale_days} dias.`} />
      </View>
    </View>
  );
}
