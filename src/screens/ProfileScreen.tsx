import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import Text from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CategoryStat } from '../types';
import { ProfileResponse, LookResponse, CategoryAffinityResponse, BodyProfileResponse } from '../types/api';
import { getProfile, getTopStyles, getTopCategories } from '../utils/algorithm';
import { fetchSavedLooks } from '../lib/wardrobe';
import { fetchCategoryAffinity } from '../lib/categories';
import { fetchBodyProfile } from '../lib/bodyProfile';
import { updateMyProfile } from '../lib/profile';
import { enviarFoto, erroDeUpload, escolherFotos } from '../lib/media';
import api from '../lib/api';
import { supabase } from '../lib/supabase';
import { colors } from '../theme/colors';
import { MeterBar, SectionHeader, SectionTitle, MenuButton } from '../components/PanelKit';
import Button from '../components/Button';
import PecaFoto from '../components/PecaFoto';
import { refDaPeca } from '../components/PecaRow';

const { width } = Dimensions.get('window');
/** Retrato da ficha: pouco menos da metade da largura, em proporção de retrato. */
const RETRATO_L = Math.round((width - 48) * 0.46);
const RETRATO_A = Math.round(RETRATO_L * 1.4);

/** Quantas categorias o DNA mostra. Acima de ~7 classes o olho para de comparar. */
const MAX_CATEGORIAS = 5;
/** Peças na coleção antes de mandar o usuário para a tela de salvos. */
const MAX_VITRINE = 8;

/** Idade em anos a partir de `birth_date` (YYYY-MM-DD); null se não houver. */
function idadeEm(birth: string | null | undefined): number | null {
  if (!birth) return null;
  const [a, m, d] = birth.split('-').map(Number);
  if (!a || !m || !d) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - a;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) idade -= 1;
  return idade >= 0 ? idade : null;
}

/** "68.5" → "68,5". */
function decimalBR(n: number | null | undefined, unidade: string): string {
  if (n == null) return '—';
  return `${String(n).replace('.', ',')} ${unidade}`;
}

/** Linha de ficha técnica: rótulo, linha pontilhada, valor em serifa. */
function FichaRow({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <View className="flex-row items-end min-h-12 py-2">
      <Text className="text-ink-3 text-base font-sans-semibold">{label}</Text>
      <View className="flex-1 mx-2 mb-2 border-b border-dotted border-ink-5" />
      <Text className="text-ink text-xl font-display-bold">{value}</Text>
    </View>
  );
}

/**
 * Perfil como ficha de modelo de catálogo: retrato emoldurado, nome em serifa,
 * código da ficha e as medidas (altura, peso, idade) como ficha técnica. Embaixo,
 * a coleção (peças salvas) e o gosto de estilo.
 *
 * O "DNA de estilo" (tags/categorias) roda sobre o motor de gosto local
 * (utils/algorithm.ts) porque o backend não carrega esses atributos no look
 * hoje — é uma decisão em aberto (tags manuais x embeddings), não um bug
 * daqui. Nome, foto, medidas e coleção vêm da API (`/profiles/me`,
 * `/body-profile/me`, `/saved-looks`), cada um numa chamada independente: uma
 * falha isolada só afeta aquele pedaço.
 */
