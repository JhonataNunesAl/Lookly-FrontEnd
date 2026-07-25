// O polyfill de URL PRECISA vir antes de criar o client — o supabase-js usa
// `URL`, que o Hermes/React Native não implementa por completo.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase — a autenticação do Lookly é delegada ao Supabase Auth.
 * O backend (Lucker) não registra usuários nem emite tokens; ele só valida o
 * JWT que o app manda em `Authorization: Bearer`. Este client faz login/cadastro
 * direto no Supabase e guarda a sessão (com refresh automático) no AsyncStorage.
 *
 * URL e anon key são PÚBLICAS por design (viajam dentro do app publicado). A
 * service key NUNCA entra aqui — a privacidade é garantida por RLS no servidor.
 * Defina os valores no `.env` (ver `.env.example`).
 */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Falha barulhenta em dev: sem essas duas variáveis, todo login/refresh quebra.
  console.warn(
    '[Lookly] Supabase não configurado. Defina EXPO_PUBLIC_SUPABASE_URL e ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY no .env e reinicie o Expo com --clear.',
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // App nativo não volta de um redirect com token na URL — isso é coisa de web.
    detectSessionInUrl: false,
  },
});
