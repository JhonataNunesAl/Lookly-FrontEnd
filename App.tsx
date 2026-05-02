import './global.css'; // ← NativeWind v4: must be imported at root before any UI

import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import {
  createBottomTabNavigator,
  BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';

import FeedScreen from './src/screens/FeedScreen';
import SearchScreen from './src/screens/SearchScreen';
import WishlistScreen from './src/screens/WishlistScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { RootTabParamList } from './src/types';

const Tab = createBottomTabNavigator<RootTabParamList>();

// ─── Tab icon ─────────────────────────────────────────────────────────────────

interface TabIconProps {
  emoji: string;
  label: string;
  focused: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ emoji, label, focused }) => (
  <View className="items-center justify-center gap-0.5">
    <Text style={{ fontSize: 20 }}>{emoji}</Text>
    <Text className={`text-2xs ${focused ? 'text-brand font-semibold' : 'text-ink-6'}`}>
      {label}
    </Text>
  </View>
);

// ─── Shared screen options ────────────────────────────────────────────────────

const screenOptions: BottomTabNavigationOptions = {
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

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App(): React.ReactElement {
  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={screenOptions}>
        <Tab.Screen
          name="Feed"
          component={FeedScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="⚡" label="feed" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Buscar"
          component={SearchScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🔍" label="buscar" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Salvos"
          component={WishlistScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🔖" label="salvos" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Perfil"
          component={ProfileScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="👤" label="perfil" focused={focused} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
