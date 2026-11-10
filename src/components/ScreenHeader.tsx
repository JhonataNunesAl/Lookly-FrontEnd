import React from 'react';
import {
  View,
} from 'react-native';
import Text from './Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from './Button';

interface ScreenHeaderProps {
  title: string;
  /** Linha pequena sob o título (ex.: contagem de itens). */
  subtitle?: string;
  /** Sem `onBack` não há botão de voltar (telas raiz de aba). */
  onBack?: () => void;
  /** Elemento à direita (contador, ação). */
  right?: React.ReactNode;
}

/**
 * Cabeçalho de página de catálogo: título em serifa sobre o papel, filete duplo
 * de tinta embaixo e o botão de voltar (quadrado de tinta de 48dp) à esquerda.
 * Ele sobe até a borda da tela e o `SafeAreaView` empurra o conteúdo para baixo
 * da barra de status — é o que impede o relógio de colidir com o título no
 * Android.
 */
export default function ScreenHeader({ title, subtitle, onBack, right }: ScreenHeaderProps): React.ReactElement {
  return (
    <SafeAreaView edges={['top']} className="bg-background">
      <View className={`flex-row items-center gap-3 min-h-16 py-2 ${onBack ? 'px-4' : 'px-5'}`}>
        {onBack ? <Button variant="icon" icon="arrow-back" accessibilityLabel="Voltar" onPress={onBack} /> : null}
        <View className="flex-1">
          <Text className="text-ink text-2xl font-display-bold" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-ink-3 text-base font-display-italic" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
      <View className="h-[5px] border-t-2 border-b border-ink" />
    </SafeAreaView>
  );
}
