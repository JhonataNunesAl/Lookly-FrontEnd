import React, { useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StatusBar, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Text from '../components/Text';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import { StatBoard } from '../components/PanelKit';
import TutorialImportacao from '../components/TutorialImportacao';
import { colors } from '../theme/colors';
import { contar } from '../utils/format';
import {
  ArquivoEscolhido,
  PreviaImportacao,
  ResultadoLote,
  baixarModelo,
  chaveDeArquivo,
  enviarImagem,
  escolherImagens,
  escolherPlanilha,
  exportarCatalogo,
  gerarPrevia,
  gravarEmLotes,
  mensagemDeErro,
  montarItens,
} from '../lib/importacao';

type Etapa = 'inicio' | 'previa' | 'gravando' | 'fim';
type Situacao = 'active' | 'draft';

/** Quantas linhas com erro/peças mostrar na tela (o resto fica no resumo). */
const MAX_LISTA = 60;

/**
 * Importar peças em massa por planilha: modelo → prévia com erros por linha →
 * fotos por nome de arquivo → gravação em lotes. Também é daqui que se exporta o
 * catálogo para editar preço/estoque no Excel e importar de volta.
 */
export default function ImportProductsScreen(): React.ReactElement {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [etapa, setEtapa] = useState<Etapa>('inicio');
  const [lendo, setLendo] = useState(false);
  const [arquivo, setArquivo] = useState<ArquivoEscolhido | null>(null);
  const [previa, setPrevia] = useState<PreviaImportacao | null>(null);
  const [situacao, setSituacao] = useState<Situacao>('active');
  const [imagens, setImagens] = useState<Record<string, ArquivoEscolhido>>({});
  const [progresso, setProgresso] = useState('');
  const [resultado, setResultado] = useState<ResultadoLote | null>(null);
  const [falhasDeFoto, setFalhasDeFoto] = useState<string[]>([]);
  const [semFoto, setSemFoto] = useState<{ linha: number; arquivos: string[] }[]>([]);
  const [exportando, setExportando] = useState(false);
  const [tutorial, setTutorial] = useState(false);

  const fotosCitadas = previa?.arquivos_de_foto ?? [];
  const fotosEncontradas = fotosCitadas.filter((n) => imagens[chaveDeArquivo(n)]);
  const fotosFaltando = fotosCitadas.filter((n) => !imagens[chaveDeArquivo(n)]);
  const linhasComErro = useMemo(() => previa?.linhas.filter((l) => l.erros.length) ?? [], [previa]);
  const linhasValidas = useMemo(() => previa?.linhas.filter((l) => !l.erros.length) ?? [], [previa]);

  const baixar = async (formato: 'xlsx' | 'csv') => {
    try {
      await baixarModelo(formato);
    } catch (e) {
      Alert.alert('Não foi possível baixar', mensagemDeErro(e, 'Tente de novo em instantes.'));
    }
  };

  const exportar = async () => {
    setExportando(true);
    try {
      const ok = await exportarCatalogo('xlsx');
      if (!ok) {
        Alert.alert(
          'Exportar pelo site',
          'Por enquanto a exportação do catálogo é feita pelo site do Lookly, entrando com a mesma conta.',
        );
      }
    } catch (e) {
      Alert.alert('Não foi possível exportar', mensagemDeErro(e, 'Tente de novo em instantes.'));
    } finally {
      setExportando(false);
    }
  };

  const escolherArquivo = async () => {
    let escolhido: ArquivoEscolhido | null = null;
    try {
      escolhido = await escolherPlanilha();
    } catch {
      Alert.alert('Arquivos', 'Não foi possível abrir o seletor de arquivos.');
      return;
    }
    if (!escolhido) return;
    setLendo(true);
    try {
      const p = await gerarPrevia(escolhido);
      setArquivo(escolhido);
      setPrevia(p);
      setImagens({});
      setEtapa('previa');
    } catch (e) {
      Alert.alert('Não foi possível ler a planilha', mensagemDeErro(e, 'Confira o arquivo e tente de novo.'));
    } finally {
      setLendo(false);
    }
  };

  const adicionarImagens = async () => {
    try {
      const escolhidas = await escolherImagens();
      if (!escolhidas.length) return;
      setImagens((atual) => {
        const novo = { ...atual };
        for (const img of escolhidas) novo[chaveDeArquivo(img.nome)] = img;
        return novo;
      });
    } catch {
      Alert.alert('Arquivos', 'Não foi possível abrir o seletor de imagens.');
    }
  };

  const importar = async () => {
    if (!previa) return;
    setEtapa('gravando');
    setFalhasDeFoto([]);
    try {
      // 1. Envia só as fotos usadas por linhas válidas
      const usadas = Array.from(
        new Set(linhasValidas.flatMap((l) => l.fotos_pendentes.map(chaveDeArquivo))),
      ).filter((k) => imagens[k]);
      const links: Record<string, string> = {};
      const falhas: string[] = [];
      for (let i = 0; i < usadas.length; i++) {
        setProgresso(`Enviando fotos: ${i + 1} de ${usadas.length}`);
        const img = imagens[usadas[i]];
        try {
          links[usadas[i]] = await enviarImagem(img);
        } catch (e) {
          falhas.push(`${img.nome}: ${mensagemDeErro(e, 'não foi possível enviar')}`);
        }
      }
      setFalhasDeFoto(falhas);

      // 2. Grava em lotes
      const { itens, semFoto: faltou } = montarItens(previa.linhas, links);
      setSemFoto(faltou);
      setProgresso(`Gravando peças: 0 de ${itens.length}`);
      const r = itens.length
        ? await gravarEmLotes(itens, situacao, (feitos, total) => setProgresso(`Gravando peças: ${feitos} de ${total}`))
        : { criados: 0, atualizados: 0, ids: [], erros: [] };
      setResultado(r);
      setEtapa('fim');
    } catch (e) {
      Alert.alert(
        'A importação parou no meio',
        `${mensagemDeErro(e, 'Verifique a conexão.')}\n\nO que já foi gravado continua no catálogo. ` +
          'Importe a mesma planilha de novo: as peças com código são atualizadas, não duplicadas.',
      );
      setEtapa('previa');
    }
  };

  const recomecar = () => {
    setEtapa('inicio');
    setPrevia(null);
    setArquivo(null);
    setResultado(null);
    setImagens({});
    setSemFoto([]);
    setFalhasDeFoto([]);
  };

  const prontos = linhasValidas.filter(
    (l) => l.fotos_pendentes.every((n) => imagens[chaveDeArquivo(n)]),
  ).length;

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScreenHeader
        title="Importar planilha"
        subtitle="Cadastre ou atualize muitas peças de uma vez"
        onBack={etapa === 'gravando' ? undefined : () => navigation.goBack()}
        right={
          etapa === 'gravando' ? undefined : (
            <Button variant="icon" icon="help-circle-outline" accessibilityLabel="Como funciona a importação" onPress={() => setTutorial(true)} />
          )
        }
      />
      <TutorialImportacao visivel={tutorial} aoFechar={() => setTutorial(false)} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 16 }} showsVerticalScrollIndicator={false}>
        {etapa === 'inicio' && (
          <>
            <TouchableOpacity
              onPress={() => setTutorial(true)}
              accessibilityRole="button"
              className="flex-row items-center gap-2 min-h-12"
            >
              <MaterialCommunityIcons name="help-circle-outline" size={22} color={colors.ink.DEFAULT} />
              <Text className="text-ink text-base font-sans-bold underline">Primeira vez? Veja como funciona</Text>
            </TouchableOpacity>
            <Passo numero="1" titulo="Baixe o modelo">
              <Text className="text-ink-3 text-base">
                Uma peça por linha: nome, categoria, preço, estoque, tamanhos e fotos. A planilha já vem com
                instruções e a lista de categorias.
              </Text>
              <View className="flex-row gap-3 mt-3">
                <View className="flex-1">
                  <Button variant="primary" label="Excel (.xlsx)" icon="download-outline" onPress={() => baixar('xlsx')} />
                </View>
                <View className="flex-1">
                  <Button variant="secondary" label="CSV" icon="download-outline" onPress={() => baixar('csv')} />
                </View>
              </View>
            </Passo>

            <Passo numero="2" titulo="Preencha">
              <Text className="text-ink-3 text-base">
                Fotos: cole links https:// ou escreva o nome do arquivo da imagem (ex.: vestido1.jpg), separados
                por | . Até 6 por peça, e a primeira é a capa.
              </Text>
              <Text className="text-ink-3 text-base mt-2">
                Dê um código a cada peça: importando de novo com o mesmo código, ela é atualizada em vez de
                duplicada.
              </Text>
            </Passo>

            <Passo numero="3" titulo="Envie a planilha">
              <Text className="text-ink-3 text-base mb-3">
                Até 5.000 peças por arquivo (.xlsx ou .csv). Antes de gravar, você vê a prévia e os erros de cada
                linha.
              </Text>
              <Button variant="primary" label="Escolher planilha" icon="cloud-upload-outline" onPress={escolherArquivo} loading={lendo} />
            </Passo>

            <View className="bg-surface rounded-card border border-surface-5 p-4">
              <View className="flex-row items-center gap-2 mb-1">
                <MaterialCommunityIcons name="table-edit" size={22} color={colors.ink.DEFAULT} />
                <Text className="text-ink text-lg font-display-bold">Atualizar preço e estoque em massa</Text>
              </View>
              <Text className="text-ink-3 text-base mb-3">
                Exporte o catálogo, altere o que quiser no Excel (preço, estoque, tamanhos...) e importe o mesmo
                arquivo aqui. Só as colunas preenchidas mudam.
              </Text>
              <Button variant="secondary" label="Exportar catálogo (.xlsx)" icon="share-outline" onPress={exportar} loading={exportando} />
              {Platform.OS !== 'web' ? (
                <Text className="text-ink-4 text-sm font-display-italic mt-2">No app, a exportação abre pelo site.</Text>
              ) : null}
            </View>
          </>
        )}

        {etapa === 'previa' && previa && (
          <>
            <View className="bg-surface rounded-card border border-surface-5 p-4">
              <Text className="text-ink-4 text-sm font-mono" numberOfLines={1}>{arquivo?.nome}</Text>
              <Text className="text-ink text-2xl font-display-bold mt-1">
                {contar(previa.total_linhas, 'linha lida', 'linhas lidas')}
              </Text>
              <View className="mt-3">
                <StatBoard
                  tone="surface"
                  items={[
                    { label: 'Peças novas', value: previa.a_criar },
                    { label: 'Peças a atualizar', value: previa.a_atualizar },
                    { label: 'Linhas com erro (ficam de fora)', value: previa.com_erro },
                  ]}
                />
              </View>
              {previa.colunas_ignoradas.length ? (
                <Text className="text-ink-4 text-sm mt-2">
                  Colunas ignoradas: {previa.colunas_ignoradas.join(', ')}
                </Text>
              ) : null}
            </View>

            {fotosCitadas.length > 0 && (
              <View className="bg-surface rounded-card border border-surface-5 p-4">
                <View className="flex-row items-center gap-2 mb-1">
                  <MaterialCommunityIcons name="image-multiple-outline" size={22} color={colors.ink.DEFAULT} />
                  <Text className="text-ink text-lg font-display-bold">Fotos por nome de arquivo</Text>
                </View>
                <Text className="text-ink-3 text-base">
                  A planilha cita {contar(fotosCitadas.length, 'imagem', 'imagens')} pelo nome. Selecione os arquivos
                  (pode escolher vários de uma vez, e quantas vezes precisar).
                </Text>
                <View className="flex-row items-center gap-1.5 mt-2">
                  <MaterialCommunityIcons
                    name={fotosFaltando.length ? 'progress-alert' : 'check-circle-outline'}
                    size={18}
                    color={fotosFaltando.length ? colors.warning : colors.success}
                  />
                  <Text className={`text-sm font-sans-semibold ${fotosFaltando.length ? 'text-warning' : 'text-success'}`}>
                    {fotosEncontradas.length} de {fotosCitadas.length} encontradas
                  </Text>
                </View>
                {fotosFaltando.length > 0 && (
                  <Text className="text-ink-4 text-sm mt-1" numberOfLines={4}>
                    Faltam: {fotosFaltando.slice(0, 30).join(', ')}
                    {fotosFaltando.length > 30 ? ` e mais ${fotosFaltando.length - 30}` : ''}
                  </Text>
                )}
                <View className="mt-3">
                  <Button variant="secondary" label="Selecionar imagens" icon="images-outline" onPress={adicionarImagens} />
                </View>
              </View>
            )}

            {/* Situação das peças novas */}
            {previa.a_criar > 0 && (
              <View className="bg-surface rounded-card border border-surface-5 p-4">
                <Text className="text-ink text-lg font-display-bold mb-2">Peças novas entram como</Text>
                {([
                  ['active', 'Publicadas', 'Aparecem no feed e na loja assim que gravadas.'],
                  ['draft', 'Rascunho', 'Ficam só no seu catálogo até você publicar.'],
                ] as const).map(([valor, rotulo, dica]) => {
                  const ativo = situacao === valor;
                  return (
                    <TouchableOpacity
                      key={valor}
                      onPress={() => setSituacao(valor)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: ativo }}
                      className="flex-row items-center gap-3 min-h-14"
                    >
                      <MaterialCommunityIcons
                        name={ativo ? 'radiobox-marked' : 'radiobox-blank'}
                        size={24}
                        color={ativo ? colors.ink.DEFAULT : colors.ink[5]}
                      />
                      <View className="flex-1">
                        <Text className="text-ink text-base font-sans-bold">{rotulo}</Text>
                        <Text className="text-ink-4 text-sm">{dica}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {linhasComErro.length > 0 && (
              <View className="bg-surface rounded-card border border-seal p-4">
                <View className="flex-row items-center gap-2 mb-2">
                  <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.danger} />
                  <Text className="text-danger text-lg font-display-bold">
                    {contar(linhasComErro.length, 'linha com erro', 'linhas com erro')}
                  </Text>
                </View>
                <Text className="text-ink-4 text-sm mb-2">
                  Essas linhas ficam de fora. Corrija na planilha e envie de novo quando quiser.
                </Text>
                {linhasComErro.slice(0, MAX_LISTA).map((l) => (
                  <View key={l.linha} className="border-t border-dotted border-ink-5 py-2">
                    <Text className="text-ink text-sm font-sans-bold">
                      Linha {l.linha}
                      {typeof l.dados.name === 'string' ? ` · ${l.dados.name}` : ''}
                    </Text>
                    {l.erros.map((e, i) => (
                      <Text key={i} className="text-ink-3 text-sm">• {e}</Text>
                    ))}
                  </View>
                ))}
                {linhasComErro.length > MAX_LISTA ? (
                  <Text className="text-ink-4 text-sm mt-1">e mais {linhasComErro.length - MAX_LISTA} linhas.</Text>
                ) : null}
              </View>
            )}

            {linhasValidas.length > 0 && (
              <View className="bg-surface rounded-card border border-surface-5 p-4">
                <Text className="text-ink text-lg font-display-bold mb-1">Prontas para gravar</Text>
                {linhasValidas.slice(0, 20).map((l) => (
                  <View key={l.linha} className="flex-row items-center gap-2 py-1">
                    <MaterialCommunityIcons
                      name={l.acao === 'criar' ? 'plus-box-outline' : 'pencil-box-outline'}
                      size={18}
                      color={colors.ink[4]}
                    />
                    <Text className="text-ink-3 text-sm flex-1" numberOfLines={1}>
                      {l.acao === 'criar' ? 'Nova' : 'Atualiza'} · {String(l.dados.name ?? l.dados.sku ?? `linha ${l.linha}`)}
                    </Text>
                  </View>
                ))}
                {linhasValidas.length > 20 ? (
                  <Text className="text-ink-4 text-sm mt-1">e mais {linhasValidas.length - 20}.</Text>
                ) : null}
              </View>
            )}

            <View className="gap-y-2">
              <Button
                variant="primary"
                label={prontos > 0 ? `Importar ${contar(prontos, 'peça', 'peças')}` : 'Nada para importar'}
                icon="cloud-upload-outline"
                onPress={importar}
                disabled={prontos === 0}
              />
              {prontos < linhasValidas.length ? (
                <Text className="text-warning text-sm font-sans-semibold text-center">
                  {contar(linhasValidas.length - prontos, 'peça fica', 'peças ficam')} de fora por falta de foto.
                </Text>
              ) : null}
              <Button variant="secondary" label="Escolher outra planilha" onPress={escolherArquivo} loading={lendo} />
            </View>
          </>
        )}

        {etapa === 'gravando' && (
          <View className="bg-surface rounded-card border border-surface-5 p-6 items-center">
            <MaterialCommunityIcons name="progress-upload" size={48} color={colors.ink.DEFAULT} />
            <Text className="text-ink text-xl font-display-bold mt-3 text-center">{progresso || 'Preparando…'}</Text>
            <Text className="text-ink-4 text-base font-display-italic mt-1 text-center">
              Não feche esta tela até terminar.
            </Text>
          </View>
        )}

        {etapa === 'fim' && resultado && (
          <>
            <View className="bg-surface rounded-card border border-surface-5 p-4">
              <View className="flex-row items-center gap-2 mb-2">
                <MaterialCommunityIcons name="check-decagram-outline" size={26} color={colors.success} />
                <Text className="text-ink text-2xl font-display-bold">Importação concluída</Text>
              </View>
              <StatBoard
                tone="surface"
                items={[
                  { label: 'Peças criadas', value: resultado.criados },
                  { label: 'Peças atualizadas', value: resultado.atualizados },
                  { label: 'Não gravadas', value: resultado.erros.length + semFoto.length },
                ]}
              />
              {situacao === 'draft' && resultado.criados > 0 ? (
                <Text className="text-ink-4 text-sm mt-2">As peças novas estão como rascunho no seu catálogo.</Text>
              ) : null}
            </View>

            {(resultado.erros.length > 0 || semFoto.length > 0 || falhasDeFoto.length > 0) && (
              <View className="bg-surface rounded-card border border-seal p-4">
                <Text className="text-danger text-lg font-display-bold mb-2">O que ficou de fora</Text>
                {semFoto.slice(0, MAX_LISTA).map((s) => (
                  <Text key={`f${s.linha}`} className="text-ink-3 text-sm py-0.5">
                    • Linha {s.linha}: foto não enviada ({s.arquivos.join(', ')})
                  </Text>
                ))}
                {resultado.erros.slice(0, MAX_LISTA).map((e) => (
                  <Text key={`e${e.indice}`} className="text-ink-3 text-sm py-0.5">
                    • {e.linha ? `Linha ${e.linha}` : `Item ${e.indice + 1}`}: {e.mensagem}
                  </Text>
                ))}
                {falhasDeFoto.slice(0, 20).map((f, i) => (
                  <Text key={`p${i}`} className="text-ink-3 text-sm py-0.5">• Foto {f}</Text>
                ))}
              </View>
            )}

            <View className="gap-y-2">
              <Button variant="primary" label="Ver catálogo" icon="arrow-forward" onPress={() => navigation.goBack()} />
              <Button variant="secondary" label="Importar outra planilha" onPress={recomecar} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Passo({ numero, titulo, children }: { numero: string; titulo: string; children: React.ReactNode }) {
  return (
    <View className="bg-surface rounded-card border border-surface-5 p-4">
      <View className="flex-row items-center gap-3 mb-2">
        <View className="w-9 h-9 rounded-lg bg-ink items-center justify-center">
          <Text className="text-signal text-lg font-display-bold">{numero}</Text>
        </View>
        <Text className="text-ink text-xl font-display-bold">{titulo}</Text>
      </View>
      {children}
    </View>
  );
}
