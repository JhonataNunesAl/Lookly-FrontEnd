import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { UserProfile, CategoryStat } from '../types';
import {
  getProfile,
  resetProfile,
  getTopStyles,
  getTopCategories,
} from '../utils/algorithm';

// ─── Lookup tables ────────────────────────────────────────────────────────────

const STYLE_EMOJI: Record<string, string> = {
  casual: '👟', boho: '🌸', minimalista: '◻️', streetwear: '🧢',
  elegante: '✨', romântico: '🌹', vintage: '📷', preppy: '📚',
  gótico: '🖤', esportivo: '🏃', colorido: '🎨',
};

const CAT_LABEL: Record<string, string> = {
  vestido: 'Vestidos', calça: 'Calças', saia: 'Saias', top: 'Tops',
  blazer: 'Blazers', casaco: 'Casacos', conjunto: 'Conjuntos',
  bermuda: 'Bermudas', short: 'Shorts',
};

interface Stage { label: string; color: string }

const getStage = (n: number): Stage => {
  if (n === 0) return { label: 'Começando', color: '#555' };
  if (n < 10)  return { label: 'Explorando', color: '#fbbf24' };
  if (n < 20)  return { label: 'Aprendendo', color: '#60a5fa' };
  if (n < 50)  return { label: 'Refinando',  color: '#a78bfa' };
  return              { label: 'Expert em moda', color: '#4ade80' };
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileScreen(): React.ReactElement {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [topStyles, setTopStyles] = useState<string[]>([]);
  const [topCategories, setTopCategories] = useState<CategoryStat[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const prof = await getProfile();
        setProfile(prof);
        setTopStyles(getTopStyles(prof, 5));
        setTopCategories(getTopCategories(prof));
      })();
    }, []),
  );

  const handleReset = () => {
    Alert.alert(
      'Resetar perfil',
      'Isso apagará todo o histórico de gosto. Tem certeza?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resetar',
          style: 'destructive',
          onPress: async () => {
            await resetProfile();
            const prof = await getProfile();
            setProfile(prof);
            setTopStyles([]);
            setTopCategories([]);
          },
        },
      ],
    );
  };

  const interactions = profile?.interactions ?? 0;
  const wishlistCount = profile?.wishlist.length ?? 0;
  const progress = Math.min(interactions / 50, 1);
  const stage = getStage(interactions);

  const topBrands = profile
    ? Object.entries(profile.scores.brands)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([brand]) => brand)
    : [];

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <SafeAreaView />

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>

        {/* ── Hero card ── */}
        <View className="mx-4 mt-4 bg-surface rounded-3xl p-6 items-center
                         border border-surface-3">
          <View className="w-16 h-16 rounded-full bg-brand/10 border-2 border-brand/25
                           items-center justify-center mb-3">
            <Text className="text-3xl">👗</Text>
          </View>
          <Text className="text-white text-xl font-bold">Seu Estilo DNA</Text>

          {/* Stage chip — dynamic colour must use inline style */}
          <View
            style={{
              borderColor: `${stage.color}44`,
              backgroundColor: `${stage.color}11`,
            }}
            className="mt-2.5 rounded-full px-4 py-1.5 border"
          >
            <Text style={{ color: stage.color }} className="text-xs font-semibold">
              {stage.label}
            </Text>
          </View>
        </View>

        {/* ── Stats row ── */}
        <View className="flex-row mx-4 mt-3 bg-surface rounded-2xl p-4
                         border border-surface-3">
          {[
            { num: interactions, label: 'interações' },
            { num: wishlistCount, label: 'salvos' },
            { num: topStyles.length, label: 'estilos' },
          ].map(({ num, label }, i) => (
            <React.Fragment key={label}>
              {i > 0 && <View className="w-px bg-surface-4" />}
              <View className="flex-1 items-center">
                <Text className="text-brand text-2xl font-extrabold">{num}</Text>
                <Text className="text-ink-4 text-xs mt-0.5">{label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* ── Learning progress ── */}
        <View className="mx-4 mt-5">
          <Text className="text-white text-base font-bold mb-3">
            Progresso de aprendizado
          </Text>
          <View className="h-2 bg-surface-3 rounded-full">
            <View
              style={{ width: `${progress * 100}%` }}
              className="h-full bg-brand rounded-full"
            />
          </View>
          <Text className="text-ink-6 text-xs mt-2">
            {interactions}/50 interações · {Math.round(progress * 100)}% calibrado
          </Text>
        </View>

        {/* ── Top styles ── */}
        {topStyles.length > 0 && (
          <View className="mx-4 mt-6">
            <Text className="text-white text-base font-bold mb-3">
              Seus estilos favoritos
            </Text>
            <View className="flex-row flex-wrap gap-2.5">
              {topStyles.map((style, i) => (
                <View
                  key={style}
                  className={`items-center rounded-2xl p-3.5 border min-w-[76px]
                    ${i === 0
                      ? 'bg-brand/10 border-brand'
                      : 'bg-surface-2 border-surface-4'
                    }`}
                >
                  <Text style={{ fontSize: i === 0 ? 28 : 22 }}>
                    {STYLE_EMOJI[style] ?? '👔'}
                  </Text>
                  <Text
                    className={`text-xs mt-1.5 capitalize
                      ${i === 0 ? 'text-white font-bold' : 'text-ink-4'}`}
                  >
                    {style}
                  </Text>
                  {i === 0 && (
                    <Text className="text-brand text-2xs font-bold mt-0.5">#1</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Category bars ── */}
        {topCategories.length > 0 && (
          <View className="mx-4 mt-6">
            <Text className="text-white text-base font-bold mb-3">
              Categorias preferidas
            </Text>
            {topCategories.slice(0, 6).map(({ cat, pct }) => (
              <View key={cat} className="flex-row items-center mb-3">
                <Text className="text-ink-4 text-xs w-20">
                  {CAT_LABEL[cat] ?? cat}
                </Text>
                <View className="flex-1 h-1.5 bg-surface-3 rounded-full mx-2.5">
                  <View
                    style={{ width: `${pct}%` }}
                    className="h-full bg-brand rounded-full"
                  />
                </View>
                <Text className="text-brand text-xs font-semibold w-9 text-right">
                  {pct}%
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Top brands ── */}
        {topBrands.length > 0 && (
          <View className="mx-4 mt-6">
            <Text className="text-white text-base font-bold mb-3">
              Marcas que você curte
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {topBrands.map((brand) => (
                <View
                  key={brand}
                  className="bg-surface-2 border border-surface-4 rounded-full px-4 py-2"
                >
                  <Text className="text-ink-2 text-sm">{brand}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Empty state ── */}
        {interactions === 0 && (
          <View className="items-center py-10 px-10">
            <Text className="text-5xl">🧠</Text>
            <Text className="text-white text-lg font-bold mt-3">
              Nenhum dado ainda
            </Text>
            <Text className="text-ink-4 text-sm text-center mt-2 leading-6">
              Interaja com o feed e o algoritmo vai aprender seu gosto!
            </Text>
          </View>
        )}

        {/* ── Reset button ── */}
        {interactions > 0 && (
          <TouchableOpacity
            onPress={handleReset}
            className="mx-6 mt-8 border border-surface-4 rounded-2xl py-3.5 items-center"
          >
            <Text className="text-ink-4 text-sm">🔄  Resetar perfil de gosto</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
