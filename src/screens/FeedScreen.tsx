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
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { InteractionType } from '../types';
import { LookResponse, CategoryResponse } from '../types/api';
import { fetchFeed, sendSwipe, saveLook } from '../lib/feed';
import { fetchCategories } from '../lib/categories';
import { formatarMoeda, formatarNumero } from '../utils/format';
import Toast from '../components/Toast';
import ProductDetailSheet from '../components/ProductDetailSheet';
import { Ionicons } from '@expo/vector-icons';
import { colors, PHOTO_SCRIM } from '../theme/colors';
import { SwipeActionButton, SwipeStamp } from '../components/SwipeAction';
import Button from '../components/Button';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = 90;
/** Abaixo disso na fila, busca a próxima página. */
const REFILL_AT = 5;

// ─── Main component ───────────────────────────────────────────────────────────

export default function FeedScreen(): React.ReactElement {
  const [queue, setQueue] = useState<LookResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [detailLook, setDetailLook] = useState<LookResponse | null>(null);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // ── Animation refs ────────────────────────────────────────────────────────
  const position = useRef(new Animated.ValueXY()).current;

  // Mutable refs for PanResponder (avoids stale-closure issues)
  const queueRef = useRef<LookResponse[]>([]);
  const isAnimating = useRef(false);
  // Cursor de paginação e controle de "tem mais / já buscando".
  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  // Categoria ativa em ref: o panResponder e o refill (advanceQueue) precisam
  // sempre ler o valor atual, não o capturado na criação do callback.
  const selectedCategoryRef = useRef<string | null>(null);
  // Indirection ref so the panResponder (created once) always calls the
  // latest version of handleAction without re-creating itself.
  const handleActionRef = useRef<((type: InteractionType) => Promise<void>) | undefined>(undefined);

  // ── Toast ─────────────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  }, []);

  // ── Load / refill feed ────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    cursorRef.current = null;
    hasMoreRef.current = true;
    try {
      const res = await fetchFeed(null, selectedCategoryRef.current ?? undefined);
      cursorRef.current = res.next_cursor;
      if (!res.next_cursor) hasMoreRef.current = false;
      queueRef.current = res.items;
      setQueue(res.items);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Categorias reais (GET /api/categories) — buscadas uma vez, não dependem do feed.
  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  // Trocar de categoria é uma consulta nova: reseta fila/cursor, não um filtro
  // aplicado sobre o que já está na tela.
  const selectCategory = useCallback((slug: string | null) => {
    setSelectedCategory(slug);
    selectedCategoryRef.current = slug;
    loadData();
  }, [loadData]);

  // ── Advance queue after swipe completes ───────────────────────────────────

  const advanceQueue = useCallback(async () => {
    position.setValue({ x: 0, y: 0 });

    const remaining = queueRef.current.slice(1);
    queueRef.current = remaining;
    setQueue([...remaining]);
    isAnimating.current = false;

    // Prefetch quando a fila afina (o backend já exclui looks vistos).
    if (remaining.length < REFILL_AT && hasMoreRef.current && !loadingMoreRef.current) {
      loadingMoreRef.current = true;
      try {
        const res = await fetchFeed(cursorRef.current, selectedCategoryRef.current ?? undefined);
        cursorRef.current = res.next_cursor;
        if (!res.next_cursor || res.items.length === 0) hasMoreRef.current = false;
        const combined = [...queueRef.current, ...res.items];
        queueRef.current = combined;
        setQueue([...combined]);
      } catch {
        // silencioso: o usuário ainda tem a fila atual; tenta de novo no próximo swipe
      } finally {
        loadingMoreRef.current = false;
      }
    }
  }, [position]);

  // ── Interaction handler ───────────────────────────────────────────────────

  const handleAction = useCallback(async (type: InteractionType) => {
    if (isAnimating.current || queueRef.current.length === 0) return;
    isAnimating.current = true;

    const current = queueRef.current[0];

    // Rede otimista: registra em segundo plano, não trava a animação.
    // v2: RIGHT = curtir; salvar é gesto à parte (e implica curtir para sair do feed).
    (async () => {
      try {
        if (type === 'skip') {
          await sendSwipe(current.id, 'LEFT');
        } else if (type === 'like') {
          await sendSwipe(current.id, 'RIGHT');
        } else {
          await saveLook(current.id);
          await sendSwipe(current.id, 'RIGHT');
        }
      } catch {
        showToast('Sem conexão com o servidor');
      }
    })();

    if (type === 'save') {
      showToast('Salvo nos favoritos');
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

  handleActionRef.current = handleAction;

  // ── PanResponder (created once) ───────────────────────────────────────────

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isAnimating.current,
      onMoveShouldSetPanResponder: (_, g) =>
        !isAnimating.current && (Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4),
      onPanResponderMove: (_, g) => {
        if (isAnimating.current) return;
        position.setValue({ x: g.dx, y: g.dy * 0.1 });
      },
      onPanResponderRelease: (_, g) => {
        if (isAnimating.current) return;

        if (g.dx > SWIPE_THRESHOLD) {
          handleActionRef.current?.('like');
        } else if (g.dx < -SWIPE_THRESHOLD) {
          handleActionRef.current?.('skip');
        } else if (g.dy < -80 && queueRef.current[0]) {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
          setDetailLook(queueRef.current[0]);
        } else {
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

  const current = queue[0];

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={colors.brand.DEFAULT} size="large" />
        <Text className="text-ink-4 mt-3 text-sm">Carregando peças para você...</Text>
      </View>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────

  if (error) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-10">
        <View className="w-16 h-16 rounded-full bg-danger/10 items-center justify-center mb-4">
          <Ionicons name="cloud-offline-outline" size={30} color={colors.danger} />
        </View>
        <Text className="text-ink text-xl font-bold text-center">Não foi possível carregar</Text>
        <Text className="text-ink-4 text-sm text-center mt-2 leading-6">
          Verifique sua conexão e se você está logado. O feed precisa do servidor.
        </Text>
        <View className="mt-6 self-stretch">
          <Button variant="primary" label="Tentar de novo" onPress={loadData} />
        </View>
      </View>
    );
  }

  // ── Empty / exhausted feed ────────────────────────────────────────────────

  if (!current) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-10">
        <Text className="text-4xl">✨</Text>
        <Text className="text-ink text-xl font-bold mt-3">Você viu tudo!</Text>
        <Text className="text-ink-4 text-sm text-center mt-2 leading-6">
          Não há mais peças novas por agora. Volte mais tarde.
        </Text>
        <View className="mt-6 self-stretch">
          <Button variant="secondary" label="Atualizar" onPress={loadData} />
        </View>
      </View>
    );
  }

  // ── Main feed ─────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

     {/* Header */}
      <SafeAreaView>
        <View className="flex-row items-center justify-between px-5 pt-2 pb-2">
          <Text className="text-ink text-2xl font-bold tracking-tight">
            Lookly
          </Text>
          <TouchableOpacity
            onPress={() => setDetailLook(current)}
            className="w-9 h-9 rounded-full bg-surface border border-surface-4 items-center justify-center"
          >
            <Ionicons name="information-circle-outline" size={22} color={colors.ink[4]} />
          </TouchableOpacity>
        </View>

        {/* Categorias reais (GET /api/categories) — filtro opcional do feed */}
        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 4 }}
          >
            <TouchableOpacity
              onPress={() => selectCategory(null)}
              activeOpacity={0.8}
              className={`px-4 py-2 rounded-full border ${
                selectedCategory === null ? 'bg-brand border-brand' : 'bg-surface border-surface-4'
              }`}
            >
              <Text className={`text-xs font-bold ${selectedCategory === null ? 'text-white' : 'text-ink-4'}`}>
                Todas
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => selectCategory(cat.slug === selectedCategory ? null : cat.slug)}
                activeOpacity={0.8}
                className={`px-4 py-2 rounded-full border ${
                  selectedCategory === cat.slug ? 'bg-brand border-brand' : 'bg-surface border-surface-4'
                }`}
              >
                <Text className={`text-xs font-bold ${selectedCategory === cat.slug ? 'text-white' : 'text-ink-4'}`}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Card area */}
      <View className="flex-1 items-center justify-center px-3 pb-4">

        {/* Peek card behind — slightly scaled down */}
        {queue[1]?.photos?.[0] && (
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
              source={{ uri: queue[1].photos[0] }}
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
            backgroundColor: colors.surface[4],
            shadowColor: colors.ink.DEFAULT,
            shadowOpacity: 0.16,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { rotate },
            ],
          }}
          {...panResponder.panHandlers}
        >
          <Image
            source={{ uri: current.photos[0] }}
            style={{ position: 'absolute', width: '100%', height: '100%' }}
            resizeMode="cover"
          />

          {/* Selos de arrasto — a tela anima a opacidade, a aparência mora no componente */}
          <Animated.View style={{ opacity: likeOpacity }} className="absolute top-11 left-4">
            <SwipeStamp action="like" />
          </Animated.View>

          <Animated.View style={{ opacity: skipOpacity }} className="absolute top-11 right-4">
            <SwipeStamp action="skip" />
          </Animated.View>

          {/* Info gradient */}
          <LinearGradient
            colors={[...PHOTO_SCRIM]}
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
            <Text className="text-white text-2xl font-bold mb-1">
              {current.name}
            </Text>
            {current.price != null && (
              // brand-light, não brand: o preço fica sobre o véu escuro da foto
              <Text className="text-brand-light text-lg font-bold mb-2">
                {formatarMoeda(current.price, true)}
              </Text>
            )}
            {current.likes_count > 0 && (
              <View className="flex-row items-center gap-1">
                <Ionicons name="heart" size={13} color={colors.brand.light} />
                <Text className="text-white/70 text-xs">
                  {formatarNumero(current.likes_count)} curtidas
                </Text>
              </View>
            )}
          </LinearGradient>

          {/* Ações do swipe */}
          <View className="absolute right-3.5 bottom-7 gap-3">
            <SwipeActionButton action="like" onPress={handleAction} />
            <SwipeActionButton action="skip" onPress={handleAction} />
            <SwipeActionButton action="save" onPress={handleAction} />
          </View>

          {/* Swipe-up hint */}
          <TouchableOpacity
            className="absolute bottom-2.5 self-center"
            onPress={() => setDetailLook(current)}
          >
            <Text className="text-white/60 text-xs">↑  ver detalhes</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Toast message={toastMsg} visible={toastVisible} />

      <ProductDetailSheet
        look={detailLook}
        onClose={() => setDetailLook(null)}
        onSave={() => {
          setDetailLook(null);
          handleAction('save');
        }}
      />
    </View>
  );
}
