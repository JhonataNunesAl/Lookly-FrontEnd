import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StatusBar, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { UserProfile, CategoryStat } from '../types';
import { ProfileResponse, LookResponse, CategoryAffinityResponse } from '../types/api';
import { getProfile, getTopStyles, getTopCategories } from '../utils/algorithm';
import { fetchSavedLooks } from '../lib/wardrobe';
import { fetchCategoryAffinity } from '../lib/categories';
import api from '../lib/api';
import { supabase } from '../lib/supabase';
import { colors } from '../theme/colors';
import {
  StatTile, MeterBar, SectionHeader, SectionTitle, MenuButton,
} from '../components/PanelKit';
import Button from '../components/Button';

/** Quantas categorias o DNA mostra. Acima de ~7 classes o olho para de comparar. */
const MAX_CATEGORIAS = 5;
/** Peças na vitrine antes de mandar o usuário para a tela de salvos. */
const MAX_VITRINE = 8;

/**
 * O "DNA de estilo" (tags/categorias) roda sobre o motor de gosto local
 * (utils/algorithm.ts) porque o backend não carrega esses atributos no look
 * hoje — é uma decisão em aberto (tags manuais x embeddings), não um bug
 * daqui. O que ERA um bug: nome, foto e a vitrine de "salvos" vinham
 * hardcoded/do mesmo mock local, mesmo já existindo `GET /api/profiles/me` e
 * `GET /api/saved-looks` com dados reais. Essas duas partes agora usam a API.
 */
