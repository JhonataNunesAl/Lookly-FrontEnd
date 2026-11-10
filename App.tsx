import './global.css';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
} from 'react-native';
import Text from './src/components/Text';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { cssInterop } from 'nativewind';
import { createBottomTabNavigator, BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Hind_400Regular,
  Hind_500Medium,
  Hind_600SemiBold,
  Hind_700Bold,
} from '@expo-google-fonts/hind';
import { DMSerifDisplay_400Regular, DMSerifDisplay_400Regular_Italic } from '@expo-google-fonts/dm-serif-display';
import { CourierPrime_400Regular, CourierPrime_700Bold } from '@expo-google-fonts/courier-prime';

// A fonte padrão do corpo (Hind) entra pelo `Text` do app (src/components/Text.tsx):
// `Text.defaultProps` não funciona mais no RN e o texto sem classe cairia no
// Roboto do sistema.

SplashScreen.preventAutoHideAsync().catch(() => {});

// O SafeAreaView do `react-native` só afasta do notch no iOS — no Android é
// no-op, então todo cabeçalho colidia com a barra de status. Este (de
// safe-area-context) respeita o inset dos dois; `cssInterop` é o que faz o
// `className` do NativeWind chegar nele, já que não é um componente do RN.
cssInterop(SafeAreaView, { className: 'style' });

// --- Telas de Usuário ---
import LoginScreen from './src/screens/LoginScreen';
import FeedScreen from './src/screens/FeedScreen';
import SearchScreen from './src/screens/SearchScreen';
import WishlistScreen from './src/screens/WishlistScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CarrinhoScreen from './src/screens/CarrinhoScreen';
import PedidoScreen from './src/screens/PedidoScreen';
import RegisterUserScreen from './src/screens/RegisterUserScreen';
import ConfirmEmailScreen from './src/screens/ConfirmEmailScreen';
import CreateStoreScreen from './src/screens/CreateStoreScreen';
import StoreDetailScreen from './src/screens/StoreDetailScreen';
import BodyProfileScreen from './src/screens/BodyProfileScreen';
import EditStoreScreen from './src/screens/EditStoreScreen';
import SellerDocumentScreen from './src/screens/SellerDocumentScreen';
import ComingSoonScreen from './src/screens/ComingSoonScreen';

// --- Telas de Empresa ---
import RegisterCompanyScreen from './src/screens/RegisterCompanyScreen';
import CompanyDashboardScreen from './src/screens/CompanyDashboardScreen'; // Dashboard principal
import AddProductScreen from './src/screens/AddProductScreen';
import CompanyCatalogScreen from './src/screens/CompanyCatalogScreen';
import CompanyInsightsScreen from './src/screens/CompanyInsightsScreen';
import CompanyProfileScreen from './src/screens/CompanyProfileScreen';

import { UserTabParamList, BusinessTabParamList } from './src/types';
import { colors } from './src/theme/colors';
import CatalogTabBar from './src/components/CatalogTabBar';
import { supabase } from './src/lib/supabase';
import api from './src/lib/api';
import { resetProfile } from './src/utils/algorithm';
import { ProfileResponse } from './src/types/api';

const navigationRef = createNavigationContainerRef<any>();

type RotaInicial = 'Login' | 'MainUser' | 'MainBusiness';
/** Último painel aberto (usuário ou loja) — só atalho de navegação ao reabrir o
 *  app; quem autoriza é sempre o servidor. */
const PAPEL_KEY = 'lookly_ultimo_painel';

/**
 * Sessão persistida → entra direto no painel certo, sem pedir login de novo.
 * Com sessão e sem painel lembrado, pergunta ao servidor (`is_seller`). Qualquer
 * falha cai no Login: é o caminho seguro.
 */
async function resolverRotaInicial(): Promise<RotaInicial> {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return 'Login';
    const lembrado = await AsyncStorage.getItem(PAPEL_KEY);
    if (lembrado === 'MainUser' || lembrado === 'MainBusiness') return lembrado;
    const { data: perfil } = await api.get<ProfileResponse>('/profiles/me');
    return perfil.is_seller ? 'MainBusiness' : 'MainUser';
  } catch {
    return 'Login';
  }
}

