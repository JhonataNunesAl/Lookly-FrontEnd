import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InteractionType } from '../types';
import { colors } from '../theme/colors';

/**
 * As três ações do swipe (curtir / passar / salvar), caracterizadas com a
 * paleta do app em vez de emoji — emoji ignora o tema e muda de desenho a cada
 * aparelho.
 *
 * Sobre as cores: `danger` (#A3301F) e `brand` (#B54A2E) são dois terracotas
 * quase iguais, então usar danger no "passar" o deixaria indistinguível do
 * "salvar". Por isso o descarte é `ink` (recusa neutra) e não vermelho.
 */

interface ActionConfig {
  icon: keyof typeof Ionicons.glyphMap;
  /** Lido por leitores de tela e usado no rótulo do botão. */
  label: string;
  /** Texto do selo que aparece sobre a foto ao arrastar o card. */
  stamp: string;
  tint: string;
}

export const SWIPE_ACTIONS: Record<InteractionType, ActionConfig> = {
  like: { icon: 'heart', label: 'Curtir', stamp: 'CURTIU', tint: colors.success },
  skip: { icon: 'close', label: 'Passar', stamp: 'PASSOU', tint: colors.ink.DEFAULT },
  save: { icon: 'bookmark', label: 'Salvar', stamp: 'SALVO', tint: colors.brand.DEFAULT },
};

// ─── Botão redondo sobre o card ───────────────────────────────────────────────

interface SwipeActionButtonProps {
  action: InteractionType;
  onPress: (action: InteractionType) => void;
}

/**
 * Disco claro com o ícone na cor da ação. O fundo é sólido de propósito: o
 * botão fica sobre a foto da peça, e um fundo translúcido some em roupa clara.
 */
export function SwipeActionButton({
  action,
  onPress,
}: SwipeActionButtonProps): React.ReactElement {
  const cfg = SWIPE_ACTIONS[action];

  return (
    <TouchableOpacity
      onPress={() => onPress(action)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={cfg.label}
      className="w-14 h-14 rounded-full bg-surface items-center justify-center"
      style={{
        shadowColor: colors.ink.DEFAULT,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 6,
      }}
    >
      <Ionicons name={cfg.icon} size={24} color={cfg.tint} />
    </TouchableOpacity>
  );
}

// ─── Selo de arrasto (CURTIU / PASSOU) ────────────────────────────────────────

interface SwipeStampProps {
  action: InteractionType;
}

/**
 * Selo sólido que surge conforme o card é arrastado. Quem anima a opacidade é
 * a tela — aqui só mora a aparência.
 */
export function SwipeStamp({ action }: SwipeStampProps): React.ReactElement {
  const cfg = SWIPE_ACTIONS[action];

  return (
    <View
      className="flex-row items-center gap-2 rounded-xl px-4 py-2"
      style={{ backgroundColor: cfg.tint }}
    >
      <Ionicons name={cfg.icon} size={18} color={colors.white} />
      <Text className="text-white text-lg font-black tracking-wide">{cfg.stamp}</Text>
    </View>
  );
}