export default function ProfileScreen(): React.ReactElement {
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(null);
  const [topStyles, setTopStyles] = useState<string[]>([]);
  const [topCategories, setTopCategories] = useState<CategoryStat[]>([]);
  const [account, setAccount] = useState<ProfileResponse | null>(null);
  const [accountError, setAccountError] = useState(false);
  const [vitrine, setVitrine] = useState<LookResponse[]>([]);
  const [affinity, setAffinity] = useState<CategoryAffinityResponse[]>([]);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  // Três chamadas independentes, de propósito — antes eram um Promise.all
  // só, então se QUALQUER uma falhasse (ex.: afinidade), a conta e a vitrine
  // também ficavam null/vazias e a tela toda caía pro fallback local (foto
  // de estoque, "Membro Lookly", botão de virar loja sumindo porque `account`
  // nunca chegava a existir). Uma falha isolada agora só afeta aquele pedaço.
  const loadAccount = useCallback(async () => {
    try {
      const { data } = await api.get<ProfileResponse>('/profiles/me');
      setAccount(data);
      setAccountError(false);
    } catch {
      setAccountError(true);
    }
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // reset, não navigate — não pode deixar as tabs no histórico de "voltar"
    // depois de deslogar.
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const prof = await getProfile();
        setLocalProfile(prof);
        setTopStyles(getTopStyles(prof, 4));
        setTopCategories(getTopCategories(prof));
      })();

      loadAccount();
      fetchSavedLooks().then(setVitrine).catch(() => {});
      fetchCategoryAffinity().then(setAffinity).catch(() => {});
    }, [loadAccount]),
  );

  // Desbloqueia a tela por qualquer sinal real de uso — interações locais
  // (busca) OU peças salvas de verdade (feed). Antes só o mock local contava,
  // então quem só usava o feed real nunca via o próprio perfil.
  const hasData = (localProfile?.interactions ?? 0) >= 5 || vitrine.length > 0;

  if (!hasData) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-10">
        <View className="w-20 h-20 rounded-full bg-brand/10 items-center justify-center mb-6">
          <Ionicons name="sparkles-outline" size={32} color={colors.brand.DEFAULT} />
        </View>
        <Text className="text-ink text-xl font-bold text-center">Defina seu DNA Fashion</Text>
        <Text className="text-ink-4 text-sm text-center mt-3 leading-6">
          Deslize no feed para que possamos mapear seus estilos favoritos e criar seu perfil personalizado.
        </Text>
        <View className="mt-8 self-stretch">
          <Button variant="primary" label="Começar a explorar" onPress={() => navigation.navigate('Feed')} />
        </View>
      </View>
    );
  }

  // Preferir o placar real (curtir/salvar no backend) sobre o motor local —
  // este só existe como fallback para quem ainda não gerou sinal no servidor.
  const afinidadePositiva = affinity.filter((a) => a.score > 0);
  const totalAfinidade = afinidadePositiva.reduce((soma, a) => soma + a.score, 0);
  const categoriasReais: CategoryStat[] = afinidadePositiva
    .sort((a, b) => b.score - a.score)
    .map((a) => ({ cat: a.category_name, pct: Math.round((a.score / totalAfinidade) * 100) }));
  const categorias = (categoriasReais.length > 0 ? categoriasReais : topCategories).slice(0, MAX_CATEGORIAS);
  const nomeExibido = account?.full_name || account?.username || 'Seu perfil';
  const subtitulo = account?.username ? `@${account.username}` : 'Membro Lookly';

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* ── Cartão de identidade ──
            Bloco de tinta sobre o creme: é o único elemento escuro da tela, então
            a pessoa vira o ponto de atenção — a lógica de "vitrine". */}
        <View className="mx-4 mt-4 rounded-hero bg-ink p-6">
          <View className="flex-row items-center gap-4">
            <View className="relative">
              <Image
                source={{
                  uri: account?.avatar_url
                    ?? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
                }}
                className="w-20 h-20 rounded-3xl"
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Trocar foto"
                onPress={() => navigation.navigate('ComingSoon', {
                  title: 'Trocar foto',
                  description: 'Upload de imagem ainda não existe no app — precisa de um seletor de foto e um bucket de armazenamento.',
                  icon: 'camera-outline',
                })}
                className="absolute -bottom-1 -right-1 bg-brand w-8 h-8 rounded-full items-center justify-center border-2 border-ink"
              >
                <Ionicons name="camera" size={15} color={colors.white} />
              </TouchableOpacity>
            </View>

            <View className="flex-1">
              <Text className="text-background text-2xl font-bold" numberOfLines={1}>
                {nomeExibido}
              </Text>
              <Text className="text-ink-6 text-xs mt-0.5">{subtitulo}</Text>
            </View>
          </View>

          {/* KPI row — três números-chave, não um gráfico */}
          <View className="flex-row gap-3 mt-6">
            <StatTile value={localProfile?.interactions ?? 0} label="Vistos" />
            <StatTile value={vitrine.length} label="Salvos" />
            <StatTile value={topStyles.length} label="Estilos" />
          </View>
        </View>

        {/* Se /profiles/me falhar, deixa isso visível em vez de fingir que
            "Seu perfil" + foto de estoque são os dados de verdade. */}
        {accountError && (
          <TouchableOpacity
            onPress={loadAccount}
            className="mx-4 mt-3 bg-danger/10 border border-danger/25 rounded-2xl p-3 flex-row items-center gap-2"
          >
            <Ionicons name="cloud-offline-outline" size={16} color={colors.danger} />
            <Text className="text-danger text-xs flex-1">
              Não foi possível carregar seus dados do servidor. Toque para tentar de novo.
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Vitrine: as peças que a pessoa salvou de verdade (GET /api/saved-looks) ── */}
        {vitrine.length > 0 && (
          <View className="mt-8">
            <SectionHeader
              title="Sua vitrine"
              actionLabel="Ver tudo"
              onAction={() => navigation.navigate('Salvos')}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            >
              {vitrine.slice(0, MAX_VITRINE).map((peca) => (
                <TouchableOpacity
                  key={peca.id}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('Salvos')}
                  className="w-24"
                >
                  <Image
                    source={{ uri: peca.photos[0] }}
                    className="w-24 h-32 rounded-2xl bg-surface-4"
                    resizeMode="cover"
                  />
                  <Text className="text-ink-4 text-2xs mt-1.5" numberOfLines={1}>
                    {peca.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── DNA de Estilo ── */}
        <View className="mt-8">
          <SectionHeader title="DNA de Estilo" />

          <View className="mx-4 bg-surface border border-surface-4 rounded-card p-5">
            {/* Estilos preferidos */}
            <View className="flex-row flex-wrap gap-2 mb-5">
              {topStyles.map((style) => (
                <View
                  key={style}
                  className="bg-brand/10 border border-brand/25 px-3.5 py-1.5 rounded-full"
                >
                  <Text className="text-brand text-xs capitalize font-bold">{style}</Text>
                </View>
              ))}
            </View>

            {/* Distribuição por categoria.
                Uma cor só para todas as barras: as categorias são nominais, então
                pintar por tamanho apenas repetiria o que o comprimento já diz. */}
            {categorias.length > 0 ? (
              <>
                <Text className="text-ink-5 text-2xs font-bold uppercase tracking-widest mb-3">
                  Onde seu gosto se concentra
                </Text>
                {categorias.map((cat) => (
                  <MeterBar key={cat.cat} label={cat.cat} pct={cat.pct} />
                ))}
              </>
            ) : (
              <Text className="text-ink-4 text-xs">
                Continue deslizando para revelar suas categorias favoritas.
              </Text>
            )}
          </View>
        </View>

        {/* ── Menu ── */}
        <View className="px-4 mt-8 gap-y-3">
          <SectionTitle title="Minhas Atividades" />

          <MenuButton
            icon="bookmark-outline"
            label="Peças Salvas"
            onPress={() => navigation.navigate('Salvos')}
            badge={vitrine.length}
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

          {/* Só aparece pra quem ainda não tem loja — is_seller vem do servidor
              (GET /api/profiles/me), nunca de uma escolha do cliente. */}
          {account && !account.is_seller && (
            <>
              <SectionTitle title="Vender no Lookly" />
              <MenuButton
                icon="storefront-outline"
                label="Criar minha loja"
                onPress={() => navigation.navigate('CreateStore')}
              />
            </>
          )}

          <SectionTitle title="Preferências do App" />

          <MenuButton
            icon="options-outline"
            label="Ajustar Tamanhos e Medidas"
            onPress={() => navigation.navigate('BodyProfile')}
          />

          <View className="mt-4">
            <Button variant="danger" label="Sair da conta" icon="log-out-outline" onPress={handleLogout} />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
