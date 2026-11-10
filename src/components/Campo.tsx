import React from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import Text from './Text';
import { colors } from '../theme/colors';

interface CampoProps extends Omit<TextInputProps, 'style'> {
  rotulo: string;
  /** Linha de ajuda em itálico sob o campo. */
  dica?: string;
  /** Mensagem de erro (substitui a dica, em vermelho de selo). */
  erro?: string | null;
  multilinha?: boolean;
}

/**
 * Campo de formulário de catálogo: rótulo, e uma "linha de preencher" de cupom —
 * papel claro, filete fino e sublinhado de tinta mais grosso (a mesma do campo de
 * busca). Substitui as caixas de borda grossa que cada tela montava sozinha.
 */
export default function Campo({
  rotulo, dica, erro, multilinha = false, ...rest
}: CampoProps): React.ReactElement {
  return (
    <View>
      <Text className="text-ink text-base font-display-bold mb-1">{rotulo}</Text>
      <View
        className={`bg-surface border border-b-2 border-b-ink px-3 justify-center ${
          erro ? 'border-seal' : 'border-surface-5'
        } ${multilinha ? 'min-h-32 py-3' : 'min-h-14'}`}
      >
        <TextInput
          className="text-ink text-base font-sans-medium"
          placeholderTextColor={colors.ink[5]}
          accessibilityLabel={rotulo}
          multiline={multilinha}
          textAlignVertical={multilinha ? 'top' : 'center'}
          style={multilinha ? { minHeight: 88 } : { paddingVertical: 0 }}
          {...rest}
        />
      </View>
      {erro ? (
        <Text className="text-seal text-sm font-sans-semibold mt-1">{erro}</Text>
      ) : dica ? (
        <Text className="text-ink-4 text-sm font-display-italic mt-1">{dica}</Text>
      ) : null}
    </View>
  );
}
