import React from 'react';
import {
  TouchableOpacity,
  View,
} from 'react-native';
import Text from './Text';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

/**
 * Blocos compartilhados pelas telas de painel (perfil do usuário, perfil da
 * marca e insights), na linguagem de catálogo: números em serifa, títulos de
 * seção com filete vermelho, pictogramas em quadrados de tinta.
 */

// ─── Número-chave ─────────────────────────────────────────────────────────────

interface StatTileProps {
  value: string | number;
  label: string;
  /** `ink` para uso dentro do cartão escuro; `surface` para o fundo claro. */
  tone?: 'ink' | 'surface';
}

/**
 * Um número que se lê sozinho, em serifa — a hierarquia vem do contraste de
 * tamanho entre o número e o rótulo, não de cor extra.
 */
export function StatTile({ value, label, tone = 'ink' }: StatTileProps): React.ReactElement {
  const isInk = tone === 'ink';
  return (
    <View
      className={`flex-1 rounded-card px-3 py-3 ${isInk ? 'bg-ink-2' : 'bg-surface'}`}
    >
      <Text className={`text-3xl font-display-bold ${isInk ? 'text-signal' : 'text-ink'}`}>
        {value}
      </Text>
      <Text className={`text-xs font-sans-medium mt-0.5 ${isInk ? 'text-white' : 'text-ink-4'}`}>
        {label}
      </Text>
    </View>
  );
}

// ─── Placar ───────────────────────────────────────────────────────────────────

interface StatBoardProps {
  items: { label: string; value: string | number }[];
  /** `ink` dentro de uma faixa preta; `surface` sobre painel branco. */
  tone?: 'ink' | 'surface';
}

/**
 * Ficha de dados: um número por linha, rótulo à esquerda, valor em serifa à
 * direita, ligados por uma linha pontilhada como numa tabela de preços de
 * catálogo. Substitui a fileira de três cartões-métrica.
 */
export function StatBoard({ items, tone = 'ink' }: StatBoardProps): React.ReactElement {
  const isInk = tone === 'ink';
  return (
    <View>
      {items.map((it) => (
        <View key={it.label} className="flex-row items-end min-h-14 py-2">
          <Text className={`text-base font-sans-semibold ${isInk ? 'text-white' : 'text-ink-3'}`}>{it.label}</Text>
          {/* Linha pontilhada de ficha: liga o rótulo ao valor */}
          <View className={`flex-1 mx-2 mb-2 border-b border-dotted ${isInk ? 'border-white/60' : 'border-ink-5'}`} />
          <Text
            className={`text-3xl font-display-bold ${isInk ? 'text-signal' : 'text-ink'}`}
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {it.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Faixa de tinta que avisa que os números da tela ainda são de exemplo. */
export function AmostraPlate(): React.ReactElement {
  return (
    <View className="bg-ink flex-row items-center gap-2 px-5 min-h-12">
      <Ionicons name="information-circle" size={22} color={colors.signal.DEFAULT} />
      <Text className="flex-1 text-white text-sm font-sans-semibold">
        Dados de exemplo — a loja ainda não tem vendas reais.
      </Text>
    </View>
  );
}

// ─── Barra de proporção ───────────────────────────────────────────────────────

interface MeterBarProps {
  label: string;
  /** 0–100. */
  pct: number;
  /** Texto à direita. Default: `{pct}%`. */
  valueLabel?: string;
}

/**
 * Trilho de papel + preenchimento vermelho de selo. Uma cor só para todas as barras: as
 * categorias são nominais, então o comprimento já diz tudo. O número veste tinta.
 */
export function MeterBar({ label, pct, valueLabel }: MeterBarProps): React.ReactElement {
  return (
    <View className="mb-3.5">
      <View className="flex-row items-center justify-between mb-1.5">
        <Text className="text-ink text-sm capitalize font-sans-semibold flex-1" numberOfLines={1}>
          {label}
        </Text>
        <Text className="text-ink-4 text-xs font-sans-medium ml-3" style={{ fontVariant: ['tabular-nums'] }}>
          {valueLabel ?? `${pct}%`}
        </Text>
      </View>
      <View className="h-2 rounded-sm bg-surface-4 overflow-hidden">
        {/* Mínimo de 2% para a barra não sumir quando o valor é quase zero */}
        <View className="h-full rounded-sm bg-seal" style={{ width: `${Math.max(pct, 2)}%` }} />
      </View>
    </View>
  );
}

// ─── Títulos ──────────────────────────────────────────────────────────────────

/**
 * Título de seção de catálogo: nome em serifa, um filete vermelho que se estica
 * até o canto e, se houver, a ação sublinhada à direita.
 */
export function SectionHeader({
  title, actionLabel, onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}): React.ReactElement {
  return (
    <View className="flex-row items-center px-4 min-h-12 mb-2 gap-3">
      <Text className="text-ink text-xl font-display-bold">{title}</Text>
      <View className="flex-1 h-[2px] bg-seal" />
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          accessibilityRole="button"
          className="min-h-12 justify-center"
        >
          <Text className="text-ink text-sm font-sans-bold underline">{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function SectionTitle({ title }: { title: string }): React.ReactElement {
  return (
    <Text className="text-ink-3 text-lg font-display-italic mt-3 mb-1 ml-1">
      {title}
    </Text>
  );
}

// ─── Item de menu ─────────────────────────────────────────────────────────────

interface MenuButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  badge?: number;
  destructive?: boolean;
}

/** Linha de menu: pictograma branco em quadrado preto (ou vermelho) + rótulo. */
export function MenuButton({
  icon, label, onPress, badge, destructive = false,
}: MenuButtonProps): React.ReactElement {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center justify-between bg-surface px-4 min-h-16 rounded-card border border-surface-5"
    >
      <View className="flex-row items-center gap-4">
        <View
          className={`w-10 h-10 rounded-lg items-center justify-center ${
            destructive ? 'bg-danger' : 'bg-ink'
          }`}
        >
          <Ionicons name={icon} size={22} color={colors.white} />
        </View>
        <Text className={`${destructive ? 'text-danger' : 'text-ink'} text-base font-sans-semibold`}>{label}</Text>
      </View>

      <View className="flex-row items-center gap-2">
        {badge ? (
          <View className="bg-seal rounded-md px-2 py-0.5 min-w-6 items-center">
            <Text className="text-white text-xs font-sans-bold">{badge}</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={colors.ink[5]} />
      </View>
    </TouchableOpacity>
  );
}
