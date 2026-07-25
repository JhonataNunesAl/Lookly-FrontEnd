/** @type {import('tailwindcss').Config} */
module.exports = {
  // Tell Tailwind which files to scan for class names
  content: ['./App.{ts,tsx}', './src/**/*.{ts,tsx}'],

  // NativeWind v4 preset — required
  presets: [require('nativewind/preset')],

  theme: {
    extend: {
      colors: {
        // ── Paleta "Editorial" ──────────────────────────────────────────────
        // Base creme + tinta quase preta + acento terracota. Deliberadamente
        // longe do preto+neon de TikTok/Kwai: a foto da roupa é o único ponto
        // saturado da tela.
        //
        // Espelhada em src/theme/colors.ts para as props que não aceitam
        // className (Ionicons, ActivityIndicator, LinearGradient...).
        // Ao mexer aqui, mexa lá também.

        // Fundo da página
        background: '#F7F5F2',

        // Hierarquia de superfícies (cards, painéis) — clara → mais fechada
        surface: {
          DEFAULT: '#FFFFFF',
          2: '#FBFAF8',
          3: '#F2EEE9',
          4: '#E8E2DA',
          5: '#DCD4CA',
        },

        // Acento primário — terracota
        brand: {
          DEFAULT: '#B54A2E',
          // Tint claro: só para texto/ícone SOBRE foto ou fundo escuro.
          // Não tem contraste para uso em cima de background/surface.
          light: '#E8B4A0',
          dark: '#8F3A24',
        },

        // Tinta (texto). ink → ink-6 = mais escuro → mais claro.
        // Contraste sobre background: ink 15:1, ink-4 5.2:1, ink-5 4.1:1.
        // ink-6 é decorativo (bordas, ícone inativo), não use para texto.
        ink: {
          DEFAULT: '#14110F',
          2: '#3D3630',
          3: '#574F49',
          4: '#6B635C',
          5: '#7E756E',
          6: '#A9A099',
        },

        // Feedback / status
        success: '#2F6B4F',
        danger: '#A3301F',
        warning: '#9A6B15',
        info: '#3E6B8A',
      },

      borderRadius: {
        '4xl': '2rem',
        // Escala semântica pra parar de inventar rounded-[Npx] tela por tela
        // (achado da auditoria: rounded-2xl/3xl/[24px]/[28px]/[32px] todos
        // coexistiam sem critério). `card` cobre conteúdo comum; `hero` é só
        // pro cartão escuro de identidade (perfil/dashboard/insights).
        card: '20px',
        hero: '32px',
      },

      fontSize: {
        '2xs': '10px',
      },
    },
  },

  plugins: [],
};
