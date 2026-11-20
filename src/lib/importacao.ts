import * as DocumentPicker from 'expo-document-picker';
import { Linking, Platform } from 'react-native';
import api from './api';

/**
 * Importação em massa de peças por planilha (CSV/XLSX) — ver o README do back-end,
 * seção "Importação e edição em massa". O fluxo:
 *
 * 1. a pessoa baixa o modelo (`GET /looks/import/template`) e preenche;
 * 2. escolhe o arquivo e o servidor devolve a prévia (`POST /looks/import/preview`),
 *    que não grava nada: o que vai ser criado/atualizado e os erros por linha;
 * 3. se a planilha cita fotos por NOME de arquivo, a pessoa escolhe as imagens e o
 *    app envia cada uma (`POST /uploads/image`), trocando o nome pelo link;
 * 4. o app grava as linhas válidas em lotes (`POST /looks/bulk`).
 */

export interface LinhaPrevia {
  linha: number;
  acao: 'criar' | 'atualizar';
  look_id: string | null;
  /** Já no formato de `POST /looks/bulk`. */
  dados: Record<string, unknown>;
  /** Todas as fotos na ordem da planilha (links e nomes de arquivo); a 1ª é a capa. */
  fotos: string[];
  fotos_pendentes: string[];
  erros: string[];
}

export interface PreviaImportacao {
  total_linhas: number;
  validas: number;
  com_erro: number;
  a_criar: number;
  a_atualizar: number;
  arquivos_de_foto: string[];
  colunas_ignoradas: string[];
  linhas: LinhaPrevia[];
}

export interface ErroLote {
  indice: number;
  linha: number | null;
  mensagem: string;
}

export interface ResultadoLote {
  criados: number;
  atualizados: number;
  ids: string[];
  erros: ErroLote[];
}

export interface ArquivoEscolhido {
  uri: string;
  nome: string;
  mimeType?: string;
  tamanho?: number;
}

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const TIPOS_PLANILHA = [
  MIME_XLSX,
  'text/csv',
  'text/comma-separated-values',
  'application/vnd.ms-excel',
  'text/plain',
  '.csv',
  '.xlsx',
];
const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
/** Lote de gravação: o servidor aceita até 1000; 250 deixa cada chamada curta. */
const TAMANHO_LOTE = 250;

function paraArquivo(a: DocumentPicker.DocumentPickerAsset): ArquivoEscolhido {
  return { uri: a.uri, nome: a.name, mimeType: a.mimeType ?? undefined, tamanho: a.size ?? undefined };
}

export async function escolherPlanilha(): Promise<ArquivoEscolhido | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: TIPOS_PLANILHA, copyToCacheDirectory: true });
  if (r.canceled || !r.assets?.length) return null;
  return paraArquivo(r.assets[0]);
}

/** Seletor de arquivos (não a galeria): é o que entrega o NOME de cada imagem,
 *  que liga a foto à linha da planilha. Permite escolher várias de uma vez. */
export async function escolherImagens(): Promise<ArquivoEscolhido[]> {
  const r = await DocumentPicker.getDocumentAsync({ type: TIPOS_FOTO, multiple: true, copyToCacheDirectory: true });
  if (r.canceled || !r.assets?.length) return [];
  return r.assets.map(paraArquivo);
}

function tipoDaPlanilha(arquivo: ArquivoEscolhido): string {
  const nome = arquivo.nome.toLowerCase();
  if (nome.endsWith('.xlsx')) return MIME_XLSX;
  if (nome.endsWith('.csv') || nome.endsWith('.txt')) return 'text/csv';
  return arquivo.mimeType || 'application/octet-stream';
}

async function lerBlob(uri: string): Promise<Blob> {
  const resposta = await fetch(uri);
  return resposta.blob();
}

/** Envia a planilha crua e recebe a prévia (o servidor não grava nada aqui). */
export async function gerarPrevia(arquivo: ArquivoEscolhido): Promise<PreviaImportacao> {
  const blob = await lerBlob(arquivo.uri);
  const { data } = await api.post<PreviaImportacao>('/looks/import/preview', blob, {
    headers: { 'Content-Type': tipoDaPlanilha(arquivo) },
    transformRequest: [(corpo) => corpo],
    timeout: 120000,
  });
  return data;
}

function tipoDaImagem(arquivo: ArquivoEscolhido): string {
  const nome = arquivo.nome.toLowerCase();
  if (nome.endsWith('.png')) return 'image/png';
  if (nome.endsWith('.webp')) return 'image/webp';
  if (nome.endsWith('.jpg') || nome.endsWith('.jpeg')) return 'image/jpeg';
  return arquivo.mimeType && TIPOS_FOTO.includes(arquivo.mimeType) ? arquivo.mimeType : 'image/jpeg';
}

const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

