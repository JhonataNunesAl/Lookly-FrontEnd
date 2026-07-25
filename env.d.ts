/**
 * Tipos das variáveis de ambiente do Expo. Elas existem em runtime (o Expo
 * embute `EXPO_PUBLIC_*` no bundle), mas o TypeScript não conhece `process`
 * sem @types/node — declaramos só o que usamos, em vez de puxar o Node inteiro.
 */
declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
  };
};
