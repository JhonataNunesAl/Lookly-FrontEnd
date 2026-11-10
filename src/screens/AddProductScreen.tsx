import React, { useEffect, useState } from 'react';
import {
  Alert,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Text from '../components/Text';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { fetchCategories } from '../lib/categories';
import { createLook, updateLook } from '../lib/sellers';
import { enviarFotos, erroDeUpload, escolherFotos, FotoEscolhida } from '../lib/media';
import { precoParaCampo, lerPreco } from '../utils/format';
import { CategoryResponse, LookCreate } from '../types/api';
import { RootStackParamList } from '../types';
import Button from '../components/Button';
import Campo from '../components/Campo';
import PecaFoto from '../components/PecaFoto';
import SeletorTamanhos from '../components/SeletorTamanhos';
import ScreenHeader from '../components/ScreenHeader';

const MAX_FOTOS = 6;

/** Uma foto do formulário: já publicada (URL) ou recém-escolhida (ainda local). */
type Slot = { chave: string; url?: string; local?: FotoEscolhida };

/**
 * Publicar ou editar uma peça da loja (`POST /looks` / `PUT /looks/{id}`).
 * As fotos novas sobem antes, por `POST /uploads/image`; só então a peça é gravada
 * com as URLs. O que o backend não guarda (tags de estilo, tamanhos) não existe
 * aqui — um campo que não vai para lugar nenhum engana quem o preenche.
 */
export default function AddProductScreen(): React.ReactElement {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'AddProduct'>>();
  const edicao = params?.look ?? null;

  const [fotos, setFotos] = useState<Slot[]>(
    () => (edicao?.photos ?? []).map((url, i) => ({ chave: `r${i}`, url })),
  );
  const [nome, setNome] = useState(edicao?.name ?? '');
  const [preco, setPreco] = useState(edicao ? precoParaCampo(edicao.price) : '');
  const [estoque, setEstoque] = useState(edicao ? String(edicao.stock_quantity) : '');
  const [descricao, setDescricao] = useState(edicao?.description ?? '');
  const [link, setLink] = useState(edicao?.buy_link ?? '');
  const [tamanhos, setTamanhos] = useState<string[]>(edicao?.sizes ?? []);
  const [categorias, setCategorias] = useState<CategoryResponse[]>([]);
  const [categoriaId, setCategoriaId] = useState<string | null>(edicao?.category_id ?? null);
  const [enviando, setEnviando] = useState(false);
  const [tentou, setTentou] = useState(false);

  useEffect(() => {
    fetchCategories().then(setCategorias).catch(() => {});
  }, []);

  // ── Validação (espelha as regras de schemas/look.py) ──────────────────────
  const precoNumero = preco.trim() === '' ? undefined : lerPreco(preco);
  const erros = {
    fotos: fotos.length === 0 ? 'Adicione pelo menos uma foto.' : null,
    nome: nome.trim().length < 2 ? 'O nome precisa de pelo menos 2 letras.' : null,
    preco: preco.trim() !== '' && precoNumero == null ? 'Preço inválido. Exemplo: 289,90' : null,
    categoria: categoriaId == null ? 'Escolha uma categoria.' : null,
    link: link.trim() !== '' && !/^https?:\/\/\S+\.\S+/.test(link.trim()) ? 'Use um endereço completo, começando com https://' : null,
  };
  const temErro = Object.values(erros).some(Boolean);

  const adicionarFotos = async () => {
    const restantes = MAX_FOTOS - fotos.length;
    if (restantes <= 0) return;
    try {
      const escolhidas = await escolherFotos({ max: restantes });
      setFotos((atual) => [
        ...atual,
        ...escolhidas.slice(0, restantes).map((f, i) => ({ chave: `n${Date.now()}${i}`, local: f })),
      ]);
    } catch {
      Alert.alert('Galeria', 'Não foi possível abrir a galeria.');
    }
  };

  const removerFoto = (chave: string) => setFotos((atual) => atual.filter((f) => f.chave !== chave));

  /** Move a foto para o início: a primeira é a capa que aparece no feed. */
  const definirCapa = (chave: string) =>
    setFotos((atual) => {
      const alvo = atual.find((f) => f.chave === chave);
      return alvo ? [alvo, ...atual.filter((f) => f.chave !== chave)] : atual;
    });

  const salvar = async () => {
    setTentou(true);
    if (temErro || enviando) return;
    setEnviando(true);
    try {
      // Sobe só as fotos novas; mantém a ordem (a primeira é a capa).
      const novas = fotos.filter((f) => f.local).map((f) => f.local as FotoEscolhida);
      const urlsNovas = await enviarFotos(novas);
      let i = 0;
      const photos = fotos.map((f) => f.url ?? urlsNovas[i++]);

      const dados: LookCreate = {
        category_id: categoriaId as string,
        name: nome.trim(),
        photos,
        description: descricao.trim() || undefined,
        price: precoNumero ?? undefined,
        buy_link: link.trim() || undefined,
        stock_quantity: Number(estoque || '0'),
        sizes: tamanhos,
      };

      if (edicao) await updateLook(edicao.id, dados);
      else await createLook(dados);

      navigation.goBack();
    } catch (e: any) {
      const detalhe = e?.response?.data?.detail;
      const ehUpload = String(e?.config?.url ?? '').includes('/uploads/');
      Alert.alert(
        edicao ? 'Não foi possível salvar' : 'Não foi possível publicar',
        ehUpload
          ? erroDeUpload(e)
          : Array.isArray(detalhe)
            ? detalhe[0]?.msg ?? 'Confira os dados e tente de novo.'
            : typeof detalhe === 'string'
              ? detalhe
              : 'Verifique a conexão e tente de novo.',
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScreenHeader
        title={edicao ? 'Editar peça' : 'Nova peça'}
        subtitle={edicao ? 'Alterações valem para o feed na hora' : 'Entra no catálogo assim que for publicada'}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 20 }}
        >
          {/* Fotos: a primeira é a capa */}
          <View>
            <Text className="text-ink text-base font-display-bold">Fotos da peça</Text>
            <Text className="text-ink-4 text-sm font-display-italic mb-3">
              De 1 a {MAX_FOTOS}. A primeira é a capa que aparece no feed.
            </Text>

            <View className="flex-row flex-wrap gap-3">
              {fotos.map((f, i) => (
                <View key={f.chave} className="w-[30%]">
                  <View className="p-1 border border-ink bg-surface">
                    <PecaFoto uri={f.url ?? f.local?.uri} compact className="w-full aspect-[3/4]" />
                  </View>
                  {i === 0 ? (
                    <View className="absolute top-2 left-2 bg-seal px-2 py-0.5">
                      <Text className="text-white text-xs font-sans-bold">Capa</Text>
                    </View>
                  ) : null}
                  <View className="flex-row justify-between mt-1">
                    {i > 0 ? (
                      <TouchableOpacity
                        onPress={() => definirCapa(f.chave)}
                        accessibilityRole="button"
                        accessibilityLabel="Usar como capa"
                        className="min-h-12 px-1 justify-center"
                      >
                        <Text className="text-ink-3 text-sm font-sans-bold underline">Capa</Text>
                      </TouchableOpacity>
                    ) : (
                      <View />
                    )}
                    <TouchableOpacity
                      onPress={() => removerFoto(f.chave)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remover foto ${i + 1}`}
                      className="min-h-12 px-1 justify-center"
                    >
                      <Text className="text-seal text-sm font-sans-bold underline">Remover</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {fotos.length < MAX_FOTOS && (
                <View className="w-[30%]">
                  <TouchableOpacity
                    onPress={adicionarFotos}
                    accessibilityRole="button"
                    accessibilityLabel="Adicionar fotos"
                    activeOpacity={0.8}
                    className="aspect-[3/4] border-2 border-dashed border-ink-5 bg-surface-2 items-center justify-center"
                  >
                    <MaterialCommunityIcons name="image-plus-outline" size={34} color={colors.ink[4]} />
                    <Text className="text-ink-3 text-sm font-sans-bold mt-1">Adicionar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            {tentou && erros.fotos ? (
              <Text className="text-seal text-sm font-sans-semibold mt-1">{erros.fotos}</Text>
            ) : null}
          </View>

          <Campo
            rotulo="Nome da peça"
            placeholder="Ex.: Jaqueta bomber oversized"
            value={nome}
            onChangeText={setNome}
            erro={tentou ? erros.nome : null}
            maxLength={120}
          />

          <View className="flex-row gap-4">
            <View className="flex-1">
              <Campo
                rotulo="Preço (R$)"
                placeholder="0,00"
                keyboardType="decimal-pad"
                value={preco}
                onChangeText={setPreco}
                erro={tentou ? erros.preco : null}
                dica="Opcional"
              />
            </View>
            <View className="flex-1">
              <Campo
                rotulo="Estoque"
                placeholder="0"
                keyboardType="number-pad"
                value={estoque}
                onChangeText={(v) => setEstoque(v.replace(/\D/g, ''))}
                dica="Unidades"
              />
            </View>
          </View>

          {/* Categoria (GET /api/categories) — obrigatória */}
          <View>
            <Text className="text-ink text-base font-display-bold mb-2">Categoria</Text>
            <View className="flex-row flex-wrap gap-2">
              {categorias.map((cat) => {
                const ativa = categoriaId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setCategoriaId(cat.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: ativa }}
                    className={`min-h-12 px-4 flex-row items-center justify-center gap-1.5 ${
                      ativa ? 'bg-ink border-2 border-ink' : 'bg-surface border border-surface-5'
                    }`}
                  >
                    {ativa && <MaterialCommunityIcons name="check" size={18} color={colors.white} />}
                    <Text className={`text-base ${ativa ? 'text-white font-sans-bold' : 'text-ink-3 font-display-italic'}`}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {tentou && erros.categoria ? (
              <Text className="text-seal text-sm font-sans-semibold mt-1">{erros.categoria}</Text>
            ) : null}
          </View>

          {/* Tamanhos — alimentam o filtro de tamanho da busca */}
          <View>
            <Text className="text-ink text-base font-display-bold">Tamanhos disponíveis</Text>
            <Text className="text-ink-4 text-sm font-display-italic mb-2">
              Opcional, mas sem isso a peça não aparece quando alguém filtra por tamanho.
            </Text>
            <SeletorTamanhos selecionados={tamanhos} onChange={setTamanhos} />
          </View>

          <Campo
            rotulo="Descrição"
            placeholder="Tecido, caimento, detalhes…"
            value={descricao}
            onChangeText={setDescricao}
            multilinha
            dica="Opcional"
          />

          <Campo
            rotulo="Link de compra"
            placeholder="https://sualoja.com.br/peca"
            keyboardType="url"
            autoCapitalize="none"
            value={link}
            onChangeText={setLink}
            erro={tentou ? erros.link : null}
            dica="Opcional. Aparece como “Comprar na loja” no detalhe da peça."
          />

          <View className="mt-2">
            <Button
              variant="primary"
              label={edicao ? 'Salvar alterações' : 'Publicar peça'}
              icon="arrow-forward"
              onPress={salvar}
              loading={enviando}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
