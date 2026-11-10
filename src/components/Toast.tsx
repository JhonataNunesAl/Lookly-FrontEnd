import React, { useEffect, useRef } from 'react';
import {
  Animated,
  View,
} from 'react-native';
import Text from './Text';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface ToastProps {
  message: string;
  visible: boolean;
}

/**
 * Aviso transitório no estilo snackbar do Material, vestido de catálogo: faixa
 * de tinta escura, texto em papel claro e um quadrado vermelho de selo à
 * esquerda. Sobe de baixo (transform + opacidade), acima da barra de navegação.
 */
const Toast: React.FC<ToastProps> = ({ message, visible }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }),
      Animated.spring(translateY, {
        toValue: visible ? 0 : 16,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
    ]).start();
  }, [visible, opacity, translateY]);

  return (
    <Animated.View
      style={{ opacity, transform: [{ translateY }] }}
      className="absolute bottom-28 left-4 right-4 z-50"
      pointerEvents="none"
    >
      <View className="flex-row items-center gap-3 bg-ink rounded-card p-3">
        <View className="w-8 h-8 rounded-md bg-seal items-center justify-center">
          <Ionicons name="information" size={20} color={colors.white} />
        </View>
        <Text className="flex-1 text-white text-sm font-sans-semibold">{message}</Text>
      </View>
    </Animated.View>
  );
}

export default Toast;