export default function ProfileScreen(): React.ReactElement {
  const [topStyles, setTopStyles] = useState<string[]>([]);
  const [topCategories, setTopCategories] = useState<CategoryStat[]>([]);
  const [account, setAccount] = useState<ProfileResponse | null>(null);
  const [accountError, setAccountError] = useState(false);
  const [body, setBody] = useState<BodyProfileResponse | null>(null);
  const [vitrine, setVitrine] = useState<LookResponse[]>([]);
  const [affinity, setAffinity] = useState<CategoryAffinityResponse[]>([]);
  const [trocandoFoto, setTrocandoFoto] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const loadAccount = useCallback(async () => {
    try {
      const { data } = await api.get<ProfileResponse>('/profiles/me');
      setAccount(data);
      setAccountError(false);
    } catch {
      setAccountError(true);
    }
  }, []);

  /** Escolhe uma foto de retrato, envia e grava como avatar do perfil. */
  const trocarFoto = async () => {
    try {
      const [foto] = await escolherFotos({ max: 1, recortar: [3, 4] });
      if (!foto) return;
      setTrocandoFoto(true);
      const url = await enviarFoto(foto);
      setAccount(await updateMyProfile({ avatar_url: url }));
    } catch (e) {
      Alert.alert('Foto de perfil', erroDeUpload(e));
    } finally {
      setTrocandoFoto(false);
    }
  };

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
        setTopStyles(getTopStyles(prof, 4));
        setTopCategories(getTopCategories(prof));
      })();

      loadAccount();
      fetchBodyProfile().then(setBody).catch(() => {});
      fetchSavedLooks().then(setVitrine).catch(() => {});
      fetchCategoryAffinity().then(setAffinity).catch(() => {});
    }, [loadAccount]),
  );

  // Preferir o placar real (curtir/salvar no backend) sobre o motor local —
  // este só existe como fallback para quem ainda não gerou sinal no servidor.
  const afinidadePositiva = affinity.filter((a) => a.score > 0);
  const totalAfinidade = afinidadePositiva.reduce((soma, a) => soma + a.score, 0);
  const categoriasReais: CategoryStat[] = afinidadePositiva
    .sort((a, b) => b.score - a.score)
    .map((a) => ({ cat: a.category_name, pct: Math.round((a.score / totalAfinidade) * 100) }));
  const categorias = (categoriasReais.length > 0 ? categoriasReais : topCategories).slice(0, MAX_CATEGORIAS);

  const nomeExibido = account?.full_name || account?.username || 'Seu perfil';
  const idade = idadeEm(account?.birth_date);
  const semMedidas = !body || (body.height_cm == null && body.weight_kg == null && !body.measurements);

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

        {/* ── Cabeçalho da ficha. A barra de status fica dentro do SafeAreaView. ── */}
        <SafeAreaView edges={['top']} className="bg-background">
          <View className="flex-row items-center justify-between px-5 min-h-16 py-2">
            <Text className="text-ink text-2xl font-display-bold">Ficha de modelo</Text>
            <Button
              variant="icon"
              icon="camera"
              accessibilityLabel="Trocar foto"
              onPress={trocarFoto}
              loading={trocandoFoto}
            />
          </View>
          <View className="h-[5px] border-t-2 border-b border-ink" />
        </SafeAreaView>

        {/* ── Retrato + identificação ── */}
        <View className="flex-row px-4 mt-5 gap-4">
          <View style={{ width: RETRATO_L }}>
            <View className="border-2 border-seal p-1 bg-surface">
              <View className="border border-ink overflow-hidden bg-surface-3" style={{ height: RETRATO_A }}>
                {account?.avatar_url ? (
                  <Image source={{ uri: account.avatar_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Ionicons name="person" size={RETRATO_L * 0.5} color={colors.ink[6]} />
                  </View>
                )}
              </View>
            </View>

            {/* Selo pousado no canto do retrato: tamanho da coleção */}
            <View
              pointerEvents="none"
              className="absolute -bottom-4 -right-3 w-20 h-20 rounded-full bg-seal border-2 border-surface items-center justify-center"
              style={{ transform: [{ rotate: '-8deg' }] }}
            >
              <Text className="text-white text-xs font-sans-semibold">coleção</Text>
              <Text className="text-white text-2xl font-display-black">{vitrine.length}</Text>
            </View>
          </View>

          <View className="flex-1 pt-1">
            <Text className="text-ink text-3xl font-display-bold" numberOfLines={3}>
              {nomeExibido}
            </Text>
            {account?.username ? (
              <Text className="text-ink-3 text-lg font-display-italic mt-1" numberOfLines={1}>
                @{account.username}
              </Text>
            ) : (
              <Text className="text-ink-3 text-lg font-display-italic mt-1">Membro Lookly</Text>
            )}
            {account?.id ? <Text className="text-ink-4 text-sm font-mono mt-2">{refDaPeca(account.id).replace('Ref.', 'Ficha')}</Text> : null}
            {account?.bio ? (
              <Text className="text-ink-2 text-base font-display-italic leading-6 mt-3" numberOfLines={5}>
                {account.bio}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Se /profiles/me falhar, deixa isso visível em vez de fingir que
            "Seu perfil" é o dado de verdade. */}
        {accountError && (
          <TouchableOpacity
            onPress={loadAccount}
            accessibilityRole="button"
            className="mx-4 mt-6 bg-danger rounded-card p-3 min-h-12 flex-row items-center gap-3"
          >
            <Ionicons name="cloud-offline-outline" size={22} color={colors.white} />
            <Text className="text-white text-sm font-sans-semibold flex-1">
              Não foi possível carregar seus dados do servidor. Toque para tentar de novo.
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Ficha técnica: as medidas da modelo (GET /api/body-profile/me) ── */}
        <View className="mt-9">
          <SectionHeader title="Ficha técnica" actionLabel="Editar" onAction={() => navigation.navigate('BodyProfile')} />
          <View className="mx-4 bg-surface rounded-card border border-surface-5 px-4 py-1">
            <FichaRow label="Idade" value={idade != null ? `${idade} anos` : '—'} />
            <View className="border-t border-surface-5" />
            <FichaRow label="Altura" value={decimalBR(body?.height_cm, 'cm')} />
            <View className="border-t border-surface-5" />
            <FichaRow label="Peso" value={decimalBR(body?.weight_kg, 'kg')} />
            {body?.measurements ? (
              <>
                <View className="border-t border-surface-5" />
                <View className="py-3">
                  <Text className="text-ink-3 text-base font-sans-semibold">Medidas</Text>
                  <Text className="text-ink text-lg font-display-italic mt-1">{body.measurements}</Text>
                </View>
              </>
            ) : null}
          </View>
          {semMedidas ? (
            <View className="mx-4 mt-3">
              <Button variant="secondary" label="Preencher minhas medidas" icon="create-outline" onPress={() => navigation.navigate('BodyProfile')} />
            </View>
          ) : null}
        </View>

        {/* ── Coleção: as peças que a pessoa salvou (GET /api/saved-looks) ── */}
        <View className="mt-6">
          <SectionHeader
            title="Minha coleção"
            actionLabel={vitrine.length > 0 ? 'Ver tudo' : undefined}
            onAction={() => navigation.navigate('Salvos')}
          />
          {vitrine.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            >
              {vitrine.slice(0, MAX_VITRINE).map((peca) => (
                <TouchableOpacity
                  key={peca.id}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('Salvos')}
                  accessibilityRole="button"
                  accessibilityLabel={`${peca.name}. Ver coleção`}
                  className="w-28"
                >
                  <View className="p-1 border border-ink bg-surface">
                    <PecaFoto uri={peca.photos[0]} compact className="w-full h-36" />
                  </View>
                  <Text className="text-ink text-base font-display-bold mt-1.5" numberOfLines={1}>
                    {peca.name}
                  </Text>
                  <Text className="text-ink-4 text-xs font-mono">{refDaPeca(peca.id)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text className="text-ink-3 text-lg font-display-italic px-5">
              Salve peças no catálogo para montar sua coleção.
            </Text>
          )}
        </View>

        {/* ── Estilo ── */}
        <View className="mt-6">
          <SectionHeader title="DNA de estilo" />

          <View className="mx-4 bg-surface rounded-card border border-surface-5 p-5">
            {topStyles.length > 0 && (
              <View className="flex-row flex-wrap gap-2 mb-5">
                {topStyles.map((style) => (
                  <View key={style} className="bg-ink px-3 h-9 rounded-lg justify-center">
                    <Text className="text-white text-sm capitalize font-sans-bold">{style}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Distribuição por categoria.
                Uma cor só para todas as barras: as categorias são nominais, então
                pintar por tamanho apenas repetiria o que o comprimento já diz. */}
            {categorias.length > 0 ? (
              <>
                <Text className="text-ink-3 text-lg font-display-italic mb-3">
                  Onde seu gosto se concentra
                </Text>
                {categorias.map((cat) => (
                  <MeterBar key={cat.cat} label={cat.cat} pct={cat.pct} />
                ))}
              </>
            ) : (
              <Text className="text-ink-4 text-base">
                Deslize no catálogo para revelar seus estilos e categorias favoritos.
              </Text>
            )}
          </View>
        </View>

        {/* ── Menu ── */}
        <View className="px-4 mt-6 gap-y-3">
          <SectionTitle title="Minhas atividades" />

          <MenuButton
            icon="bookmark-outline"
            label="Peças salvas"
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
            label="Meus pedidos"
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

          <SectionTitle title="Preferências do app" />

          <MenuButton
            icon="options-outline"
            label="Ajustar tamanhos e medidas"
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
