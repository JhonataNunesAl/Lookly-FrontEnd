/**
 * Paleta "Catálogo vintage" — fonte única das cores usadas em props JS.
 *
 * NativeWind cobre tudo que aceita `className`. Props como `color` do Ionicons,
 * `placeholderTextColor`, `backgroundColor` do StatusBar e `shadowColor` não
 * aceitam. Importe daqui.
 *
 * Espelha tailwind.config.js — ao mexer em um, mexa no outro.
 *
 * Regra do vermelho (`seal`): selo de preço, molduras e estado ativo; botões e
 * seleção são de tinta. Mostarda (`signal`) só sobre tinta escura.
 */

export const colors = {
  /** Papel da página. */
  background: '#F3E9D2',

  surface: {
    DEFAULT: '#FBF5E6',
    2: '#F7EDD6',
    3: '#EADDBB',
    4: '#DACB9F',
    5: '#C2B185',
  },

  seal: {
    DEFAULT: '#B3261E',
    dark: '#8C1C15',
    soft: '#F1D5CC',
  },

  signal: {
    DEFAULT: '#E3A72F',
    soft: '#F6E2AE',
  },

  ink: {
    DEFAULT: '#2B1D12',
    2: '#3C2A1B',
    3: '#503C29',
    4: '#614D38',
    5: '#705B45',
    /** Decorativo (bordas, ícone inativo) — não use para texto. */
    6: '#A8977C',
  },

  success: '#2F6B3C',
  danger: '#B3261E',
  warning: '#8A5A00',
  info: '#1F4E79',

  /** Papel claro para texto/ícone sobre tinta ou selo. */
  white: '#FBF5E6',
} as const;
