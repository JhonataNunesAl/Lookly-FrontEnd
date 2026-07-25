import './global.css';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

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

const UserTab = createBottomTabNavigator<UserTabParamList>();
const BusinessTab = createBottomTabNavigator<BusinessTabParamList>();
const Stack = createNativeStackNavigator();

// ─── Componente de Ícone Personalizado ────────────────────────────────────────

interface TabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  focused: boolean;
}

// Cápsula sólida atrás do ícone ativo em vez de só trocar cor — o "premium"
// que a barra flutuante pedia. Mesma paleta de sempre (brand/ink), nada novo.
const TabIcon: React.FC<TabIconProps> = ({ name, label, focused }) => (
  <View className="items-center justify-center gap-0.5">
    <View className={`w-11 h-7 rounded-full items-center justify-center ${focused ? 'bg-brand/10' : ''}`}>
      <Ionicons
        name={focused ? name : (`${name}-outline` as any)}
        size={22}
        color={focused ? colors.brand.DEFAULT : colors.ink[5]}
      />
    </View>
    <Text className={`text-[10px] ${focused ? 'text-brand font-semibold' : 'text-ink-5'}`}>
      {label}
    </Text>
  </View>
);

// Barra flutuante — desencostada da borda em vez de fixa/colada, cantos bem
// arredondados, sombra sutil (mesma receita de sombra do SwipeActionButton).
// Mantida embaixo (não virou lateral): é onde o polegar alcança em celular, e
// uma coluna lateral roubaria largura bem na tela mais importante do app (o
// feed de swipe em tela cheia).
const tabOptions: BottomTabNavigationOptions = {
  headerShown: false,
  tabBarShowLabel: false,
  tabBarStyle: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    height: 64,
    borderRadius: 24,
    backgroundColor: colors.surface.DEFAULT,
    borderTopWidth: 0,
    paddingTop: 8,
    shadowColor: colors.ink.DEFAULT,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
};

// ─── Tabs do Usuário (Cliente) ───────────────────────────────────────────────

function UserTabs() {
  return (
    <UserTab.Navigator screenOptions={tabOptions}>
      <UserTab.Screen name="Feed" component={FeedScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="flash" label="feed" focused={focused} /> }} />
      <UserTab.Screen name="Buscar" component={SearchScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="search" label="busca" focused={focused} /> }} />
      <UserTab.Screen name="Salvos" component={WishlistScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="bookmark" label="salvos" focused={focused} /> }} />
      <UserTab.Screen name="Perfil" component={ProfileScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="person" label="perfil" focused={focused} /> }} />
    </UserTab.Navigator>
  );
}

// ─── Tabs da Empresa (Business) ──────────────────────────────────────────────

function BusinessTabs() {
  return (
    <BusinessTab.Navigator screenOptions={tabOptions}>
      <BusinessTab.Screen name="Dashboard" component={CompanyDashboardScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="stats-chart" label="home" focused={focused} /> }} />
      <BusinessTab.Screen name="Catalogo" component={CompanyCatalogScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="shirt" label="itens" focused={focused} /> }} />
      <BusinessTab.Screen name="Insights" component={CompanyInsightsScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="analytics" label="insights" focused={focused} /> }} />
      <BusinessTab.Screen name="Perfil" component={CompanyProfileScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon name="business" label="marca" focused={focused} /> }} />
    </BusinessTab.Navigator>
  );
}

// ─── App Root (Stack Principal) ───────────────────────────────────────────────

export default function App(): React.ReactElement {
  return (
    <NavigationContainer>
      {/* A primeira tela da Stack é a inicial: Login */}
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
        
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
  );
}