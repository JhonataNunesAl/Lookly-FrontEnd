import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  View,
} from 'react-native';
import Text from '../components/Text';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { RootStackParamList } from '../types';
import { updateMyStore } from '../lib/sellers';
import Button from '../components/Button';
import Campo from '../components/Campo';
import ScreenHeader from '../components/ScreenHeader';

type EditStoreRoute = RouteProp<RootStackParamList, 'EditStore'>;

/** Editar nome/bio/site da loja — "Branding e Descrição" no
 *  `CompanyProfileScreen`, antes um `onPress={() => {}}`. `PUT /api/sellers/me`
 *  já existia no backend sem nenhuma tela chamando. A logo se troca no perfil
 *  da marca (botão de câmera), não aqui. */
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
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScreenHeader title="Dados da marca" subtitle="Nome, descrição e site da loja" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 20 }}
        >
          <Campo rotulo="Nome da marca" value={storeName} onChangeText={setStoreName} maxLength={80} />
          <Campo
            rotulo="Descrição"
            placeholder="Descreva o estilo da sua marca…"
            value={description}
            onChangeText={setDescription}
            multilinha
            dica="Aparece na vitrine pública da loja."
          />
          <Campo
            rotulo="Site"
            placeholder="suamarca.com.br"
            autoCapitalize="none"
            keyboardType="url"
            value={storeUrl}
            onChangeText={setStoreUrl}
            dica="Opcional."
          />
          <Button variant="primary" label="Salvar" icon="arrow-forward" onPress={handleSave} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
