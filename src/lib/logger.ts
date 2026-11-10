import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Registro de erros e exceções do app.
 *
 * O que é capturado: exceções JS não tratadas (`ErrorUtils`), promises rejeitadas
 * sem tratamento, erros de renderização (`ErrorBoundary`) e falhas de chamada à API
 * (rede fora do ar, 5xx). Cada entrada vai para uma fila persistida no aparelho
 * (sobrevive a fechar o app e a ficar sem internet) e é enviada em lote a
 * `POST /api/logs/client`, onde o Lucker a escreve no log do servidor — junto do
 * `X-Request-ID` da chamada que falhou, para ligar o erro do app ao do servidor.
 *
 * O que NÃO entra, de propósito: texto digitado pela pessoa, tokens, corpo de
 * requisição, querystring. A rota é só o caminho, com ids trocados por `:id`. O
 * servidor ainda limpa e-mails, tokens, CPF/CNPJ e senhas antes de gravar.
 *
 * Em desenvolvimento (`__DEV__`) só escreve no console; para enviar mesmo assim,
 * defina `EXPO_PUBLIC_LOG_REMOTO=1`.
 */

export type NivelLog = 'warn' | 'error' | 'fatal';
export type OrigemLog = 'js' | 'promise' | 'boundary' | 'api' | 'nativo';

interface EntradaLog {
  nivel: NivelLog;
  origem: OrigemLog;
  mensagem: string;
  pilha?: string;
  tela?: string;
  ts: string;
  contexto: Record<string, string | number | boolean | null>;
}

interface OpcoesLog {
  origem?: OrigemLog;
  nivel?: NivelLog;
  contexto?: Record<string, string | number | boolean | null | undefined>;
}

const CHAVE_FILA = 'lookly_logs_pendentes';
const MAX_FILA = 50; // o mais antigo sai primeiro
const LOTE = 20; // o servidor aceita até 20 por envio
const REPETIDO_MS = 30_000; // mesmo erro dentro desta janela conta uma vez só
const MAX_POR_SESSAO = 60; // contra laço de erro enchendo a fila
const ESPERA_ENVIO_MS = 3_000;
const REENVIO_MINIMO_MS = 60_000; // depois de uma falha de envio

const ENVIAR = !__DEV__ || process.env.EXPO_PUBLIC_LOG_REMOTO === '1';
const URL_BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

// Cliente próprio (sem o interceptor do `api.ts`): se o envio do log falhasse num
// 401 e passasse pelo interceptor, ele deslogaria a pessoa por causa de um log.
const http = axios.create({ baseURL: URL_BASE, timeout: 10_000, headers: { 'Content-Type': 'application/json' } });

let fila: EntradaLog[] | null = null;
let telaAtual: string | undefined;
let contadorSessao = 0;
let enviando = false;
let proximoEnvioPermitido = 0;
let temporizador: ReturnType<typeof setTimeout> | null = null;
const vistos = new Map<string, number>();

export function definirTela(nome: string | undefined): void {
  telaAtual = nome;
}

function versao(): string {
  return Constants.expoConfig?.version ?? 'desconhecida';
}

/** Troca ids e números longos do caminho: a rota agrupa erros iguais e não carrega dado. */
export function normalizarRota(url: string): string {
  const semQuery = url.split('?')[0].split('#')[0];
  return semQuery
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d{3,}/g, '/:n');
}

function descrever(erro: unknown): { mensagem: string; pilha?: string } {
  if (erro instanceof Error) return { mensagem: erro.message || erro.name, pilha: erro.stack };
  if (typeof erro === 'string') return { mensagem: erro };
  try {
    return { mensagem: JSON.stringify(erro) ?? String(erro) };
  } catch {
    return { mensagem: String(erro) };
  }
}

async function carregarFila(): Promise<EntradaLog[]> {
  if (fila) return fila;
  try {
    const bruto = await AsyncStorage.getItem(CHAVE_FILA);
    const lida = bruto ? JSON.parse(bruto) : [];
    fila = Array.isArray(lida) ? lida.slice(-MAX_FILA) : [];
  } catch {
    fila = [];
  }
  return fila;
}

function salvarFila(): void {
  AsyncStorage.setItem(CHAVE_FILA, JSON.stringify(fila ?? [])).catch(() => {});
}

