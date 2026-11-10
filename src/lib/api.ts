import axios from 'axios';
import { supabase } from './supabase';

/**
 * Instância axios compartilhada para o backend Lucker.
 *
 * A URL vem de EXPO_PUBLIC_API_URL (ver .env). O fallback é o IP da máquina de
 * dev na rede local — celular físico via Expo Go não alcança localhost nem
 * 0.0.0.0, precisa do IP. Troque conforme o ambiente:
 *   - Emulador Android: http://10.0.2.2:8000/api
 *   - iOS / web:        http://localhost:8000/api
 *   - Celular (Expo Go): http://<IP-da-maquina>:8000/api
 */
const baseURL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.15.2:8000/api';

const api = axios.create({
  baseURL,
  // O Render (plano grátis) dorme e leva 15-50s para acordar: com 10s o primeiro
  // login depois de um tempo parado sempre falhava com "sem conexão".
  timeout: 40000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Injeta o JWT do Supabase em toda requisição. O token sai da sessão gerenciada
// pelo supabase-js (com refresh automático) — não guardamos mais um token à mão.
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Token recusado (expirado sem refresh possível, usuário removido): a sessão local
// não vale mais. Desloga — o App escuta o SIGNED_OUT e volta para o Login, em
// vez de deixar a pessoa presa numa tela cheia de erros "não foi possível carregar".
api.interceptors.response.use(
  (resposta) => resposta,
  async (erro) => {
    if (erro?.response?.status === 401) {
      await supabase.auth.signOut().catch(() => {});
    }
    return Promise.reject(erro);
  },
);

export default api;
