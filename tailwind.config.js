/** @type {import('tailwindcss').Config} */
module.exports = {
  // Tell Tailwind which files to scan for class names
  content: ['./App.{ts,tsx}', './src/**/*.{ts,tsx}'],

  // NativeWind v4 preset — required
  presets: [require('nativewind/preset')],

  theme: {
    extend: {
      colors: {
        // ── Catálogo vintage de loja ────────────────────────────────────────
        // O app é folheado como um catálogo de mala direta: papel creme, tinta
        // marrom-escura, vermelho de selo e filetes finos. O vermelho (`seal`)
        // é do selo de preço, das molduras e do estado ativo; botões e seleção
        // são de TINTA. O mostarda (`signal`) só aparece sobre tinta escura
        // (números, pictogramas). A foto da peça é o único ponto de cor fora
        // dessa regra.
        //
        // Espelhada em src/theme/colors.ts para as props que não aceitam
        // className (Ionicons, ActivityIndicator, StatusBar...).
        // Ao mexer aqui, mexa lá também.

        // `white` vira o papel claro: texto/ícone sobre tinta ou selo nunca é
        // branco puro, é o creme do catálogo.
        white: '#FBF5E6',

        // Papel da página
        background: '#F3E9D2',

        // Papel das fichas/cartões — claro → mais fechado (também filetes e
        // fundo de foto indisponível)
        surface: {
          DEFAULT: '#FBF5E6',
          2: '#F7EDD6',
          3: '#EADDBB',
          4: '#DACB9F',
          5: '#C2B185',
        },

        // Vermelho de selo (preço, moldura, ativo). 6,2:1 sobre o papel.
        seal: {
          DEFAULT: '#B3261E',
          dark: '#8C1C15',
          soft: '#F1D5CC',
        },

        // Mostarda: só sobre tinta escura (números, pictogramas).
        signal: {
          DEFAULT: '#E3A72F',
          soft: '#F6E2AE',
        },

        // Tinta (texto). ink → ink-6 = mais escuro → mais claro.
        // Contraste sobre background #F3E9D2: ink 13:1, ink-4 6,6:1, ink-5 5,5:1.
        // ink-6 é decorativo (bordas, ícone inativo), não use para texto.
        ink: {
          DEFAULT: '#2B1D12',
          2: '#3C2A1B',
          3: '#503C29',
          4: '#614D38',
          5: '#705B45',
          6: '#A8977C',
        },

        // Feedback / status (sempre com ícone + rótulo, nunca só cor)
        success: '#2F6B3C',
        danger: '#B3261E',
        warning: '#8A5A00',
        info: '#1F4E79',
      },

      borderRadius: {
        // Papel impresso tem canto quase reto. Sobrescreve a escala padrão para
        // que `rounded-lg`/`rounded-xl` (chips, quadrados de pictograma) não
        // virem pílulas. `card` = ficha, `hero` = ficha grande.
        sm: '2px',
        md: '3px',
        lg: '4px',
        xl: '6px',
        card: '4px',
        hero: '6px',
      },

      fontFamily: {
        // ── Tipografia ──────────────────────────────────────────────────────
        // Corpo e interface: Hind. Títulos, nomes de peça e preços: DM Serif
        // Display (serifa de catálogo). Códigos de item ("Ref. 0231"): Courier
        // Prime, como numeração datilografada. RN não tem `font-weight` real em
        // fonte customizada: cada peso é uma família própria, por isso
        // `font-bold` do Tailwind NÃO seleciona o arquivo certo — use sempre
        // estas classes.
        sans: ['Hind_400Regular'],
        'sans-medium': ['Hind_500Medium'],
        'sans-semibold': ['Hind_600SemiBold'],
        'sans-bold': ['Hind_700Bold'],
        'sans-black': ['Hind_700Bold'],
        // DM Serif Display só tem um peso (já é pesado) e tem numerais de
        // linha — Playfair usa numerais antigos, em que "0" lia como "o".
        display: ['DMSerifDisplay_400Regular'],
        'display-bold': ['DMSerifDisplay_400Regular'],
        'display-black': ['DMSerifDisplay_400Regular'],
        'display-italic': ['DMSerifDisplay_400Regular_Italic'],
        mono: ['CourierPrime_400Regular'],
        'mono-bold': ['CourierPrime_700Bold'],
      },

      fontSize: {
        '2xs': '11px',
        // Preço da peça em página de catálogo.
        display: ['56px', { lineHeight: '58px', letterSpacing: -1 }],
        'display-sm': ['36px', { lineHeight: '40px', letterSpacing: -0.5 }],
      },
    },
  },

  plugins: [],
};