/** Registra um erro. Nunca lança: um logger que quebra o app seria o fim da graça. */
export function registrarErro(erro: unknown, opcoes: OpcoesLog = {}): void {
  try {
    const { mensagem, pilha } = descrever(erro);
    const origem = opcoes.origem ?? 'js';
    const nivel = opcoes.nivel ?? 'error';

    if (__DEV__) console.warn(`[logger:${origem}/${nivel}] ${mensagem}`);
    if (!ENVIAR) return;

    // Anti-tempestade: o mesmo erro em laço não pode encher a fila nem a rede.
    const chave = `${origem}|${mensagem.slice(0, 120)}`;
    const agora = Date.now();
    const ultimo = vistos.get(chave);
    if (ultimo !== undefined && agora - ultimo < REPETIDO_MS) return;
    vistos.set(chave, agora);
    if (vistos.size > 200) vistos.clear();
    if (++contadorSessao > MAX_POR_SESSAO) return;

    const contexto: EntradaLog['contexto'] = {};
    for (const [k, v] of Object.entries(opcoes.contexto ?? {})) {
      if (v !== undefined) contexto[k] = v;
    }

    const entrada: EntradaLog = { nivel, origem, mensagem, pilha, tela: telaAtual, ts: new Date().toISOString(), contexto };
    carregarFila().then((f) => {
      f.push(entrada);
      if (f.length > MAX_FILA) f.splice(0, f.length - MAX_FILA);
      salvarFila();
      agendarEnvio(nivel === 'fatal' ? 0 : ESPERA_ENVIO_MS);
    });
  } catch {
    // ignorado de propósito
  }
}

function agendarEnvio(espera: number): void {
  if (temporizador) clearTimeout(temporizador);
  temporizador = setTimeout(() => { enviarPendentes().catch(() => {}); }, espera);
}

/** Envia o que está na fila, em lotes. Em falha, guarda tudo e só tenta de novo depois de um minuto. */
export async function enviarPendentes(): Promise<void> {
  if (!ENVIAR || enviando || Date.now() < proximoEnvioPermitido) return;
  const f = await carregarFila();
  if (f.length === 0) return;
  enviando = true;
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    while (f.length > 0) {
      const lote = f.slice(0, LOTE);
      await http.post(
        '/logs/client',
        { app_versao: versao(), plataforma: `${Platform.OS} ${String(Platform.Version)}`, entradas: lote },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
      );
      f.splice(0, lote.length);
      salvarFila();
    }
  } catch {
    proximoEnvioPermitido = Date.now() + REENVIO_MINIMO_MS;
  } finally {
    enviando = false;
  }
}

/** Falha de chamada à API: só rede fora do ar e 5xx — 4xx (login errado, 404, 422) é fluxo normal, não erro. */
export function registrarFalhaDeApi(erro: any): void {
  const status: number | undefined = erro?.response?.status;
  const url = String(erro?.config?.url ?? '');
  if (url.includes('/logs/client')) return;
  if (status !== undefined && status < 500) return;
  registrarErro(erro, {
    origem: 'api',
    nivel: status === undefined ? 'warn' : 'error',
    contexto: {
      metodo: String(erro?.config?.method ?? '').toUpperCase() || null,
      rota: normalizarRota(url),
      status: status ?? null,
      codigo: erro?.code ?? null,
      request_id: erro?.response?.headers?.['x-request-id'] ?? null,
    },
  });
}

let iniciado = false;

/** Liga as capturas globais. Chamar uma vez, na subida do app. */
export function iniciarLogger(): void {
  if (iniciado) return;
  iniciado = true;
  const g: any = globalThis;

  // Exceções JS não tratadas — repassa ao handler original (tela vermelha no dev, fechar no release).
  const utils = g.ErrorUtils;
  if (utils?.setGlobalHandler) {
    const anterior = utils.getGlobalHandler?.();
    utils.setGlobalHandler((erro: unknown, fatal?: boolean) => {
      registrarErro(erro, { origem: 'js', nivel: fatal ? 'fatal' : 'error' });
      if (fatal) enviarPendentes().catch(() => {});
      anterior?.(erro, fatal);
    });
  }

  // Promises rejeitadas sem `.catch`.
  const hermes = g.HermesInternal;
  if (hermes?.enablePromiseRejectionTracker) {
    hermes.enablePromiseRejectionTracker({
      allRejections: true,
      onUnhandled: (_id: number, erro: unknown) => registrarErro(erro, { origem: 'promise' }),
    });
  }

  // Manda o que ficou pendente ao abrir e ao voltar do segundo plano.
  AppState.addEventListener('change', (estado) => {
    if (estado === 'active' || estado === 'background') enviarPendentes().catch(() => {});
  });
  enviarPendentes().catch(() => {});
}
