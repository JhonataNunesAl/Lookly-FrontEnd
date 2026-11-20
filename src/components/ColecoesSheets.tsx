import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TextInput,
  useWindowDimensions,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from './Text';
import Button from './Button';
import { colors } from '../theme/colors';
import { ColecaoLoja, ItemEstoque } from '../types/api';
import {
  apagarColecao,
  criarColecao,
  definirColecoesDaPeca,
  mensagemDeErro,
  renomearColecao,
} from '../lib/inventory';
import { contar } from '../utils/format';

/** Moldura das fichas de coleção: fundo escuro, cabeçalho e filete do catálogo. */
function Ficha({
  visible, titulo, subtitulo, onClose, children, rodape,
}: {
  visible: boolean;
  titulo: string;
  subtitulo: string;
  onClose: () => void;
  children: React.ReactNode;
  rodape?: React.ReactNode;
}): React.ReactElement {
  // Altura máxima em pixels: porcentagem aqui não tem referência e encolhia a ficha.
  const { height } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <TouchableOpacity activeOpacity={1} onPress={onClose} accessible={false} className="flex-1" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView edges={['bottom']} className="bg-background border-t-2 border-ink" style={{ maxHeight: height * 0.88 }}>
            <View className="flex-row items-center px-4 min-h-16">
              <View className="flex-1">
                <Text className="text-ink text-2xl font-display-bold" numberOfLines={1}>{titulo}</Text>
                <Text className="text-ink-3 text-base font-display-italic" numberOfLines={2}>{subtitulo}</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                className="w-12 h-12 items-center justify-center"
              >
                <MaterialCommunityIcons name="close" size={26} color={colors.ink.DEFAULT} />
              </TouchableOpacity>
            </View>
            <View className="h-[5px] border-t-2 border-b border-ink" />
            <ScrollView keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }} contentContainerStyle={{ padding: 16, paddingBottom: 8 }}>
              {children}
            </ScrollView>
            {rodape ? <View className="px-4 pb-4 pt-2">{rodape}</View> : null}
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/** Linha "nome da coleção + botão" para criar uma coleção nova. */
function NovaColecao({ onCriada }: { onCriada: (c: ColecaoLoja) => void }): React.ReactElement {
  const [nome, setNome] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const criar = async () => {
    const limpo = nome.trim();
    if (!limpo || salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      const nova = await criarColecao(limpo);
      setNome('');
      onCriada(nova);
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível criar a coleção agora.'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <View className="mt-4">
      <Text className="text-ink text-base font-display-bold mb-1">Nova coleção</Text>
      <View className="flex-row items-center gap-2">
        <View className={`flex-1 bg-surface border border-b-2 border-b-ink px-3 min-h-12 justify-center ${erro ? 'border-seal' : 'border-surface-5'}`}>
          <TextInput
            value={nome}
            onChangeText={(t) => { setNome(t); setErro(null); }}
            onSubmitEditing={criar}
            placeholder="Ex.: Roupas sessão de carnaval"
            placeholderTextColor={colors.ink[5]}
            maxLength={60}
            returnKeyType="done"
            accessibilityLabel="Nome da nova coleção"
            className="text-ink text-base font-sans-medium"
            style={{ paddingVertical: 0 }}
          />
        </View>
        <TouchableOpacity
          onPress={criar}
          disabled={!nome.trim() || salvando}
          accessibilityRole="button"
          accessibilityLabel="Criar coleção"
          className={`min-h-12 px-4 flex-row items-center gap-1 ${nome.trim() ? 'bg-ink' : 'bg-surface-5'}`}
        >
          {salvando
            ? <ActivityIndicator color={colors.white} />
            : <MaterialCommunityIcons name="plus" size={20} color={colors.white} />}
          <Text className="text-white text-base font-sans-bold">Criar</Text>
        </TouchableOpacity>
      </View>
      {erro ? <Text className="text-seal text-sm font-sans-semibold mt-1">{erro}</Text> : null}
    </View>
  );
}

interface ColecoesSheetProps {
  visible: boolean;
  colecoes: ColecaoLoja[];
  carregando: boolean;
  selecionada: string | null;
  onEscolher: (id: string | null) => void;
  /** Algo mudou (criou, renomeou, apagou): recarregar coleções e lista. */
  onMudou: () => void;
  onClose: () => void;
}

/**
 * Coleções da loja: conjuntos com nome livre ("Sessão de carnaval", "Inverno
 * 2027") para organizar as peças. Tocar filtra o estoque; o lápis renomeia e a
 * lixeira apaga só a coleção (as peças continuam no estoque).
 */
export function ColecoesSheet({
  visible, colecoes, carregando, selecionada, onEscolher, onMudou, onClose,
}: ColecoesSheetProps): React.ReactElement {
  const [editando, setEditando] = useState<string | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setEditando(null);
      setErro(null);
    }
  }, [visible]);

  const salvarNome = async (c: ColecaoLoja) => {
    const limpo = nomeEdicao.trim();
    if (!limpo || limpo === c.name) {
      setEditando(null);
      return;
    }
    try {
      await renomearColecao(c.id, limpo);
      setEditando(null);
      setErro(null);
      onMudou();
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível renomear agora.'));
    }
  };

  const apagar = (c: ColecaoLoja) => {
    Alert.alert(
      'Apagar coleção',
      `A coleção “${c.name}” deixa de existir. As ${c.item_count} peças dela continuam no seu estoque.`,
      [
        { text: 'Manter', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              await apagarColecao(c.id);
              if (selecionada === c.id) onEscolher(null);
              onMudou();
            } catch (e) {
              setErro(mensagemDeErro(e, 'Não foi possível apagar agora.'));
            }
          },
        },
      ],
    );
  };

  const linha = (id: string | null, nome: string, n: number | null) => {
    const ativa = selecionada === id;
    return (
      <TouchableOpacity
        onPress={() => onEscolher(id)}
        accessibilityRole="radio"
        accessibilityState={{ selected: ativa }}
        className="flex-1 min-h-12 flex-row items-center gap-2 py-2"
      >
        <MaterialCommunityIcons
          name={ativa ? 'radiobox-marked' : 'radiobox-blank'}
          size={22}
          color={ativa ? colors.seal.DEFAULT : colors.ink[4]}
        />
        <Text className={`flex-1 text-base ${ativa ? 'text-seal font-sans-bold' : 'text-ink font-sans-medium'}`} numberOfLines={2}>
          {nome}
        </Text>
        {n != null ? <Text className="text-ink-4 text-sm font-sans-semibold">{contar(n, 'peça', 'peças')}</Text> : null}
      </TouchableOpacity>
    );
  };

  return (
    <Ficha
      visible={visible}
      titulo="Coleções"
      subtitulo="Conjuntos seus para organizar as peças, com o nome que quiser."
      onClose={onClose}
    >
      <View className="border-b border-dotted border-ink-5">{linha(null, 'Todas as peças', null)}</View>

      {carregando && colecoes.length === 0 ? (
        <ActivityIndicator color={colors.ink.DEFAULT} className="my-4" />
      ) : colecoes.length === 0 ? (
        <Text className="text-ink-4 text-base font-display-italic mt-3">
          Nenhuma coleção ainda. Crie uma abaixo e, no menu “…” de cada peça, escolha “Coleções” para colocá-la nela.
        </Text>
      ) : (
        colecoes.map((c) => (
          <View key={c.id} className="flex-row items-center border-b border-dotted border-ink-5">
            {editando === c.id ? (
              <View className="flex-1 flex-row items-center gap-2 py-2">
                <View className="flex-1 bg-surface border border-surface-5 border-b-2 border-b-ink px-3 min-h-12 justify-center">
                  <TextInput
                    value={nomeEdicao}
                    onChangeText={setNomeEdicao}
                    onSubmitEditing={() => salvarNome(c)}
                    autoFocus
                    maxLength={60}
                    accessibilityLabel={`Novo nome para ${c.name}`}
                    className="text-ink text-base font-sans-medium"
                    style={{ paddingVertical: 0 }}
                  />
                </View>
                <TouchableOpacity
                  onPress={() => salvarNome(c)}
                  accessibilityRole="button"
                  accessibilityLabel="Salvar nome"
                  className="w-12 h-12 items-center justify-center bg-ink"
                >
                  <MaterialCommunityIcons name="check" size={22} color={colors.white} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {linha(c.id, c.name, c.item_count)}
                <TouchableOpacity
                  onPress={() => { setEditando(c.id); setNomeEdicao(c.name); setErro(null); }}
                  accessibilityRole="button"
                  accessibilityLabel={`Renomear ${c.name}`}
                  className="w-11 h-12 items-center justify-center"
                >
                  <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.ink.DEFAULT} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => apagar(c)}
                  accessibilityRole="button"
                  accessibilityLabel={`Apagar ${c.name}`}
                  className="w-11 h-12 items-center justify-center"
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.danger} />
                </TouchableOpacity>
              </>
            )}
          </View>
        ))
      )}
      {erro ? <Text className="text-seal text-sm font-sans-semibold mt-2">{erro}</Text> : null}

      <NovaColecao onCriada={() => onMudou()} />
    </Ficha>
  );
}

