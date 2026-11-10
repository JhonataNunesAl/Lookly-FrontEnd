import React from 'react';
import {
  TouchableOpacity,
  View,
} from 'react-native';
import Text from './Text';
import { Ionicons } from '@expo/vector-icons';
import { InteractionType } from '../types';
import { colors } from '../theme/colors';

/**
 * As três ações do feed (passar / curtir / salvar) como campos de um cupom de
 * pedido: duas fichas de papel com filete de tinta (passar, salvar) e uma ficha
 * vermelha de selo (curtir, a ação principal, no centro). Cada uma leva o
 * pictograma e o rótulo — a pessoa lê o que a ação faz em vez de decorar um
 * ícone solto. 56dp de altura (alvo do Material: 48dp).
 *
 * O selo que surge ao arrastar o card é um carimbo de borracha inclinado
 * (CURTIR / PASSAR), a assinatura de interação do mundo de catálogo.
 */

interface ActionConfig {
  icon: keyof typeof Ionicons.glyphMap;
  /** Rótulo da ficha e do leitor de tela. */
  label: string;
  /** Texto do carimbo que aparece sobre a foto ao arrastar o card. */
  stamp: string;
  /** Ficha cheia (ação principal) ou só filete. */
  primary: boolean;
}

export const SWIPE_ACTIONS: Record<InteractionType, ActionConfig> = {
  like: { icon: 'heart', label: 'Curtir', stamp: 'CURTIR', primary: true },
  skip: { icon: 'close', label: 'Passar', stamp: 'PASSAR', primary: false },
  save: { icon: 'bookmark', label: 'Salvar', stamp: 'SALVAR', primary: false },
};

// ─── Ficha de ação ────────────────────────────────────────────────────────────

interface SwipeActionButtonProps {
  action: InteractionType;
  onPress: (action: InteractionType) => void;
}

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
      className={`flex-1 h-14 rounded-card border-2 flex-row items-center justify-center gap-2 px-2 ${
        cfg.primary ? 'bg-seal border-seal' : 'bg-surface border-ink'
      }`}
    >
      <Ionicons name={cfg.icon} size={22} color={cfg.primary ? colors.white : colors.ink.DEFAULT} />
      <Text className={`text-base font-sans-bold ${cfg.primary ? 'text-white' : 'text-ink'}`}>{cfg.label}</Text>
    </TouchableOpacity>
  );
}

// ─── Carimbo de arrasto (CURTIR / PASSAR) ─────────────────────────────────────

interface SwipeStampProps {
  action: InteractionType;
}

/**
 * Carimbo de borracha com moldura dupla, inclinado: vermelho para curtir, tinta
 * para passar. Quem anima a opacidade é a tela — aqui só mora a aparência.
 */
export function SwipeStamp({ action }: SwipeStampProps): React.ReactElement {
  const cfg = SWIPE_ACTIONS[action];
  const like = action === 'like';
  const cor = like ? colors.seal.DEFAULT : colors.ink.DEFAULT;

  return (
    <View
      className="bg-surface/90 rounded-card px-3 py-1"
      style={{ borderWidth: 4, borderColor: cor, transform: [{ rotate: like ? '-8deg' : '8deg' }] }}
    >
      <View className="rounded-sm px-2" style={{ borderWidth: 1.5, borderColor: cor }}>
        <Text className="text-3xl font-display-black" style={{ color: cor }}>
          {cfg.stamp}
        </Text>
      </View>
    </View>
  );
}