/** Envia uma imagem; em 429 (limite de envios por minuto) espera e tenta de novo. */
export async function enviarImagem(arquivo: ArquivoEscolhido): Promise<string> {
  const blob = await lerBlob(arquivo.uri);
  for (let tentativa = 0; ; tentativa++) {
    try {
      const { data } = await api.post<{ url: string }>('/uploads/image', blob, {
        headers: { 'Content-Type': tipoDaImagem(arquivo) },
        transformRequest: [(corpo) => corpo],
      });
      return data.url;
    } catch (e: any) {
      if (e?.response?.status === 429 && tentativa < 8) {
        await esperar(10000);
        continue;
      }
      throw e;
    }
  }
}

/** Chave para casar o nome citado na planilha com o arquivo escolhido. */
export function chaveDeArquivo(nome: string): string {
  return nome.trim().toLowerCase();
}

/**
 * Monta os itens de `POST /looks/bulk` a partir das linhas válidas da prévia,
 * trocando cada nome de arquivo pelo link enviado (na ordem da planilha). Linhas
 * com foto que não foi escolhida/enviada voltam em `semFoto`.
 */
export function montarItens(
  linhas: LinhaPrevia[],
  links: Record<string, string>,
): { itens: Record<string, unknown>[]; semFoto: { linha: number; arquivos: string[] }[] } {
  const itens: Record<string, unknown>[] = [];
  const semFoto: { linha: number; arquivos: string[] }[] = [];
  for (const l of linhas) {
    if (l.erros.length) continue;
    if (!l.fotos_pendentes.length) {
      itens.push({ ...l.dados, linha: l.linha });
      continue;
    }
    const faltando = l.fotos_pendentes.filter((n) => !links[chaveDeArquivo(n)]);
    if (faltando.length) {
      semFoto.push({ linha: l.linha, arquivos: faltando });
      continue;
    }
    const photos = l.fotos.map((f) => (/^https?:\/\//i.test(f) ? f : links[chaveDeArquivo(f)]));
    itens.push({ ...l.dados, photos, linha: l.linha });
  }
  return { itens, semFoto };
}

/** Grava em lotes e soma os resultados. `aoAvancar(feitos, total)` a cada lote. */
export async function gravarEmLotes(
  itens: Record<string, unknown>[],
  status: 'active' | 'draft',
  aoAvancar?: (feitos: number, total: number) => void,
): Promise<ResultadoLote> {
  const total: ResultadoLote = { criados: 0, atualizados: 0, ids: [], erros: [] };
  for (let i = 0; i < itens.length; i += TAMANHO_LOTE) {
    const lote = itens.slice(i, i + TAMANHO_LOTE);
    const { data } = await api.post<ResultadoLote>('/looks/bulk', { itens: lote, status }, { timeout: 120000 });
    total.criados += data.criados;
    total.atualizados += data.atualizados;
    total.ids.push(...data.ids);
    total.erros.push(...data.erros.map((e) => ({ ...e, indice: e.indice + i })));
    aoAvancar?.(Math.min(i + lote.length, itens.length), itens.length);
  }
  return total;
}

// ── downloads ─────────────────────────────────────────────────────────────────

// O tsconfig do app não inclui os tipos do DOM; só o que usamos daqui.
declare const document: any;
declare const URL: any;

function salvarNoNavegador(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function nomeDoCabecalho(cabecalho: string | undefined, padrao: string): string {
  const m = /filename="([^"]+)"/.exec(cabecalho ?? '');
  return m?.[1] ?? padrao;
}

/** Planilha modelo. É pública: no celular abre direto no navegador para baixar. */
export async function baixarModelo(formato: 'xlsx' | 'csv'): Promise<void> {
  if (Platform.OS !== 'web') {
    const base = String(api.defaults.baseURL ?? '').replace(/\/$/, '');
    await Linking.openURL(`${base}/looks/import/template?formato=${formato}`);
    return;
  }
  const r = await api.get('/looks/import/template', { params: { formato }, responseType: 'blob' });
  salvarNoNavegador(r.data, nomeDoCabecalho(r.headers['content-disposition'], `modelo-importacao-lookly.${formato}`));
}

/** Exportar o catálogo (exige login). No app instalado, ainda só pelo site:
 *  devolve `false` para a tela avisar. */
export async function exportarCatalogo(formato: 'xlsx' | 'csv'): Promise<boolean> {
  if (Platform.OS !== 'web') return false;
  const r = await api.get('/looks/export', { params: { formato }, responseType: 'blob', timeout: 120000 });
  salvarNoNavegador(r.data, nomeDoCabecalho(r.headers['content-disposition'], `catalogo-lookly.${formato}`));
  return true;
}

/** Mensagem legível de um erro da API (usa o `detail` do servidor). */
export function mensagemDeErro(e: any, padrao: string): string {
  const detalhe = e?.response?.data?.detail;
  if (typeof detalhe === 'string') return detalhe;
  if (Array.isArray(detalhe) && detalhe[0]?.msg) return String(detalhe[0].msg);
  if (e?.response?.status === 404) return 'O servidor ainda não tem a importação em massa. Atualize o back-end.';
  if (!e?.response) return 'Sem conexão com o servidor. Verifique a internet e tente de novo.';
  return padrao;
}
