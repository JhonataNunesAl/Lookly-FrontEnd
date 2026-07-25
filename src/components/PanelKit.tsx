import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

/**
 * Blocos compartilhados pelas telas de painel (perfil do usuário, perfil da
 * marca e insights). Nasceram duplicados na ProfileScreen; foram extraídos
 * quando a área de empresa passou a precisar dos mesmos pedaços.
 */

// ─── Número-chave ─────────────────────────────────────────────────────────────

interface StatTileProps {
  value: string | number;
  label: string;
  /** `ink` para uso dentro do cartão escuro; `surface` para o fundo creme. */
  tone?: 'ink' | 'surface';
}

/**
 * Um número que se lê sozinho — não um gráfico de uma barra só.
 * Sem `tabular-nums` de propósito: dígitos de largura fixa deixam número grande
 * com espaçamento frouxo.
 */
export function StatTile({ value, label, tone = 'ink' }: StatTileProps): React.ReactElement {
  const isInk = tone === 'ink';
  return (
    <View
      className={`flex-1 rounded-2xl px-3 py-3 ${
        isInk ? 'bg-ink-2' : 'bg-surface border border-surface-4'
      }`}
    >
      <Text className={`text-xl font-bold ${isInk ? 'text-background' : 'text-ink'}`}>
        {value}
      </Text>
      <Text
        className={`text-2xs uppercase tracking-widest mt-0.5 ${
          isInk ? 'text-ink-6' : 'text-ink-5'
        }`}
      >
        {label}
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
 * Trilho recessivo + preenchimento fino na cor da marca.
 *
 * Uma cor só para todas as barras, de propósito: as categorias aqui são
 * nominais (peças, categorias de roupa), então pintar cada uma de um tom
 * diferente só repetiria o que o comprimento já mostra.
 * O número veste tinta, nunca a cor da barra.
 */
export function MeterBar({ label, pct, valueLabel }: MeterBarProps): React.ReactElement {
  return (
    <View className="mb-3.5">
      <View className="flex-row items-center justify-between mb-1.5">
        <Text className="text-ink-3 text-sm capitalize font-medium flex-1" numberOfLines={1}>
          {label}
        </Text>
        <Text className="text-ink-4 text-xs ml-3" style={{ fontVariant: ['tabular-nums'] }}>
          {valueLabel ?? `${pct}%`}
        </Text>
      </View>
      <View className="h-1.5 rounded-full bg-surface-4 overflow-hidden">
        {/* Mínimo de 2% para a barra não sumir quando o valor é quase zero */}
        <View className="h-full rounded-full bg-brand" style={{ width: `${Math.max(pct, 2)}%` }} />
      </View>
    </View>
  );
}

// ─── Títulos ──────────────────────────────────────────────────────────────────

export function SectionHeader({
  title, actionLabel, onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}): React.ReactElement {
  return (
    <View className="flex-row items-center justify-between px-5 mb-3">
      <Text className="text-ink text-lg font-bold">{title}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} accessibilityRole="button">
          <Text className="text-brand text-xs font-bold">{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function SectionTitle({ title }: { title: string }): React.ReactElement {
  return (
    <Text className="text-ink-5 text-[10px] uppercase tracking-[2px] font-bold mt-3 mb-1 ml-1">
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

export function MenuButton({
  icon, label, onPress, badge, destructive = false,
}: MenuButtonProps): React.ReactElement {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center justify-between bg-surface border border-surface-4 px-5 py-4 rounded-3xl"
    >
      <View className="flex-row items-center gap-4">
        <View
          className={`w-10 h-10 rounded-2xl items-center justify-center ${
            destructive ? 'bg-danger/10' : 'bg-brand/10'
          }`}
        >
          <Ionicons name={icon} size={20} color={destructive ? colors.danger : colors.brand.DEFAULT} />
        </View>
        <Text className={`${destructive ? 'text-danger' : 'text-ink'} font-medium`}>{label}</Text>
      </View>

      <View className="flex-row items-center gap-2">
        {badge ? (
          <View className="bg-brand rounded-full px-2 py-0.5">
            <Text className="text-white text-[10px] font-bold">{badge}</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={16} color={colors.ink[6]} />
      </View>
    </TouchableOpacity>
  );
}
