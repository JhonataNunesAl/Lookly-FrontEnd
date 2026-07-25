/**
 * Paleta "Editorial" — fonte única das cores usadas em props JS.
 *
 * NativeWind cobre tudo que aceita `className`. Props como `color` do Ionicons,
 * `placeholderTextColor`, `colors` do LinearGradient e `shadowColor` não aceitam,
 * e antes carregavam hex solto espalhado por 14 telas. Importe daqui.
 *
 * Espelha tailwind.config.js — ao mexer em um, mexa no outro.
 */

export const colors = {
  background: '#F7F5F2',

  surface: {
    DEFAULT: '#FFFFFF',
    2: '#FBFAF8',
    3: '#F2EEE9',
    4: '#E8E2DA',
    5: '#DCD4CA',
  },

  brand: {
    DEFAULT: '#B54A2E',
    /** Só sobre foto/fundo escuro — sem contraste sobre background. */
    light: '#E8B4A0',
    dark: '#8F3A24',
  },

  ink: {
    DEFAULT: '#14110F',
    2: '#3D3630',
    3: '#574F49',
    4: '#6B635C',
    5: '#7E756E',
    /** Decorativo (bordas, ícone inativo) — não use para texto. */
    6: '#A9A099',
  },

  success: '#2F6B4F',
  danger: '#A3301F',
  warning: '#9A6B15',
  info: '#3E6B8A',

  white: '#FFFFFF',
} as const;

/** Gradiente do acento — botões primários e realces de marca. */
export const BRAND_GRADIENT = [colors.brand.light, colors.brand.DEFAULT] as const;

/** Gradiente para botão sólido primário (mais fechado, texto branco por cima). */
export const BRAND_GRADIENT_SOLID = ['#C86B4A', colors.brand.dark] as const;

/**
 * Gradiente de tinta — cards "herói" (ex: saldo do painel da empresa).
 * Escuro sobre creme: destaca sem competir com o terracota dos botões.
 */
export const INK_GRADIENT = [colors.ink[2], colors.ink.DEFAULT] as const;

/** Véu sobre foto: transparente → tinta, para texto branco legível no card. */
export const PHOTO_SCRIM = [
  'transparent',
  'rgba(20,17,15,0.45)',
  'rgba(20,17,15,0.92)',
] as const;

/** Véu de baixo da lista (fade para o fundo da página). */
export const PAGE_FADE = ['transparent', 'rgba(247,245,242,0.9)', colors.background] as const;
