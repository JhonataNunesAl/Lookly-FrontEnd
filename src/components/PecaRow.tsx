import React from 'react';
import {
  TouchableOpacity,
  View,
} from 'react-native';
import Text from './Text';
import { LookResponse } from '../types/api';
import { contar, formatarMoeda } from '../utils/format';
import PecaFoto from './PecaFoto';

interface PecaRowProps {
  look: LookResponse;
  onPress: () => void;
  /** Ação à direita do cartão (ex.: remover dos salvos). */
  trailing?: React.ReactNode;
}

/** Código de item curto e estável, tirado do id da peça: "Ref. 7F3A". */
export function refDaPeca(id: string): string {
  return `Ref. ${id.replace(/-/g, '').slice(-4).toUpperCase()}`;
}

/**
 * Peça em linha — uma entrada de página de catálogo: foto emoldurada à
 * esquerda; nome em serifa, código de item datilografado e o preço em vermelho
 * de selo à direita. É a forma de listar peças fora do feed (busca, salvos,
 * loja).
 */
export default function PecaRow({ look, onPress, trailing }: PecaRowProps): React.ReactElement {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${look.name}. Ver detalhes`}
      className="flex-row bg-surface rounded-card border border-surface-5 p-3 mb-3"
    >
      <View className="p-1 border border-ink bg-surface">
        <PecaFoto uri={look.photos[0]} compact className="w-24 h-32" />
      </View>

      <View className="flex-1 ml-3 justify-between">
        <View className="flex-row items-start">
          <View className="flex-1 pr-2">
            <Text className="text-ink text-lg font-display-bold" numberOfLines={2}>
              {look.name}
            </Text>
            <Text className="text-ink-4 text-sm font-mono mt-0.5">{refDaPeca(look.id)}</Text>
            <Text className="text-ink-4 text-sm font-display-italic">
              {contar(look.likes_count, 'curtida', 'curtidas')}
            </Text>
          </View>
          {trailing}
        </View>

        <View className="border-t border-dotted border-ink-5 pt-1">
          <Text className="text-seal text-2xl font-display-bold text-right">
            {look.price != null ? formatarMoeda(look.price, true) : 'Sem preço'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
