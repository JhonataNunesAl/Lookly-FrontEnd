import React, { useEffect, useRef } from 'react';
import { Animated, Text } from 'react-native';

interface ToastProps {
  message: string;
  visible: boolean;
}

/**
 * Animated toast notification.
 * Uses NativeWind className for layout/colours and Animated API for motion.
 * Animated.View doesn't support className directly, so we inline only the
 * motion-unrelated styles via className on a wrapper Text.
 */
const Toast: React.FC<ToastProps> = ({ message, visible }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const toValue = visible ? 1 : 0;
    const yValue = visible ? 0 : 16;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: yValue,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
    ]).start();
  }, [visible, opacity, translateY]);

  return (
    <Animated.View
      style={{ opacity, transform: [{ translateY }] }}
      className="absolute bottom-24 self-center z-50 bg-surface rounded-full
                 px-5 py-2.5 border border-brand/20"
      pointerEvents="none"
    >
      <Text className="text-brand-light text-sm font-medium">{message}</Text>
    </Animated.View>
  );
};

export default Toast;
