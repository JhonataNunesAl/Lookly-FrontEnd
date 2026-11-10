import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, TouchableOpacity, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

/**
 * Barra de abas de catálogo: papel claro com filete de tinta no topo e UMA
 * tarja vermelha que desliza até a aba tocada (em vez de aparecer e sumir em
 * cada aba). A tarja se estica no meio do caminho e volta ao tamanho ao chegar
 * — o movimento "aponta" para o destino.
 *
 * Altura = 72dp de conteúdo + a barra de navegação do sistema (0 em gestos,
 * ~48dp nos 3 botões).
 */
export default function CatalogTabBar({ state, descriptors, navigation }: BottomTabBarProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const [largura, setLargura] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const esticar = useRef(new Animated.Value(0)).current;
  const primeiraVez = useRef(true);

  const larguraAba = largura / state.routes.length;
  const larguraTarja = larguraAba * 0.5;

  useEffect(() => {
    if (!largura) return;
    const destino = state.index * larguraAba;
    if (primeiraVez.current) {
      // Sem animar na primeira medição: a tarja já nasce na aba ativa.
      primeiraVez.current = false;
      x.setValue(destino);
      return;
    }
    Animated.parallel([
      Animated.spring(x, { toValue: destino, useNativeDriver: true, tension: 90, friction: 13 }),
      Animated.sequence([
        Animated.timing(esticar, { toValue: 1, duration: 110, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(esticar, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
  }, [state.index, largura, larguraAba, x, esticar]);

  return (
    <View
      onLayout={(e) => setLargura(e.nativeEvent.layout.width)}
      style={{
        backgroundColor: colors.surface.DEFAULT,
        borderTopWidth: 2,
        borderTopColor: colors.ink.DEFAULT,
        height: 72 + insets.bottom,
        paddingBottom: insets.bottom,
        flexDirection: 'row',
      }}
    >
      {/* Tarja vermelha deslizante, por cima do filete de tinta */}
      {largura > 0 && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -2,
            left: larguraAba * 0.25,
            width: larguraTarja,
            height: 5,
            backgroundColor: colors.seal.DEFAULT,
            transform: [
              { translateX: x },
              { scaleX: esticar.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) },
            ],
          }}
        />
      )}

      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focado = state.index === index;

        const aoTocar = () => {
          const evento = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focado && !evento.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focado }}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={aoTocar}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            activeOpacity={0.7}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            {options.tabBarIcon?.({ focused: focado, color: focado ? colors.seal.DEFAULT : colors.ink[4], size: 24 })}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
