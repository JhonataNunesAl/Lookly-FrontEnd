import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import Text from './Text';
import { GRUPOS_DE_TAMANHO } from '../utils/tamanhos';

interface SeletorTamanhosProps {
  selecionados: string[];
  onChange: (tamanhos: string[]) => void;
}

/**
 * Escolha de tamanhos (vários), em grupos: letras, numeração, único. Usado no
 * formulário da peça (o que a loja tem) e na ficha de filtros (o que a pessoa
 * procura) — o mesmo conjunto fechado do backend, ver `utils/tamanhos.ts`.
 * Seleção é de tinta, como todo chip do app; 48dp de alvo.
 */
export default function SeletorTamanhos({ selecionados, onChange }: SeletorTamanhosProps): React.ReactElement {
  const alternar = (t: string) =>
    onChange(selecionados.includes(t) ? selecionados.filter((x) => x !== t) : [...selecionados, t]);

  return (
    <View className="gap-4">
      {GRUPOS_DE_TAMANHO.map((grupo) => (
        <View key={grupo.titulo}>
          <Text className="text-ink-3 text-sm font-display-italic mb-1.5">{grupo.titulo}</Text>
          <View className="flex-row flex-wrap gap-2">
            {grupo.itens.map((t) => {
              const ativo = selecionados.includes(t);
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => alternar(t)}
                  accessibilityRole="button"
                  accessibilityLabel={`Tamanho ${t}`}
                  accessibilityState={{ selected: ativo }}
                  className={`min-w-12 min-h-12 px-3 items-center justify-center ${
                    ativo ? 'bg-ink border-2 border-ink' : 'bg-surface border border-surface-5'
                  }`}
                >
                  <Text className={`text-base font-mono-bold ${ativo ? 'text-white' : 'text-ink-3'}`}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
