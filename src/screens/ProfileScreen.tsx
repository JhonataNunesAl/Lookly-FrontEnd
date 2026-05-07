import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { UserProfile, CategoryStat } from '../types';
import {
  getProfile, resetProfile,
  getTopStyles, getTopCategories,
} from '../utils/algorithm';
import { LinearGradient } from 'expo-linear-gradient';

const STYLE_EMOJI: Record<string, string> = {
  casual: '👟', boho: '🌸', minimalista: '◻️', streetwear: '🧢',
  elegante: '✨', romântico: '🌹', vintage: '📷', preppy: '📚',
  gótico: '🖤', esportivo: '🏃', colorido: '🎨',
};

export default function ProfileScreen(): React.ReactElement {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [topStyles, setTopStyles] = useState<string[]>([]);
  const [topCategories, setTopCategories] = useState<CategoryStat[]>([]);
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const prof = await getProfile();
        setProfile(prof);
        setTopStyles(getTopStyles(prof, 3)); // Pegamos os 3 principais para o header
        setTopCategories(getTopCategories(prof));
      })();
    }, []),
  );



  const hasData = (profile?.interactions ?? 0) >= 5;

  if (!hasData) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-10">
        <Text className="text-5xl mb-6">✨</Text>
        <Text className="text-white text-xl font-bold text-center">Defina seu DNA Fashion</Text>
        <Text className="text-ink-4 text-sm text-center mt-3 leading-6">
          Deslize no feed para que possamos mapear seus estilos favoritos e criar seu perfil personalizado.
        </Text>
        <TouchableOpacity 
          className="mt-8 bg-brand px-8 py-4 rounded-full"
          onPress={() => navigation.navigate('Feed')}
        >
          <Text className="text-white font-bold">Começar a explorar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="light-content" />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* ── Perfil Topo ── */}
        <View className="items-center pt-12 pb-6">
          <View className="relative">
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200' }}
                className="w-24 h-24 rounded-full border-4 border-background"
              />
            <TouchableOpacity className="absolute bottom-0 right-0 bg-brand w-8 h-8 rounded-full items-center justify-center border-2 border-background">
              <Ionicons name="camera" size={16} color="white" />
            </TouchableOpacity>
          </View>
          
          <Text className="text-white text-2xl font-bold mt-4">Alexia Silva</Text>
          <Text className="text-ink-4 text-sm">Membro Lookly desde 2024</Text>
          
          {/* Status Row */}
          <View className="flex-row mt-6 w-full justify-around px-10">
            <View className="items-center">
              <Text className="text-white font-bold text-lg">{profile?.interactions}</Text>
              <Text className="text-ink-5 text-xs uppercase tracking-widest">Vistos</Text>
            </View>
            <View className="w-[1px] h-8 bg-white/10" />
            <View className="items-center">
              <Text className="text-white font-bold text-lg">{profile?.wishlist.length}</Text>
              <Text className="text-ink-5 text-xs uppercase tracking-widest">Salvos</Text>
            </View>
          </View>
        </View>

        {/* ── DNA Fashion (Chips) ── */}
        <View className="px-5 mb-8">
          <Text className="text-white text-sm font-bold mb-4">Seu DNA Fashion</Text>
          <View className="flex-row flex-wrap gap-2">
            {topStyles.map((style) => (
              <View key={style} className="bg-surface border border-white/5 flex-row items-center px-4 py-2 rounded-full">
                <Text className="mr-2 text-base">{STYLE_EMOJI[style]}</Text>
                <Text className="text-white text-sm capitalize font-medium">{style}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Menu de Ações (Grid ou Lista Organizada) ── */}
        <View className="px-5 gap-y-4">
          
          <SectionTitle title="Minhas Atividades" />
          
          <MenuButton 
            icon="bookmark-outline" 
            label="Peças Salvas" 
            onPress={() => navigation.navigate('Salvos')} 
            badge={profile?.wishlist.length}
          />
          
          <MenuButton 
            icon="bag-handle-outline" 
            label="Carrinho" 
            onPress={() => navigation.navigate('Carrinho')} 
          />

          <MenuButton 
            icon="cube-outline" 
            label="Meus Pedidos" 
            onPress={() => navigation.navigate('Pedidos')} 
          />

          <SectionTitle title="Preferências do App" />

          <MenuButton 
            icon="options-outline" 
            label="Ajustar Tamanhos e Medidas" 
            onPress={() => {}} 
          />

 

          <TouchableOpacity className="mt-6 py-4 items-center">
            <Text className="text-danger font-medium">Sair da conta</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

// ── Sub-componentes para organização ──────────────────────────────────────────

function SectionTitle({ title }: { title: string }) {
  return (
    <Text className="text-ink-5 text-[10px] uppercase tracking-[2px] font-bold mt-4 mb-1 ml-1">
      {title}
    </Text>
  );
}

function MenuButton({ 
  icon, label, onPress, badge, destructive = false 
}: { 
  icon: any, label: string, onPress: () => void, badge?: number, destructive?: boolean 
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center justify-between bg-surface/50 border border-white/5 px-5 py-4 rounded-3xl"
    >
      <View className="flex-row items-center gap-4">
        <View className={`w-10 h-10 rounded-2xl items-center justify-center ${destructive ? 'bg-danger/10' : 'bg-brand/10'}`}>
          <Ionicons name={icon} size={20} color={destructive ? '#ef4444' : '#a78bfa'} />
        </View>
        <Text className={`${destructive ? 'text-danger/80' : 'text-white'} font-medium`}>{label}</Text>
      </View>
      
      <View className="flex-row items-center gap-2">
        {badge ? (
          <View className="bg-brand rounded-full px-2 py-0.5">
            <Text className="text-white text-[10px] font-bold">{badge}</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={16} color="#333" />
      </View>
    </TouchableOpacity>
  );
}