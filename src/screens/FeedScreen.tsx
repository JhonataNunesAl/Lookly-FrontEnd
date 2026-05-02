import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Product, InteractionType } from '../types';
import { getNextProducts, recordInteraction, getProfile } from '../utils/algorithm';
import Toast from '../components/Toast';
import ProductDetailSheet from '../components/ProductDetailSheet';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = 90;

// ─── Main component ───────────────────────────────────────────────────────────

export default function FeedScreen(): React.ReactElement {
  const [queue, setQueue] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [interactions, setInteractions] = useState(0);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  // ── Animation refs ────────────────────────────────────────────────────────
  // position lives in a ref so PanResponder callbacks always access the same
  // Animated.ValueXY without needing it in the dep array.
  const position = useRef(new Animated.ValueXY()).current;

  // Mutable refs for PanResponder (avoids stale-closure issues)
  const queueRef = useRef<Product[]>([]);
  const isAnimating = useRef(false);
  const interactionCountRef = useRef(0);
  // Indirection ref so the panResponder (created once) always calls the
  // latest version of handleAction without re-creating itself.
  const handleActionRef = useRef<(type: InteractionType) => Promise<void>>();

  // ── Toast ─────────────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  }, []);

  // ── Load / refill feed ────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    const [products, profile] = await Promise.all([
      getNextProducts(30),
      getProfile(),
    ]);
    queueRef.current = products;
    setQueue(products);
    setInteractions(profile.interactions);
    interactionCountRef.current = profile.interactions;
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Advance queue after swipe completes ───────────────────────────────────

  const advanceQueue = useCallback(async () => {
    // Reset card position before rendering next item
    position.setValue({ x: 0, y: 0 });

    const remaining = queueRef.current.slice(1);

    if (remaining.length < 5) {
      const more = await getNextProducts(20);
      const combined = [...remaining, ...more];
      queueRef.current = combined;
      setQueue([...combined]);
    } else {
      queueRef.current = remaining;
      setQueue([...remaining]);
    }

    interactionCountRef.current += 1;
    setInteractions(interactionCountRef.current);

    // Milestone toast every 10 interactions
    if (interactionCountRef.current % 10 === 0 && interactionCountRef.current > 0) {
      showToast('Seu perfil de estilo está evoluindo ✨');
    }

    isAnimating.current = false;
  }, [position, showToast]);

  // ── Interaction handler ───────────────────────────────────────────────────

  const handleAction = useCallback(async (type: InteractionType) => {
    if (isAnimating.current || queueRef.current.length === 0) return;
    isAnimating.current = true;

    const current = queueRef.current[0];
    await recordInteraction(current, type);

    if (type === 'save') {
      showToast('Salvo nos favoritos 🔖');
      await advanceQueue();
      return;
    }

    const targetX = type === 'like' ? width * 1.6 : -width * 1.6;

    Animated.timing(position, {
      toValue: { x: targetX, y: 0 },
      duration: 270,
      useNativeDriver: false, // translateX must be false when paired with interpolated rotate
    }).start(() => advanceQueue());
  }, [advanceQueue, position, showToast]);

  // Keep ref current so PanResponder can call it without re-creating
  handleActionRef.current = handleAction;

  // ── PanResponder (created once) ───────────────────────────────────────────

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isAnimating.current,
      onMoveShouldSetPanResponder: (_, g) =>
        !isAnimating.current && (Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4),
      onPanResponderMove: (_, g) => {
        if (isAnimating.current) return;
        // Slight vertical dampening makes horizontal swipe feel more intentional
        position.setValue({ x: g.dx, y: g.dy * 0.1 });
      },
      onPanResponderRelease: (_, g) => {
        if (isAnimating.current) return;

        if (g.dx > SWIPE_THRESHOLD) {
          handleActionRef.current?.('like');
        } else if (g.dx < -SWIPE_THRESHOLD) {
          handleActionRef.current?.('skip');
        } else if (g.dy < -80 && queueRef.current[0]) {
          // Swipe up → open detail sheet
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
          setDetailProduct(queueRef.current[0]);
        } else {
          // Snap back
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: false,
          }).start(() => { isAnimating.current = false; });
        }
      },
    })
  ).current;

  // ── Derived animated values ───────────────────────────────────────────────

  const rotate = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-12deg', '0deg', '12deg'],
  });
  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const skipOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const progress = Math.min(interactions / 50, 1);
  const current = queue[0];

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#a78bfa" size="large" />
        <Text className="text-ink-4 mt-3 text-sm">Carregando peças para você...</Text>
      </View>
    );
  }

  // ── Empty / exhausted feed ────────────────────────────────────────────────

  if (!current) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-10">
        <Text className="text-4xl">✨</Text>
        <Text className="text-white text-xl font-bold mt-3">Você viu tudo!</Text>
        <Text className="text-ink-4 text-sm text-center mt-2 leading-6">
          Atualizando recomendações com base no seu gosto...
        </Text>
        <TouchableOpacity
          onPress={loadData}
          className="mt-6 px-6 py-3 rounded-full border border-brand"
        >
          <Text className="text-brand font-semibold">Ver mais peças</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main feed ─────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Header */}
      <SafeAreaView>
        <View className="flex-row items-start justify-between px-5 pt-2 pb-2">
          <View>
            <Text className="text-white text-2xl font-bold tracking-tight">
              FitFeed
            </Text>
            {/* Progress bar — using inline style for the dynamic width */}
            <View className="h-0.5 w-24 bg-surface-3 rounded-full mt-1.5">
              <View
                style={{ width: `${progress * 100}%` }}
                className="h-full bg-brand rounded-full"
              />
            </View>
          </View>

          <View className="bg-brand/10 border border-brand/20 rounded-full px-3 py-1.5">
            <Text className="text-brand-light text-xs font-semibold">
              {interactions < 20 ? '🌀 explorando...' : '🧠 aprendendo seu gosto'}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Card area */}
      <View className="flex-1 items-center justify-center px-3 pb-4">

        {/* Peek card behind — slightly scaled down */}
        {queue[1] && (
          <View
            style={{
              position: 'absolute',
              width: width - 24,
              height: height * 0.70,
              borderRadius: 22,
              overflow: 'hidden',
              top: 8,
              transform: [{ scale: 0.97 }],
            }}
          >
            <Image
              source={{ uri: queue[1].image }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Main draggable card */}
        <Animated.View
          style={{
            width: width - 24,
            height: height * 0.70,
            borderRadius: 22,
            overflow: 'hidden',
            backgroundColor: '#1a1a1a',
            shadowColor: '#000',
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 12,
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { rotate },
            ],
          }}
          {...panResponder.panHandlers}
        >
          <Image
            source={{ uri: current.image }}
            style={{ position: 'absolute', width: '100%', height: '100%' }}
            resizeMode="cover"
          />

          {/* CURTIU overlay */}
          <Animated.View
            style={{ opacity: likeOpacity }}
            className="absolute top-11 left-4 border-2 border-success
                       bg-success/10 rounded-xl px-4 py-2"
          >
            <Text className="text-white text-lg font-black tracking-wide">
              ❤️ CURTIU
            </Text>
          </Animated.View>

          {/* PASSOU overlay */}
          <Animated.View
            style={{ opacity: skipOpacity }}
            className="absolute top-11 right-4 border-2 border-danger
                       bg-danger/10 rounded-xl px-4 py-2"
          >
            <Text className="text-white text-lg font-black tracking-wide">
              ✕ PASSOU
            </Text>
          </Animated.View>

          {/* Info gradient */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.95)']}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              paddingBottom: 88,
              paddingHorizontal: 18,
              paddingTop: 64,
            }}
          >
            <Text className="text-white/50 text-2xs tracking-widest uppercase mb-1">
              {current.brand}  ·  {current.gender}
            </Text>
            <Text className="text-white text-2xl font-bold mb-1">
              {current.name}
            </Text>
            <Text className="text-brand text-lg font-bold mb-2.5">
              R$ {current.price.toFixed(2)}
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {current.style_tags.map((tag) => (
                <View
                  key={tag}
                  className="bg-white/10 border border-white/15 rounded-full px-2.5 py-0.5"
                >
                  <Text className="text-white/80 text-xs">{tag}</Text>
                </View>
              ))}
              {current.colors.map((color) => (
                <View
                  key={color}
                  className="bg-brand/15 border border-brand/30 rounded-full px-2.5 py-0.5"
                >
                  <Text className="text-brand-light text-xs">{color}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>

          {/* Action buttons */}
          <View className="absolute right-3.5 bottom-7 gap-3">
            <TouchableOpacity
              onPress={() => handleAction('like')}
              className="w-12 h-12 rounded-full bg-white/12 items-center justify-center"
            >
              <Text className="text-2xl">❤️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleAction('skip')}
              className="w-12 h-12 rounded-full bg-white/12 items-center justify-center"
            >
              <Text className="text-white text-xl font-bold">✕</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleAction('save')}
              className="w-12 h-12 rounded-full bg-brand/20 items-center justify-center"
            >
              <Text className="text-xl">🔖</Text>
            </TouchableOpacity>
          </View>

          {/* Swipe-up hint */}
          <TouchableOpacity
            className="absolute bottom-2.5 self-center"
            onPress={() => setDetailProduct(current)}
          >
            <Text className="text-white/30 text-xs">↑  ver detalhes</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Toast message={toastMsg} visible={toastVisible} />

      <ProductDetailSheet
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onSave={() => {
          setDetailProduct(null);
          handleAction('save');
        }}
        onBuy={() => {
          setDetailProduct(null);
          showToast('Adicionado ao carrinho 🛍️');
        }}
      />
    </View>
  );
}
