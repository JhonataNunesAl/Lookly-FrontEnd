import * as ImagePicker from 'expo-image-picker';
import api from './api';

/**
 * Fotos: escolher da galeria e enviar. O envio passa pelo backend
 * (`POST /api/uploads/image`, ver o CLAUDE.md do Lucker) — o app não grava
 * direto no Supabase Storage. O servidor devolve a URL pública que vai em
 * `photos` de um look, `avatar_url` do perfil ou `store_logo_url` da loja.
 */

export interface FotoEscolhida {
  uri: string;
  /** image/jpeg, image/png ou image/webp — o servidor confere pelos bytes. */
  mimeType: string;
}

const MIME_PADRAO = 'image/jpeg';
const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];

/** Abre a galeria. Sem permissão a pedir: o seletor do sistema (Android 13+)
 *  entrega só o que a pessoa escolheu. `quality` comprime o JPEG antes do envio.
 *  `aspect` só vale com `recortar` (corte 1×1 de logo/avatar, 3×4 de peça). */
export async function escolherFotos(opcoes: {
  max: number;
  recortar?: [number, number];
}): Promise<FotoEscolhida[]> {
  const unica = opcoes.max === 1;
  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: !unica,
    selectionLimit: unica ? 1 : opcoes.max,
    allowsEditing: unica && !!opcoes.recortar,
    aspect: opcoes.recortar,
    quality: 0.8,
  });
  if (resultado.canceled) return [];
  return resultado.assets.map((a) => ({
    uri: a.uri,
    mimeType: a.mimeType && TIPOS_ACEITOS.includes(a.mimeType) ? a.mimeType : MIME_PADRAO,
  }));
}

/** Envia uma foto e devolve a URL pública. O corpo vai cru (sem multipart). */
export async function enviarFoto(foto: FotoEscolhida): Promise<string> {
  const resposta = await fetch(foto.uri);
  const blob = await resposta.blob();
  const { data } = await api.post<{ url: string }>('/uploads/image', blob, {
    headers: { 'Content-Type': foto.mimeType },
    // Não deixa o axios tentar serializar o Blob como JSON.
    transformRequest: [(corpo) => corpo],
  });
  return data.url;
}

/** Envia várias em sequência (menos pico de memória/banda que em paralelo). */
export async function enviarFotos(fotos: FotoEscolhida[]): Promise<string[]> {
  const urls: string[] = [];
  for (const foto of fotos) {
    urls.push(await enviarFoto(foto));
  }
  return urls;
}

/** Mensagem para mostrar quando o envio falha (usa o `detail` do servidor). */
export function erroDeUpload(e: any): string {
  const detalhe = e?.response?.data?.detail;
  if (typeof detalhe === 'string') return detalhe;
  if (e?.response?.status === 404) return 'O servidor ainda não aceita envio de fotos. Atualize o back-end.';
  return 'Não foi possível enviar a foto. Verifique a conexão e tente de novo.';
}
