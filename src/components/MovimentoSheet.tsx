import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Text from './Text';
import Button from './Button';
import Campo from './Campo';
import { colors } from '../theme/colors';
import { CanalVenda, LookResponse, MovimentoCreate } from '../types/api';
import { CANAIS, MOVIMENTOS, MOVIMENTOS_MANUAIS } from '../utils/estoque';
import { formatarMoeda, lerPreco, precoParaCampo } from '../utils/format';
import { mensagemDeErro, registrarMovimento } from '../lib/inventory';

type Tipo = MovimentoCreate['kind'];

interface Props {
  look: LookResponse | null;
  /** Tipo já escolhido ao abrir (ex.: atalho "Vendi fora do app"). */
  tipoInicial?: Tipo;
  onClose: () => void;
  onDone: (atualizado: LookResponse) => void;
}

/**
 * Folha de movimentação de estoque: escolhe o que aconteceu (vendeu fora do app,
 * chegou peça, reservou, contou...), a quantidade e, na venda, o preço e o canal.
 * Tudo vira uma linha no histórico (`POST /inventory/items/{id}/movements`).
 */
export default function MovimentoSheet({ look, tipoInicial, onClose, onDone }: Props): React.ReactElement {
  const [tipo, setTipo] = useState<Tipo>(tipoInicial ?? 'venda_externa');
  const [qtd, setQtd] = useState('1');
  const [preco, setPreco] = useState('');
  const [canal, setCanal] = useState<CanalVenda>('instagram');
  const [nota, setNota] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const estoque = look?.stock_quantity ?? 0;
  const reservado = look?.reserved_quantity ?? 0;
  const disponivel = Math.max(estoque - reservado, 0);

  useEffect(() => {
    if (!look) return;
    const t = tipoInicial ?? 'venda_externa';
    setTipo(t);
    setQtd(t === 'ajuste' ? String(look.stock_quantity) : '1');
    setPreco(precoParaCampo(look.price));
    setNota('');
    setErro(null);
  }, [look, tipoInicial]);

  const escolher = (t: Tipo) => {
    setTipo(t);
    setErro(null);
    setQtd(t === 'ajuste' ? String(estoque) : '1');
  };

  const n = Number(qtd || '0');
  const precoNum = preco.trim() === '' ? null : lerPreco(preco);

  const salvar = async () => {
    if (!look) return;
    if (tipo !== 'ajuste' && n < 1) return setErro('Informe pelo menos 1.');
    if (tipo === 'venda_externa' && preco.trim() !== '' && precoNum == null) return setErro('Preço inválido. Exemplo: 89,90');
    setSalvando(true);
    setErro(null);
    try {
      const dados: MovimentoCreate = { kind: tipo, quantity: n };
      if (tipo === 'venda_externa') {
        if (precoNum != null) dados.unit_price = precoNum;
        dados.channel = canal;
      }
      if (nota.trim()) dados.note = nota.trim();
      const { item } = await registrarMovimento(look.id, dados);
      onDone(item);
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível registrar agora. Tente de novo.'));
    } finally {
      setSalvando(false);
    }
  };

  const info = MOVIMENTOS[tipo];
  const limite =
    tipo === 'venda_externa' || tipo === 'perda' ? estoque
      : tipo === 'reserva' ? disponivel
        : tipo === 'liberacao' ? reservado
          : undefined;

  return (
    <Modal visible={!!look} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-background rounded-t-card border-t-2 border-ink max-h-[92%]">
            <View className="flex-row items-center px-5 pt-4 pb-2 gap-3">
              <View className="flex-1">
                <Text className="text-ink text-xl font-display-bold">Movimentar estoque</Text>
                <Text className="text-ink-4 text-sm font-display-italic" numberOfLines={1}>{look?.name}</Text>
              </View>
              <Button variant="icon" icon="close" accessibilityLabel="Fechar" onPress={onClose} />
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 16 }}>
              {/* Estado atual */}
              <View className="flex-row bg-ink rounded-card px-4 py-3">
                {[
                  { r: 'Em estoque', v: estoque },
                  { r: 'Reservadas', v: reservado },
                  { r: 'À venda no app', v: disponivel },
                ].map((x) => (
                  <View key={x.r} className="flex-1 items-center">
                    <Text className="text-signal text-2xl font-display-bold">{x.v}</Text>
                    <Text className="text-white text-xs font-sans-medium">{x.r}</Text>
                  </View>
                ))}
              </View>

              {/* O que aconteceu */}
              <View>
                <Text className="text-ink text-base font-display-bold mb-2">O que aconteceu?</Text>
                <View className="flex-row flex-wrap gap-2">
                  {MOVIMENTOS_MANUAIS.map((t) => {
                    const ativo = t === tipo;
                    return (
                      <TouchableOpacity
                        key={t}
                        onPress={() => escolher(t)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: ativo }}
                        className={`min-h-12 px-3 flex-row items-center gap-1.5 ${ativo ? 'bg-ink border-2 border-ink' : 'bg-surface border border-surface-5'}`}
                      >
                        <MaterialCommunityIcons name={MOVIMENTOS[t].icone} size={18} color={ativo ? colors.white : colors.ink[4]} />
                        <Text className={`text-sm ${ativo ? 'text-white font-sans-bold' : 'text-ink-3 font-sans-semibold'}`}>
                          {MOVIMENTOS[t].acao}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text className="text-ink-4 text-sm font-display-italic mt-2">{info.dica}</Text>
              </View>

              {/* Quantidade */}
              <View>
                <Text className="text-ink text-base font-display-bold mb-2">
                  {tipo === 'ajuste' ? 'Quantas peças existem agora?' : 'Quantas?'}
                </Text>
                <View className="flex-row items-center gap-4">
                  <TouchableOpacity
                    accessibilityLabel="Diminuir"
                    onPress={() => setQtd(String(Math.max(tipo === 'ajuste' ? 0 : 1, n - 1)))}
                    className="w-12 h-12 rounded-lg bg-ink items-center justify-center"
                  >
                    <Ionicons name="remove" size={22} color={colors.white} />
                  </TouchableOpacity>
                  <TextInput
                    className="text-ink text-3xl font-display-black text-center w-20"
                    keyboardType="number-pad"
                    value={qtd}
                    onChangeText={(v) => setQtd(v.replace(/\D/g, ''))}
                    accessibilityLabel="Quantidade"
                  />
                  <TouchableOpacity
                    accessibilityLabel="Aumentar"
                    onPress={() => setQtd(String(n + 1))}
                    className="w-12 h-12 rounded-lg bg-ink items-center justify-center"
                  >
                    <Ionicons name="add" size={22} color={colors.white} />
                  </TouchableOpacity>
                  {limite != null ? (
                    <Text className="text-ink-4 text-sm font-display-italic flex-1">máximo {limite}</Text>
                  ) : null}
                </View>
              </View>

              {tipo === 'venda_externa' ? (
                <>
                  <Campo
                    rotulo="Vendeu por (R$, cada)"
                    placeholder="0,00"
                    keyboardType="decimal-pad"
                    value={preco}
                    onChangeText={setPreco}
                    dica={look?.price != null ? `Preço da etiqueta: ${formatarMoeda(look.price, true)}` : 'Deixe vazio se não quiser registrar o valor.'}
                  />
                  <View>
                    <Text className="text-ink text-base font-display-bold mb-2">Onde vendeu?</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {CANAIS.map((c) => {
                        const ativo = c.id === canal;
                        return (
                          <TouchableOpacity
                            key={c.id}
                            onPress={() => setCanal(c.id)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: ativo }}
                            className={`min-h-12 px-3 justify-center ${ativo ? 'bg-ink border-2 border-ink' : 'bg-surface border border-surface-5'}`}
                          >
                            <Text className={`text-sm ${ativo ? 'text-white font-sans-bold' : 'text-ink-3 font-sans-semibold'}`}>{c.rotulo}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </>
              ) : null}

              <Campo
                rotulo="Observação"
                placeholder={tipo === 'reserva' ? 'Ex.: Joana, retira sábado' : 'Opcional'}
                value={nota}
                onChangeText={setNota}
                maxLength={280}
              />

              {erro ? <Text className="text-seal text-sm font-sans-semibold">{erro}</Text> : null}

              <Button variant="primary" label="Registrar" icon="checkmark" onPress={salvar} loading={salvando} />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
