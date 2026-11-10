import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  TouchableOpacity,
} from 'react-native';
import Text from './Text';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

/**
 * Botão único do app, na linguagem de catálogo: ficha de tinta escura com
 * rótulo em papel claro e, quando há ícone, o pictograma à esquerda. O vermelho
 * NÃO é cor de botão (é do selo de preço e da moldura) — ação é de tinta.
 *
 * Variantes: `primary` (tinta), `secondary` (papel com filete de tinta),
 * `danger` (vermelho — sair, remover, revogar) e `icon` (quadrado de tinta de
 * pictograma, 48dp). Toda tela usa isto em vez de montar um
 * CTA próprio.
 *
 * Feedback de toque: encolhe ~3% ao pressionar e volta com mola (`Animated`
 * clássico, o mesmo do FeedScreen/ProductDetailSheet).
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
  /** Obrigatório em variant="icon" (não tem label visível para leitor de tela). */
  accessibilityLabel?: string;
}

/** Alvo mínimo do Material: 48dp. Faixas de ação usam 56dp. */
const HEIGHT = 'h-14';

function usePressScale() {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return { scale, onPressIn, onPressOut };
}

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
  const { scale, onPressIn, onPressOut } = usePressScale();

  if (variant === 'icon') {
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={isDisabled}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? label}
          className={`w-12 h-12 rounded-lg bg-ink border-2 border-ink items-center justify-center ${isDisabled ? 'opacity-50' : ''}`}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            icon && <Ionicons name={icon} size={22} color={colors.white} />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  const tone =
    variant === 'danger'
      ? { box: 'bg-danger border-2 border-danger', text: 'text-white', color: colors.white }
      : variant === 'secondary'
        ? { box: 'bg-surface border-2 border-ink', text: 'text-ink', color: colors.ink.DEFAULT }
        : { box: 'bg-ink border-2 border-ink', text: 'text-white', color: colors.white };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        activeOpacity={0.9}
        accessibilityRole="button"
        className={`${HEIGHT} rounded-card flex-row items-center justify-center gap-3 px-5 ${tone.box} ${isDisabled ? 'opacity-50' : ''}`}
      >
        {loading ? (
          <ActivityIndicator color={tone.color} />
        ) : (
          <>
            {icon && <Ionicons name={icon} size={20} color={tone.color} />}
            <Text className={`text-base font-sans-bold ${tone.text}`}>{label}</Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}