interface ColecoesDaPecaSheetProps {
  peca: ItemEstoque | null;
  colecoes: ColecaoLoja[];
  onCriada: () => void;
  onClose: () => void;
  onSalvo: () => void;
}

/** Marca em quais coleções a peça está (pode estar em várias). */
export function ColecoesDaPecaSheet({
  peca, colecoes, onCriada, onClose, onSalvo,
}: ColecoesDaPecaSheetProps): React.ReactElement {
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!peca) return;
    setMarcadas(peca.collection_ids ?? []);
    setErro(null);
  }, [peca]);

  const alternar = (id: string) =>
    setMarcadas((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));

  const salvar = async () => {
    if (!peca) return;
    setSalvando(true);
    setErro(null);
    try {
      await definirColecoesDaPeca(peca.id, marcadas);
      onSalvo();
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível salvar agora.'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Ficha
      visible={!!peca}
      titulo="Coleções da peça"
      subtitulo={peca?.name ?? ''}
      onClose={onClose}
      rodape={<Button variant="primary" label="Salvar" icon="checkmark" loading={salvando} onPress={salvar} />}
    >
      {colecoes.length === 0 ? (
        <Text className="text-ink-4 text-base font-display-italic">
          Você ainda não tem coleções. Crie a primeira abaixo, por exemplo “Sessão de carnaval”.
        </Text>
      ) : (
        colecoes.map((c) => {
          const marcada = marcadas.includes(c.id);
          return (
            <TouchableOpacity
              key={c.id}
              onPress={() => alternar(c.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: marcada }}
              className="min-h-12 flex-row items-center gap-3 border-b border-dotted border-ink-5 py-2"
            >
              <MaterialCommunityIcons
                name={marcada ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={24}
                color={marcada ? colors.seal.DEFAULT : colors.ink[4]}
              />
              <Text className={`flex-1 text-base ${marcada ? 'text-ink font-sans-bold' : 'text-ink font-sans-medium'}`} numberOfLines={2}>
                {c.name}
              </Text>
              <Text className="text-ink-4 text-sm font-sans-semibold">{contar(c.item_count, 'peça', 'peças')}</Text>
            </TouchableOpacity>
          );
        })
      )}
      {erro ? <Text className="text-seal text-sm font-sans-semibold mt-2">{erro}</Text> : null}

      <NovaColecao
        onCriada={(nova) => {
          setMarcadas((atual) => [...atual, nova.id]);
          onCriada();
        }}
      />
    </Ficha>
  );
}
