import React from 'react';
import {
  StatusBar,
  View,
} from 'react-native';
import Text from '../components/Text';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { RootStackParamList } from '../types';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';

type ComingSoonRoute = RouteProp<RootStackParamList, 'ComingSoon'>;

/**
 * Placeholder único pra qualquer botão sem funcionalidade real ainda —
 * substitui o padrão anterior de `onPress={() => {}}` (o usuário toca e nada
 * acontece, sem explicação). Mostra o que está vindo em vez de esconder, e já
 * deixa a rota certa registrada pra quem for implementar de verdade.
 */
export default function ComingSoonScreen(): React.ReactElement {
  const { params } = useRoute<ComingSoonRoute>();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScreenHeader title={params.title} onBack={() => navigation.goBack()} />
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-16 h-16 rounded-lg bg-ink items-center justify-center mb-4">
          <Ionicons name={(params.icon as any) ?? 'time-outline'} size={32} color={colors.signal.DEFAULT} />
        </View>
        <Text className="text-ink text-2xl font-display-bold text-center">Em breve</Text>
        <Text className="text-ink-4 text-base text-center mt-2">{params.description}</Text>
        <View className="mt-6 self-stretch">
          <Button variant="primary" label="Voltar" icon="arrow-back" onPress={() => navigation.goBack()} />
        </View>
      </View>
    </View>
  );
}
