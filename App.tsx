import './global.css';

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import {
  createBottomTabNavigator,
  BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import FeedScreen from './src/screens/FeedScreen';
import SearchScreen from './src/screens/SearchScreen';
import WishlistScreen from './src/screens/WishlistScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CarrinhoScreen from './src/screens/CarrinhoScreen';
import PedidoScreen from './src/screens/PedidoScreen';
import { RootTabParamList } from './src/types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator();

// ─── Tab icon ─────────────────────────────────────────────────────────────────

interface TabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  focused: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ name, label, focused }) => (
  <View className="items-center justify-center gap-0.5">
    <Ionicons
      name={focused ? name : `${name}-outline` as keyof typeof Ionicons.glyphMap}
      size={24}
      color={focused ? '#a78bfa' : '#444'}
    />
    <Text className={`text-2xs ${focused ? 'text-brand font-semibold' : 'text-ink-6'}`}>
      {label}
    </Text>
  </View>
);

// ─── Tab options ──────────────────────────────────────────────────────────────

const tabOptions: BottomTabNavigationOptions = {
  headerShown: false,
  tabBarShowLabel: false,
  tabBarStyle: {
    backgroundColor: '#0c0c0c',
    borderTopColor: '#1a1a1a',
    borderTopWidth: 1,
    height: 72,
    paddingBottom: 8,
    paddingTop: 6,
  },
};

// ─── Tabs (tela principal com a barra inferior) ───────────────────────────────

function TabNavigator() {
  return (
    <Tab.Navigator screenOptions={tabOptions}>
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="flash" label="feed" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Buscar"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="search" label="busca" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Salvos"
        component={WishlistScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="bookmark" label="salvos" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="person" label="perfil" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ─── App root (Stack envolve as Tabs) ─────────────────────────────────────────

export default function App(): React.ReactElement {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>

        {/* Tela principal com as tabs */}
        <Stack.Screen name="Main" component={TabNavigator} />

        {/* Telas que abrem por cima, sem mostrar a tab bar */}
        <Stack.Screen
          name="Carrinho"
          component={CarrinhoScreen}
          options={{
            animation: 'slide_from_right', // entra da direita como página normal
          }}
        />
        <Stack.Screen
          name="Pedidos"
          component={PedidoScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}