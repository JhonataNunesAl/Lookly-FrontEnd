import React, { useEffect, useState } from 'react';
import {
  Image,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Text from './Text';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface PecaFotoProps {
  uri?: string | null;
  /** Classes do contêiner (tamanho, raio). Sem tamanho próprio, preenche o pai. */
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** Fallback sem texto, para miniaturas pequenas. */
  compact?: boolean;
}

/**
 * Foto da peça com fallback. Se a URL faltar ou não carregar (link quebrado,
 * formato que o React Native não renderiza — SVG, por exemplo), mostra um
 * pictograma em vez de um bloco vazio: a pessoa ainda entende que ali existe
 * uma peça e a lista não parece quebrada.
 */
export default function PecaFoto({ uri, className = '', style, compact = false }: PecaFotoProps): React.ReactElement {
  const [falhou, setFalhou] = useState(false);
  useEffect(() => setFalhou(false), [uri]);

  return (
    <View className={`overflow-hidden bg-surface-3 ${className}`} style={style}>
      {!uri || falhou ? (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="shirt-outline" size={compact ? 28 : 56} color={colors.ink[6]} />
          {!compact && (
            <Text className="text-ink-4 text-sm font-sans-semibold mt-2">Foto indisponível</Text>
          )}
        </View>
      ) : (
        <Image
          source={{ uri }}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
          resizeMode="cover"
          onError={() => setFalhou(true)}
        />
      )}
    </View>
  );
}
