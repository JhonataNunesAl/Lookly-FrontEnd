import React, { useState } from 'react';
import { Modal, ScrollView, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from './Text';
import Button from './Button';
import { colors } from '../theme/colors';

type Glifo = keyof typeof MaterialCommunityIcons.glyphMap;

interface Pagina {
  icone: Glifo;
  titulo: string;
  texto: string[];
  /** Mini planilha de exemplo (cabeçalho + linhas). */
  tabela?: string[][];
}

const PAGINAS: Pagina[] = [
  {
    icone: 'table-large',
    titulo: 'Muitas peças de uma vez',
    texto: [
      'Em vez de cadastrar peça por peça, você preenche uma planilha (Excel, Google Planilhas ou CSV) com uma peça por linha e envia tudo de uma vez.',
      'Cabem até 5.000 peças por arquivo. Para mais que isso, divida em vários arquivos.',
    ],
  },
  {
    icone: 'download-outline',
    titulo: '1. Baixe o modelo',
    texto: [
      'Toque em "Excel (.xlsx)" para baixar o modelo. Ele tem quatro abas: Instruções, Produtos (onde você preenche), Categorias e Exemplo.',
      'Na coluna categoria, o Excel mostra uma lista para escolher. Use sempre uma das categorias da aba Categorias.',
    ],
  },
  {
    icone: 'pencil-outline',
    titulo: '2. Preencha a aba Produtos',
    texto: [
      'Obrigatórios em peça nova: nome, categoria e fotos. O resto é opcional.',
      'Preço como você escreveria: 89,90 ou R$ 1.299,00. Estoque é um número inteiro. Tamanhos separados por vírgula: P, M, G ou 38, 40 ou Único.',
    ],
    tabela: [
      ['codigo', 'nome', 'categoria', 'preco', 'estoque', 'tamanhos', 'fotos'],
      ['BR-001', 'Vestido midi floral', 'Vestidos', '89,90', '1', 'M', 'vestido1.jpg'],
      ['BR-002', 'Jaqueta jeans 90s', 'Vintage', '120', '2', 'P, M', 'https://...jpg'],
    ],
  },
  {
    icone: 'image-multiple-outline',
    titulo: 'Fotos: link ou nome do arquivo',
    texto: [
      'Coloque de 1 a 6 fotos por peça, separadas por | (barra em pé). A primeira é a capa.',
      'Pode ser um link que começa com https:// ou o nome exato do arquivo da foto no seu celular ou computador (ex.: vestido1.jpg).',
      'Se usar nomes de arquivo, depois de enviar a planilha toque em "Selecionar imagens" e escolha todas as fotos de uma vez. O app liga cada foto à peça pelo nome.',
    ],
  },
  {
    icone: 'barcode',
    titulo: 'Dê um código a cada peça',
    texto: [
      'A coluna codigo é opcional, mas vale muito a pena: é o seu código interno da peça (ex.: BR-001), e não pode repetir dentro da loja.',
      'Se você enviar outra planilha com um código que já existe, a peça é ATUALIZADA (preço, estoque...) em vez de virar uma peça duplicada.',
    ],
  },
  {
    icone: 'clipboard-check-outline',
    titulo: '3. Confira a prévia',
    texto: [
      'Ao escolher a planilha, nada é gravado ainda. Você vê quantas peças são novas, quantas vão ser atualizadas e o erro de cada linha (ex.: "Linha 45: categoria não existe").',
      'Linhas com erro ficam de fora e não atrapalham as outras. Corrija na planilha e envie de novo quando quiser.',
      'Escolha se as peças novas entram publicadas (já aparecem no feed) ou como rascunho, e toque em Importar.',
    ],
  },
  {
    icone: 'table-edit',
    titulo: 'Mudar preço e estoque de várias peças',
    texto: [
      'Toque em "Exportar catálogo": vem uma planilha com todas as suas peças. Altere o que quiser no Excel e importe o mesmo arquivo aqui.',
      'Só as colunas preenchidas mudam. Não apague a coluna id: é ela que liga a linha à peça.',
    ],
  },
];

/**
 * Passo a passo da importação por planilha. Só abre quando a pessoa pede
 * ("Como funciona?"): quem já sabe não é interrompido toda vez.
 */
export default function TutorialImportacao({
  visivel,
  aoFechar,
}: {
  visivel: boolean;
  aoFechar: () => void;
}): React.ReactElement {
  const [pagina, setPagina] = useState(0);
  const atual = PAGINAS[pagina];
  const ultima = pagina === PAGINAS.length - 1;

  const fechar = () => {
    aoFechar();
    setPagina(0);
  };

  return (
    <Modal visible={visivel} animationType="slide" onRequestClose={fechar}>
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
        <View className="flex-row items-center px-4 min-h-16 gap-3">
          <Text className="flex-1 text-ink text-2xl font-display-bold">Como funciona</Text>
          <Button variant="icon" icon="close" accessibilityLabel="Fechar o passo a passo" onPress={fechar} />
        </View>
        <View className="h-[5px] border-t-2 border-b border-ink" />

        <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
          <View className="w-14 h-14 rounded-lg bg-ink items-center justify-center">
            <MaterialCommunityIcons name={atual.icone} size={30} color={colors.signal.DEFAULT} />
          </View>
          <Text className="text-ink text-2xl font-display-bold">{atual.titulo}</Text>
          {atual.texto.map((t, i) => (
            <Text key={i} className="text-ink-3 text-base">{t}</Text>
          ))}
          {atual.tabela ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="border border-ink bg-surface">
                {atual.tabela.map((linha, i) => (
                  <View key={i} className={`flex-row ${i > 0 ? 'border-t border-surface-5' : 'bg-surface-3'}`}>
                    {linha.map((cel, j) => (
                      <Text
                        key={j}
                        className={`px-2 py-1.5 text-xs w-28 ${i === 0 ? 'font-sans-bold text-ink' : 'text-ink-3'} ${j > 0 ? 'border-l border-surface-5' : ''}`}
                        numberOfLines={1}
                      >
                        {cel}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : null}
        </ScrollView>

        <View className="px-4 pb-4 gap-3">
          {/* Marcadores de página: cada um leva direto ao passo */}
          <View className="flex-row justify-center gap-1" accessibilityLabel={`Passo ${pagina + 1} de ${PAGINAS.length}`}>
            {PAGINAS.map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setPagina(i)}
                accessibilityRole="button"
                accessibilityLabel={`Ir para o passo ${i + 1}`}
                className="w-8 h-8 items-center justify-center"
              >
                <View className={`h-2 rounded-sm ${i === pagina ? 'w-5 bg-seal' : 'w-2 bg-surface-5'}`} />
              </TouchableOpacity>
            ))}
          </View>
          <View className="flex-row gap-3">
            {pagina > 0 ? (
              <View className="flex-1">
                <Button variant="secondary" label="Voltar" onPress={() => setPagina(pagina - 1)} />
              </View>
            ) : null}
            <View className="flex-1">
              <Button
                variant="primary"
                label={ultima ? 'Entendi' : 'Próximo'}
                icon={ultima ? 'checkmark' : 'arrow-forward'}
                onPress={ultima ? fechar : () => setPagina(pagina + 1)}
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