const UserTab = createBottomTabNavigator<UserTabParamList>();
const BusinessTab = createBottomTabNavigator<BusinessTabParamList>();
const Stack = createNativeStackNavigator();

// ─── Componente de Ícone Personalizado ────────────────────────────────────────

type GlifoAba = keyof typeof MaterialCommunityIcons.glyphMap;

interface TabIconProps {
  /** Glifo da aba ativa e o da inativa (contorno, quando existe). */
  glifo: { ativo: GlifoAba; inativo: GlifoAba };
  label: string;
  focused: boolean;
}

// Ícones de ofício, não de interface genérica: cada aba usa o objeto que ela é
// numa loja de catálogo antigo — livro de catálogo, livro com lupa, etiqueta de
// preço com coração, ficha de modelo; e, na loja, vitrine, cabide, ábaco de
// balcão e carimbo. Vêm do MaterialCommunityIcons (já embutido no
// @expo/vector-icons, sem dependência nativa nova).
//
// Barra de navegação do Material (3–5 destinos, rótulo sempre visível) vestida
// de índice de catálogo: papel claro, filete de tinta no topo e o item ativo em
// vermelho de selo; a tarja vermelha que desliza até a aba tocada vive em
// CatalogTabBar. Fica embaixo, onde o polegar alcança; não é flutuante, então
// não cobre o conteúdo das telas.
const TabIcon: React.FC<TabIconProps> = ({ glifo, label, focused }) => (
  <View className="items-center justify-center gap-1 w-20">
    <MaterialCommunityIcons
      name={focused ? glifo.ativo : glifo.inativo}
      size={28}
      color={focused ? colors.seal.DEFAULT : colors.ink[4]}
    />
    <Text className={`text-xs ${focused ? 'text-seal font-sans-bold' : 'text-ink-4 font-sans-medium'}`}>
      {label}
    </Text>
  </View>
);

// A barra em si (altura, filete, tarja deslizante) é o CatalogTabBar.
const tabOptions: BottomTabNavigationOptions = { headerShown: false, tabBarShowLabel: false };

// ─── Tabs do Usuário (Cliente) ───────────────────────────────────────────────

function UserTabs() {
  return (
    <UserTab.Navigator screenOptions={tabOptions} tabBar={(props) => <CatalogTabBar {...props} />}>
      <UserTab.Screen name="Feed" component={FeedScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon glifo={{ ativo: 'book-open-page-variant', inativo: 'book-open-page-variant-outline' }} label="Catálogo" focused={focused} /> }} />
      <UserTab.Screen name="Buscar" component={SearchScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon glifo={{ ativo: 'book-search', inativo: 'book-search-outline' }} label="Busca" focused={focused} /> }} />
      <UserTab.Screen name="Salvos" component={WishlistScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon glifo={{ ativo: 'tag-heart', inativo: 'tag-heart-outline' }} label="Salvos" focused={focused} /> }} />
      <UserTab.Screen name="Perfil" component={ProfileScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon glifo={{ ativo: 'card-account-details', inativo: 'card-account-details-outline' }} label="Perfil" focused={focused} /> }} />
    </UserTab.Navigator>
  );
}

// ─── Tabs da Empresa (Business) ──────────────────────────────────────────────

function BusinessTabs() {
  return (
    <BusinessTab.Navigator screenOptions={tabOptions} tabBar={(props) => <CatalogTabBar {...props} />}>
      <BusinessTab.Screen name="Dashboard" component={CompanyDashboardScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon glifo={{ ativo: 'storefront', inativo: 'storefront-outline' }} label="Início" focused={focused} /> }} />
      <BusinessTab.Screen name="Catalogo" component={CompanyCatalogScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon glifo={{ ativo: 'hanger', inativo: 'hanger' }} label="Itens" focused={focused} /> }} />
      <BusinessTab.Screen name="Insights" component={CompanyInsightsScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon glifo={{ ativo: 'abacus', inativo: 'abacus' }} label="Insights" focused={focused} /> }} />
      <BusinessTab.Screen name="Perfil" component={CompanyProfileScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon glifo={{ ativo: 'stamper', inativo: 'stamper' }} label="Marca" focused={focused} /> }} />
    </BusinessTab.Navigator>
  );
}

