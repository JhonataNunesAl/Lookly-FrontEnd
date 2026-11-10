import axios from 'axios';
import { supabase } from './supabase';
import { registrarFalhaDeApi } from './logger';

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
// Sem a variável: em desenvolvimento cai no IP da máquina de dev; num build de
// produção (APK/AAB) cai na API publicada — nunca num IP de rede local, que
// deixaria o app do testador falando com o nada.
const baseURL =
  process.env.EXPO_PUBLIC_API_URL ??
  (__DEV__ ? 'http://192.168.15.2:8000/api' : 'https://lookly-backend-2.onrender.com/api');

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
    registrarFalhaDeApi(erro); // só rede fora do ar e 5xx — ver lib/logger.ts
    return Promise.reject(erro);
  },
);

export default api;
