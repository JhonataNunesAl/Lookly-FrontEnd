import { Dimensions, Platform } from 'react-native';

/**
 * No site o Lookly roda numa "coluna de celular" centralizada (ver App.tsx), igual
 * ao app. As telas medem a largura com `Dimensions.get('window')` ao carregar; num
 * monitor largo isso dava 1900px e esticava fotos e cards. Aqui a largura que as
 * telas enxergam fica limitada à da coluna. Precisa ser importado ANTES das telas.
 */
export const LARGURA_MAX_WEB = 480;

if (Platform.OS === 'web') {
  const original = Dimensions.get.bind(Dimensions);
  Dimensions.get = ((dim: 'window' | 'screen') => {
    const medida = original(dim);
    return { ...medida, width: Math.min(medida.width, LARGURA_MAX_WEB) };
  }) as typeof Dimensions.get;
}
