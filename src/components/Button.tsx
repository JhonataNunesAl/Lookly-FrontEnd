import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, BRAND_GRADIENT_SOLID } from '../theme/colors';

/**
 * Botão único pro app inteiro — a auditoria da sessão de 2026-07-26 achou
 * CTAs alternando entre `TouchableOpacity` com `bg-brand` flat e um
 * `LinearGradient` com `BRAND_GRADIENT_SOLID`, com altura (`h-14`/`h-16`) e
 * raio de borda diferentes quase tela por tela — a causa raiz do visual
 * "amador" que motivou este componente. Toda tela nova (e as antigas, aos
 * poucos) usam isto em vez de inventar CTA de novo.
 */

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'icon';

interface ButtonProps {
  variant?: ButtonVariant;
  /** Obrigatório em primary/secondary/danger. Ignorado em icon. */
  label?: string;
  /** Ícone à esquerda do label — ou o conteúdo inteiro quando variant="icon". */
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Obrigatório em variant="icon" (não tem label visível pra tela de leitor). */
  accessibilityLabel?: string;
}

const HEIGHT = 'h-14';

export default function Button({
  variant = 'primary',
  label,
  icon,
  onPress,
  loading = false,
  disabled = false,
  accessibilityLabel,
}: ButtonProps): React.ReactElement {
  const isDisabled = disabled || loading;

  if (variant === 'icon') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        className={`w-11 h-11 rounded-full bg-surface border border-surface-4 items-center justify-center ${
          isDisabled ? 'opacity-50' : ''
        }`}
      >
        {loading ? (
          <ActivityIndicator color={colors.ink[4]} size="small" />
        ) : (
          icon && <Ionicons name={icon} size={20} color={colors.ink[4]} />
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.85}
        accessibilityRole="button"
        className={`overflow-hidden rounded-2xl ${HEIGHT} ${isDisabled ? 'opacity-60' : ''}`}
      >
        <LinearGradient
          colors={[...BRAND_GRADIENT_SOLID]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="flex-1 flex-row items-center justify-center gap-2"
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              {icon && <Ionicons name={icon} size={18} color={colors.white} />}
              <Text className="text-white text-base font-black">{label}</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const isDanger = variant === 'danger';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      className={`${HEIGHT} rounded-2xl border flex-row items-center justify-center gap-2 ${
        isDanger ? 'border-danger' : 'border-brand'
      } ${isDisabled ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={isDanger ? colors.danger : colors.brand.DEFAULT} />
      ) : (
        <>
          {icon && (
            <Ionicons name={icon} size={18} color={isDanger ? colors.danger : colors.brand.DEFAULT} />
          )}
          <Text className={`text-base font-bold ${isDanger ? 'text-danger' : 'text-brand'}`}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
