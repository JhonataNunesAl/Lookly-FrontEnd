import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import {
  View,
  Animated,
  PanResponder,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import Text from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InteractionType } from '../types';
import { LookResponse, CategoryResponse } from '../types/api';
import { fetchFeed, sendSwipe, saveLook } from '../lib/feed';
import { addToCart, mensagemDeErroCarrinho } from '../lib/commerce';
import { fetchCategories } from '../lib/categories';
import { contar, partesDoPreco } from '../utils/format';
import Toast from '../components/Toast';
import PecaFoto from '../components/PecaFoto';
import { refDaPeca } from '../components/PecaRow';
import ProductDetailSheet from '../components/ProductDetailSheet';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { SwipeActionButton, SwipeStamp } from '../components/SwipeAction';
import Button from '../components/Button';

const { width } = Dimensions.get('window');
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
  // Placa de gesto sobre a foto: some no primeiro swipe ou depois de alguns segundos.
  const [dica, setDica] = useState(true);

  // ── Animation refs ────────────────────────────────────────────────────────
  const position = useRef(new Animated.ValueXY()).current;
  // Troca de peça: a faixa de informação entra como painel (opacidade + 10dp).
  const infoAnim = useRef(new Animated.Value(1)).current;

  // Mutable refs for PanResponder (avoids stale-closure issues)
  const queueRef = useRef<LookResponse[]>([]);
  const isAnimating = useRef(false);
  // Cursor de paginação e controle de "tem mais / já buscando".
  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  // Geração do feed: trocar de categoria (ou recarregar) invalida respostas
  // antigas ainda em voo — sem isso, uma página da categoria anterior que chega
  // atrasada era anexada à fila da nova.
  const geracaoRef = useRef(0);
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
    const geracao = ++geracaoRef.current;
    try {
      const res = await fetchFeed(null, selectedCategoryRef.current ?? undefined);
      if (geracao !== geracaoRef.current) return;
      cursorRef.current = res.next_cursor;
      if (!res.next_cursor) hasMoreRef.current = false;
      queueRef.current = res.items;
      setQueue(res.items);
    } catch {
      if (geracao === geracaoRef.current) setError(true);
    } finally {
      if (geracao === geracaoRef.current) setLoading(false);
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
      const geracao = geracaoRef.current;
      try {
        const res = await fetchFeed(cursorRef.current, selectedCategoryRef.current ?? undefined);
        if (geracao !== geracaoRef.current) return;
        cursorRef.current = res.next_cursor;
        if (!res.next_cursor || res.items.length === 0) hasMoreRef.current = false;
        const combined = [...queueRef.current, ...res.items];
        queueRef.current = combined;
        setQueue([...combined]);
      } catch {
        // Com fila sobrando, silencioso: tenta de novo no próximo swipe. Sem
        // nada na fila, "você viu todas as peças" seria mentira — é falha.
        if (geracao === geracaoRef.current && queueRef.current.length === 0) setError(true);
      } finally {
        loadingMoreRef.current = false;
      }
    }
  }, [position]);

  // ── Interaction handler ───────────────────────────────────────────────────

  const handleAction = useCallback(async (type: InteractionType) => {
    if (isAnimating.current || queueRef.current.length === 0) return;
    isAnimating.current = true;
    setDica(false);

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
          // O aviso só aparece depois que o servidor confirmou (antes dizia
          // "Salvo" mesmo quando a chamada falhava).
          showToast('Salvo nos favoritos');
          await sendSwipe(current.id, 'RIGHT').catch(() => {});
        }
      } catch {
        showToast('Sem conexão com o servidor');
      }
    })();

    if (type === 'save') {
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

  // ── Adicionar ao carrinho (via ProductDetailSheet) ────────────────────────

  const handleAddToCart = useCallback(async (look: LookResponse) => {
    try {
      await addToCart({
        lookId: look.id,
        name: look.name,
        photo: look.photos[0] ?? '',
        unitPrice: Number(look.price ?? 0),
        quantity: 1,
      });
      // Fecha o sheet: com ele aberto o toast (mesmo com z-index maior) fica
      // atrás visualmente na área onde os dois se sobrepõem.
      setDetailLook(null);
      showToast('Item adicionado ao carrinho!');
    } catch (e: any) {
      showToast(mensagemDeErroCarrinho(e));
    }
  }, [showToast]);

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
    outputRange: ['-6deg', '0deg', '6deg'],
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
  const nomeCategoria = categories.find((c) => c.id === current?.category_id)?.name;
  const preco = partesDoPreco(current?.price);

  useEffect(() => {
    infoAnim.setValue(0);
    Animated.timing(infoAnim, { toValue: 1, duration: 240, useNativeDriver: true }).start();
  }, [current?.id, infoAnim]);

  useEffect(() => {
    const t = setTimeout(() => setDica(false), 6000);
    return () => clearTimeout(t);
  }, []);

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={colors.ink.DEFAULT} size="large" />
        <Text className="text-ink-4 mt-3 text-sm font-sans-medium">Carregando peças...</Text>
      </View>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────

  if (error) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-8">
        <View className="w-16 h-16 rounded-lg bg-danger items-center justify-center mb-4">
          <Ionicons name="cloud-offline-outline" size={32} color={colors.white} />
        </View>
        <Text className="text-ink text-2xl font-display-bold text-center">Não foi possível carregar</Text>
        <Text className="text-ink-4 text-base text-center mt-2">
          Verifique a conexão e se você está logado. O feed precisa do servidor.
        </Text>
        <View className="mt-6 self-stretch">
          <Button variant="primary" label="Tentar de novo" icon="refresh" onPress={loadData} />
        </View>
      </View>
    );
  }

  // ── Empty / exhausted feed ────────────────────────────────────────────────

  if (!current) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-8">
        <View className="w-16 h-16 rounded-lg bg-ink items-center justify-center mb-4">
          <Ionicons name="checkmark" size={36} color={colors.signal.DEFAULT} />
        </View>
        <Text className="text-ink text-2xl font-display-bold text-center">Você viu todas as peças</Text>
        <Text className="text-ink-4 text-base text-center mt-2">
          Não há peças novas por agora. Volte mais tarde ou escolha outra categoria.
        </Text>
        <View className="mt-6 self-stretch">
          <Button variant="secondary" label="Atualizar" icon="refresh" onPress={loadData} />
        </View>
      </View>
    );
  }

  // ── Main feed ─────────────────────────────────────────────────────────────
  // Uma página de catálogo por peça: cabeçalho de papel com o nome da casa e as
  // categorias, a foto numa moldura vermelha com o selo de preço pousado no
  // canto, a legenda (nome em serifa, código de item, categoria) e três fichas
  // de pedido — passar, curtir, salvar.

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Cabeçalho da página */}
      <SafeAreaView edges={['top']} className="bg-background">
        <View className="flex-row items-center justify-between px-5 h-16">
          <View>
            <Text className="text-ink text-3xl font-display-bold">Lookly</Text>
          </View>
          <TouchableOpacity
            onPress={() => setDetailLook(current)}
            accessibilityRole="button"
            accessibilityLabel="Ver detalhes da peça"
            className="w-12 h-12 rounded-lg bg-ink items-center justify-center"
          >
            <Ionicons name="information" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* Categorias reais (GET /api/categories) — filtro opcional do feed */}
        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 12 }}
          >
            {[{ id: 'todas', slug: null as string | null, name: 'Todas' }, ...categories].map((cat) => {
              const ativa = selectedCategory === cat.slug;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => selectCategory(cat.slug === selectedCategory ? null : cat.slug)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ativa }}
                  className={`min-h-12 px-4 rounded-lg border-2 border-ink justify-center ${ativa ? 'bg-ink' : 'bg-surface'}`}
                >
                  <Text className={`text-sm font-sans-bold ${ativa ? 'text-white' : 'text-ink'}`}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
        <View className="h-[5px] border-t-2 border-b border-ink" />
      </SafeAreaView>

      {/* Página: foto emoldurada + selo de preço */}
      <View className="flex-1 px-4 pt-3">
        <View className="flex-1 border-2 border-seal p-1 bg-surface">
          <View className="flex-1 border border-ink overflow-hidden bg-surface-3">
            {queue[1]?.photos?.[0] && (
              <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}>
                <PecaFoto uri={queue[1].photos[0]} className="flex-1" />
              </View>
            )}

            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                backgroundColor: colors.surface[3],
                transform: [
                  { translateX: position.x },
                  { translateY: position.y },
                  { rotate },
                ],
              }}
              {...panResponder.panHandlers}
            >
              <PecaFoto uri={current.photos[0]} className="flex-1" />

              {/* Carimbos de arrasto — a tela anima a opacidade, a aparência mora no componente */}
              <Animated.View style={{ opacity: likeOpacity }} className="absolute top-6 left-4">
                <SwipeStamp action="like" />
              </Animated.View>

              <Animated.View style={{ opacity: skipOpacity }} className="absolute top-6 right-4">
                <SwipeStamp action="skip" />
              </Animated.View>
            </Animated.View>

            {dica && (
              <View pointerEvents="none" className="absolute bottom-4 left-0 right-0 items-center">
                <View className="flex-row items-center gap-3 bg-surface border-2 border-ink rounded-lg px-4 min-h-12">
                  <Ionicons name="arrow-back" size={20} color={colors.ink.DEFAULT} />
                  <Text className="text-ink text-sm font-sans-bold">Passar</Text>
                  <View className="w-px h-5 bg-ink" />
                  <Text className="text-ink text-sm font-sans-bold">Curtir</Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.seal.DEFAULT} />
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Selo de preço pousado no canto da moldura */}
        <Animated.View
          pointerEvents="none"
          className="absolute -bottom-5 right-6 w-24 h-24 rounded-full bg-seal border-2 border-surface items-center justify-center"
          style={{ opacity: infoAnim, transform: [{ rotate: '-8deg' }] }}
        >
          {preco ? (
            <>
              <Text className="text-white text-xs font-sans-semibold">só R$</Text>
              <Text className="text-white text-xl font-display-black">
                {preco.inteiro},{preco.centavos}
              </Text>
            </>
          ) : (
            <Text className="text-white text-sm font-sans-bold text-center px-2">Sob consulta</Text>
          )}
        </Animated.View>
      </View>

      {/* Legenda: toque abre o detalhe */}
      <Animated.View
        style={{
          opacity: infoAnim,
          transform: [{ translateY: infoAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        }}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setDetailLook(current)}
          accessibilityRole="button"
          accessibilityLabel={`${current.name}. Ver detalhes`}
          className="px-5 pt-4 pb-2 pr-32"
        >
          <Text className="text-ink text-2xl font-display-bold" numberOfLines={2}>
            {current.name}
          </Text>
          <Text className="text-ink-4 text-sm font-mono mt-0.5" numberOfLines={1}>
            {refDaPeca(current.id)}
          </Text>
          <Text className="text-ink-3 text-base font-display-italic" numberOfLines={1}>
            {[nomeCategoria, contar(current.likes_count, 'curtida', 'curtidas')].filter(Boolean).join(' · ')}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Fichas de ação */}
      <View className="flex-row gap-2 px-4 pt-2 pb-3">
        <SwipeActionButton action="skip" onPress={handleAction} />
        <SwipeActionButton action="like" onPress={handleAction} />
        <SwipeActionButton action="save" onPress={handleAction} />
      </View>

      <Toast message={toastMsg} visible={toastVisible} />

      <ProductDetailSheet
        look={detailLook}
        onClose={() => setDetailLook(null)}
        onSave={() => {
          setDetailLook(null);
          handleAction('save');
        }}
        onAddToCart={() => detailLook && handleAddToCart(detailLook)}
      />
    </View>
  );
}
