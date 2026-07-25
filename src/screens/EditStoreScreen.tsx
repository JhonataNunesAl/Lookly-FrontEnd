import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { RootStackParamList } from '../types';
import { updateMyStore } from '../lib/sellers';
import Button from '../components/Button';

type EditStoreRoute = RouteProp<RootStackParamList, 'EditStore'>;

/** Editar nome/bio/site da loja — "Branding e Descrição" no
 *  `CompanyProfileScreen`, antes um `onPress={() => {}}`. `PUT /api/sellers/me`
 *  já existia no backend sem nenhuma tela chamando. Logo fica de fora — sem
 *  pipeline de upload de imagem (mesmo gap do `AddProductScreen`). */
export default function EditStoreScreen(): React.ReactElement {
  const { params } = useRoute<EditStoreRoute>();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [storeName, setStoreName] = useState(params.loja.store_name);
  const [description, setDescription] = useState(params.loja.description ?? '');
  const [storeUrl, setStoreUrl] = useState(params.loja.store_url ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!storeName.trim()) {
      Alert.alert('Nome da loja', 'Informe o nome da sua marca.');
      return;
    }
    setSaving(true);
    try {
      await updateMyStore({
        store_name: storeName.trim(),
        description: description.trim() || undefined,
        store_url: storeUrl.trim() || undefined,
      });
      navigation.goBack();
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail[0]?.msg : detail || 'Não foi possível salvar agora.';
      Alert.alert('Ops!', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <SafeAreaView className="flex-1">
          <View className="flex-row items-center px-5 pt-4 pb-2 gap-3">
            <Button variant="icon" icon="chevron-back" accessibilityLabel="Voltar" onPress={() => navigation.goBack()} />
            <Text className="text-ink text-xl font-bold tracking-tight">Branding e Descrição</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 }}>
            <View className="gap-y-5">
              <View>
                <Text className="text-ink-5 text-xs font-bold uppercase mb-2 ml-1 tracking-widest">Nome da marca</Text>
                <View className="bg-surface border border-surface-4 rounded-2xl px-4 h-14 justify-center">
                  <TextInput
                    className="text-ink font-medium"
                    placeholderTextColor={colors.ink[6]}
                    value={storeName}
                    onChangeText={setStoreName}
                  />
                </View>
              </View>

              <View>
                <Text className="text-ink-5 text-xs font-bold uppercase mb-2 ml-1 tracking-widest">Descrição</Text>
                <View className="bg-surface border border-surface-4 rounded-card px-4 py-3 h-28">
                  <TextInput
                    className="text-ink text-sm"
                    placeholder="Descreva o estilo da sua marca..."
                    placeholderTextColor={colors.ink[6]}
                    multiline
                    textAlignVertical="top"
                    value={description}
                    onChangeText={setDescription}
                  />
                </View>
              </View>

              <View>
                <Text className="text-ink-5 text-xs font-bold uppercase mb-2 ml-1 tracking-widest">Site (opcional)</Text>
                <View className="bg-surface border border-surface-4 rounded-2xl px-4 h-14 justify-center">
                  <TextInput
                    className="text-ink font-medium"
                    placeholder="suamarca.com.br"
                    placeholderTextColor={colors.ink[6]}
                    autoCapitalize="none"
                    keyboardType="url"
                    value={storeUrl}
                    onChangeText={setStoreUrl}
                  />
                </View>
              </View>
            </View>

            <View className="mt-8">
              <Button variant="primary" label="SALVAR" onPress={handleSave} loading={saving} />
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}
