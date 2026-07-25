import React from 'react';
import { SafeAreaView, StatusBar, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { RootStackParamList } from '../types';
import Button from '../components/Button';

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
      <StatusBar barStyle="dark-content" />
      <SafeAreaView className="flex-1 items-center justify-center px-10">
        <View className="w-20 h-20 rounded-full bg-brand/10 items-center justify-center mb-6">
          <Ionicons name={(params.icon as any) ?? 'time-outline'} size={32} color={colors.brand.DEFAULT} />
        </View>
        <Text className="text-ink text-xl font-bold text-center">{params.title}</Text>
        <Text className="text-ink-4 text-sm text-center mt-3 leading-6">{params.description}</Text>
        <View className="mt-8 self-stretch">
          <Button variant="secondary" label="Voltar" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    </View>
  );
}
