import React from 'react';
import { Text as RNText, TextProps } from 'react-native';

/**
 * `Text` do app: igual ao do React Native, mas com a fonte do corpo (Hind) como
 * padrão. O RN não herda `fontFamily` do pai e `Text.defaultProps` não funciona
 * mais, então sem isto todo texto sem classe `font-*` cai no Roboto do sistema.
 *
 * O padrão (`font-sans`) só entra quando a instância NÃO escolheu uma fonte:
 * o Tailwind ordena as utilitárias de `font-*` por nome, então `font-sans`
 * atropelaria `font-display-bold`/`font-mono` se as duas viessem juntas.
 */
export default function Text({ className, ...rest }: TextProps & { className?: string }): React.ReactElement {
  const cls = className ?? '';
  return <RNText {...rest} className={/\bfont-/.test(cls) ? cls : `font-sans ${cls}`} />;
}