// ─── App Root (Stack Principal) ───────────────────────────────────────────────

export default function App(): React.ReactElement | null {
  const [fontsLoaded] = useFonts({
    Hind_400Regular,
    Hind_500Medium,
    Hind_600SemiBold,
    Hind_700Bold,
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
    CourierPrime_400Regular,
    CourierPrime_700Bold,
  });

  const [rotaInicial, setRotaInicial] = useState<RotaInicial | null>(null);

  useEffect(() => {
    resolverRotaInicial().then(setRotaInicial);
  }, []);

  // Sessão encerrada (logout, token recusado pelo backend, refresh que falhou):
  // limpa o que é da pessoa anterior — painel lembrado e o DNA de estilo local,
  // que não é por usuário — e volta ao Login.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((evento) => {
      if (evento !== 'SIGNED_OUT') return;
      AsyncStorage.removeItem(PAPEL_KEY).catch(() => {});
      resetProfile().catch(() => {});
      if (navigationRef.isReady()) {
        navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const pronto = fontsLoaded && rotaInicial !== null;

  useEffect(() => {
    if (pronto) SplashScreen.hideAsync().catch(() => {});
  }, [pronto]);

  // Guarda qual painel está aberto, para reabrir direto nele.
  const lembrarPainel = () => {
    const raiz = navigationRef.getRootState();
    const nome = raiz?.routes[raiz.index]?.name;
    if (nome === 'MainUser' || nome === 'MainBusiness') {
      AsyncStorage.setItem(PAPEL_KEY, nome).catch(() => {});
    }
  };

  // Mantém a splash (creme, ver app.json) até a fonte carregar — sem isso a
  // primeira tela pisca com a fonte do sistema antes de trocar pra Hind.
  if (!pronto) return null;

  return (
    <SafeAreaProvider>
    <NavigationContainer ref={navigationRef} onStateChange={lembrarPainel} onReady={lembrarPainel}>
      {/* Inicial: Login, ou direto o painel quando já há sessão salva */}
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={rotaInicial ?? 'Login'}>
        
        {/* Fluxo de Autenticação */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="RegisterUser" component={RegisterUserScreen} />
        <Stack.Screen name="RegisterCompany" component={RegisterCompanyScreen} />
        <Stack.Screen name="ConfirmEmail" component={ConfirmEmailScreen} />

        {/* Dashboards (Tabs de acordo com o perfil) */}
        <Stack.Screen name="MainUser" component={UserTabs} />
        <Stack.Screen name="MainBusiness" component={BusinessTabs} />

        {/* Telas Auxiliares (Abrem sobre as Tabs) */}
        <Stack.Screen 
          name="AddProduct" 
          component={AddProductScreen} 
          options={{ animation: 'slide_from_bottom' }} 
        />
        <Stack.Screen 
          name="Carrinho" 
          component={CarrinhoScreen} 
          options={{ animation: 'slide_from_right' }} 
        />
        <Stack.Screen
          name="Pedidos"
          component={PedidoScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="CreateStore"
          component={CreateStoreScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="StoreDetail"
          component={StoreDetailScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="BodyProfile"
          component={BodyProfileScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="EditStore"
          component={EditStoreScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="SellerDocument"
          component={SellerDocumentScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="ComingSoon"
          component={ComingSoonScreen}
          options={{ animation: 'slide_from_right' }}
        />

      </Stack.Navigator>
    </NavigationContainer>
    </SafeAreaProvider>
  );
}