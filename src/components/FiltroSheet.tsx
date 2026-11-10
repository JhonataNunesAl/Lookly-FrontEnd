import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from './Text';
import Button from './Button';
import Campo from './Campo';
import SeletorTamanhos from './SeletorTamanhos';
import { SectionHeader } from './PanelKit';
import { colors } from '../theme/colors';
import { FAIXAS_DE_PRECO, FILTROS_VAZIOS, FiltrosBusca, ORDENS, contarFiltros } from '../lib/filtros';
import { lerPreco, precoParaCampo } from '../utils/format';

interface FiltroSheetProps {
  visible: boolean;
  filtros: FiltrosBusca;
  onApply: (filtros: FiltrosBusca) => void;
  onClose: () => void;
}

/**
 * Ficha de filtros da busca: ordem, faixa de preço, tamanho e estoque, em seções
 * com título serifado e filete vermelho como o resto do catálogo. Trabalha num
 * rascunho — nada vale até "Aplicar"; "Limpar" zera o rascunho sem fechar.
 */
export default function FiltroSheet({ visible, filtros, onApply, onClose }: FiltroSheetProps): React.ReactElement {
  const [rascunho, setRascunho] = useState<FiltrosBusca>(filtros);
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  // Cada abertura parte do que está valendo.
  useEffect(() => {
    if (!visible) return;
    setRascunho(filtros);
    setMin(precoParaCampo(filtros.precoMin));
    setMax(precoParaCampo(filtros.precoMax));
    setErro(null);
  }, [visible, filtros]);

  const aplicarFaixa = (faixaMin: number | null, faixaMax: number | null) => {
    const jaEstaAplicada = lerPreco(min) === faixaMin && lerPreco(max) === faixaMax;
    setMin(jaEstaAplicada ? '' : precoParaCampo(faixaMin));
    setMax(jaEstaAplicada ? '' : precoParaCampo(faixaMax));
    setErro(null);
  };

  const limpar = () => {
    setRascunho(FILTROS_VAZIOS);
    setMin('');
    setMax('');
    setErro(null);
  };

  const aplicar = () => {
    const precoMin = min.trim() === '' ? null : lerPreco(min);
    const precoMax = max.trim() === '' ? null : lerPreco(max);
    if ((min.trim() !== '' && precoMin == null) || (max.trim() !== '' && precoMax == null)) {
      setErro('Preço inválido. Exemplo: 120,00');
      return;
    }
    if (precoMin != null && precoMax != null && precoMin > precoMax) {
      setErro('O preço mínimo não pode ser maior que o máximo.');
      return;
    }
    onApply({ ...rascunho, precoMin, precoMax });
  };

  const total = contarFiltros({ ...rascunho, precoMin: lerPreco(min), precoMax: lerPreco(max) });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        {/* toque fora fecha */}
        <TouchableOpacity activeOpacity={1} onPress={onClose} accessible={false} className="flex-1" />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView edges={['bottom']} className="bg-background border-t-2 border-ink" style={{ maxHeight: '88%' }}>
            {/* Cabeçalho da ficha */}
            <View className="flex-row items-center px-4 min-h-16">
              <View className="flex-1">
                <Text className="text-ink text-2xl font-display-bold">Filtrar peças</Text>
                <Text className="text-ink-3 text-base font-display-italic">
                  {total > 0 ? `${total} ${total === 1 ? 'filtro' : 'filtros'} marcado${total === 1 ? '' : 's'}` : 'Preço, tamanho e muito mais'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Fechar filtros"
                className="w-12 h-12 items-center justify-center"
              >
                <MaterialCommunityIcons name="close" size={26} color={colors.ink.DEFAULT} />
              </TouchableOpacity>
            </View>
            <View className="h-[5px] border-t-2 border-b border-ink" />

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {/* ── Ordem ── */}
              <View className="mt-4">
                <SectionHeader title="Ordenar por" />
                <View className="px-4">
                  {ORDENS.map((o) => {
                    const ativa = rascunho.ordem === o.id;
                    return (
                      <TouchableOpacity
                        key={o.id}
                        onPress={() => setRascunho((r) => ({ ...r, ordem: o.id }))}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: ativa }}
                        className="flex-row items-center min-h-14 gap-3 border-b border-dotted border-ink-5"
                      >
                        <MaterialCommunityIcons
                          name={ativa ? 'radiobox-marked' : 'radiobox-blank'}
                          size={24}
                          color={ativa ? colors.seal.DEFAULT : colors.ink[5]}
                        />
                        <View className="flex-1">
                          <Text className={`text-base ${ativa ? 'text-ink font-sans-bold' : 'text-ink-3 font-sans-medium'}`}>
                            {o.rotulo}
                          </Text>
                          <Text className="text-ink-4 text-sm font-display-italic">{o.dica}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* ── Preço ── */}
              <View className="mt-4">
                <SectionHeader title="Preço" />
                <View className="px-4 gap-3">
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Campo
                        rotulo="De (R$)"
                        placeholder="0,00"
                        keyboardType="decimal-pad"
                        value={min}
                        onChangeText={(v) => { setMin(v); setErro(null); }}
                      />
                    </View>
                    <View className="flex-1">
                      <Campo
                        rotulo="Até (R$)"
                        placeholder="sem limite"
                        keyboardType="decimal-pad"
                        value={max}
                        onChangeText={(v) => { setMax(v); setErro(null); }}
                      />
                    </View>
                  </View>
                  {erro ? <Text className="text-seal text-sm font-sans-semibold">{erro}</Text> : null}
                  <View className="flex-row flex-wrap gap-2">
                    {FAIXAS_DE_PRECO.map((f) => {
                      const ativa = lerPreco(min) === f.min && lerPreco(max) === f.max;
                      return (
                        <TouchableOpacity
                          key={f.rotulo}
                          onPress={() => aplicarFaixa(f.min, f.max)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: ativa }}
                          className={`min-h-12 px-3 justify-center ${
                            ativa ? 'bg-ink border-2 border-ink' : 'bg-surface border border-surface-5'
                          }`}
                        >
                          <Text className={`text-base ${ativa ? 'text-white font-sans-bold' : 'text-ink-3 font-display-italic'}`}>
                            {f.rotulo}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text className="text-ink-4 text-sm font-display-italic">
                    Peças sem preço informado ficam de fora quando há faixa de preço.
                  </Text>
                </View>
              </View>

              {/* ── Tamanho ── */}
              <View className="mt-4">
                <SectionHeader title="Tamanho" />
                <View className="px-4">
                  <SeletorTamanhos
                    selecionados={rascunho.tamanhos}
                    onChange={(tamanhos) => setRascunho((r) => ({ ...r, tamanhos }))}
                  />
                  <Text className="text-ink-4 text-sm font-display-italic mt-2">
                    Mostra a peça que tiver qualquer um dos tamanhos marcados. Peças sem tamanho informado não aparecem aqui.
                  </Text>
                </View>
              </View>

              {/* ── Disponibilidade ── */}
              <View className="mt-4">
                <SectionHeader title="Disponibilidade" />
                <View className="px-4">
                  <TouchableOpacity
                    onPress={() => setRascunho((r) => ({ ...r, soComEstoque: !r.soComEstoque }))}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: rascunho.soComEstoque }}
                    className="flex-row items-center min-h-14 gap-3"
                  >
                    <MaterialCommunityIcons
                      name={rascunho.soComEstoque ? 'checkbox-marked-outline' : 'checkbox-blank-outline'}
                      size={26}
                      color={rascunho.soComEstoque ? colors.seal.DEFAULT : colors.ink[5]}
                    />
                    <View className="flex-1">
                      <Text className={`text-base ${rascunho.soComEstoque ? 'text-ink font-sans-bold' : 'text-ink-3 font-sans-medium'}`}>
                        Só peças em estoque
                      </Text>
                      <Text className="text-ink-4 text-sm font-display-italic">Esconde o que está esgotado.</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Rodapé fixo */}
            <View className="flex-row gap-3 px-4 pt-3 pb-3 border-t border-ink">
              <View className="flex-1">
                <Button variant="secondary" label="Limpar" icon="refresh" onPress={limpar} />
              </View>
              <View className="flex-[1.6]">
                <Button variant="primary" label="Aplicar" icon="checkmark" onPress={aplicar} />
              </View>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
