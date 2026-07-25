import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { AI_CONSENT_VERSION } from '../types/api';
import { fetchBodyProfile, updateBodyProfile, grantAiConsent, revokeAiConsent } from '../lib/bodyProfile';
import Button from '../components/Button';

/**
 * "Ajustar Tamanhos e Medidas" — antes um botão sem `onPress`. O recurso já
 * existia no backend (`/api/body-profile/me`) desde a v2, mas nenhuma tela
 * jamais chamava. Peso/altura/medidas ficam cifrados no servidor (ver
 * CLAUDE.md do Lucker) — a tela só manda/recebe texto puro sobre HTTPS.
 *
 * Consentimento de IA é separado de guardar a medida: dá pra salvar seu
 * tamanho sem nunca ligar o provador virtual com IA.
 */
export default function BodyProfileScreen(): React.ReactElement {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [consentBusy, setConsentBusy] = useState(false);

  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [measurements, setMeasurements] = useState('');
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchBodyProfile();
        if (data.weight_kg != null) setWeight(String(data.weight_kg));
        if (data.height_cm != null) setHeight(String(data.height_cm));
        if (data.measurements) setMeasurements(data.measurements);
        setConsented(!!data.ai_consent_at && !data.ai_consent_revoked_at);
      } catch {
        Alert.alert('Ops', 'Não foi possível carregar seus dados agora.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    const pesoNum = weight.trim() ? Number(weight.replace(',', '.')) : undefined;
    const alturaNum = height.trim() ? Number(height.replace(',', '.')) : undefined;
    if (weight.trim() && (Number.isNaN(pesoNum) || (pesoNum as number) <= 0)) {
      Alert.alert('Peso inválido', 'Digite um número válido, ex.: 68.5');
      return;
    }
    if (height.trim() && (Number.isNaN(alturaNum) || (alturaNum as number) <= 0)) {
      Alert.alert('Altura inválida', 'Digite um número válido, ex.: 170');
      return;
    }

    setSaving(true);
    try {
      await updateBodyProfile({
        ...(pesoNum !== undefined ? { weight_kg: pesoNum } : {}),
        ...(alturaNum !== undefined ? { height_cm: alturaNum } : {}),
        ...(measurements.trim() ? { measurements: measurements.trim() } : {}),
      });
      Alert.alert('Salvo', 'Suas medidas foram atualizadas.');
      navigation.goBack();
    } catch {
      Alert.alert('Ops', 'Não foi possível salvar agora. Tente de novo.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleConsent = async () => {
    setConsentBusy(true);
    try {
      if (consented) {
        await revokeAiConsent();
        setConsented(false);
      } else {
        await grantAiConsent(AI_CONSENT_VERSION);
        setConsented(true);
      }
    } catch {
      Alert.alert('Ops', 'Não foi possível atualizar o consentimento agora.');
    } finally {
      setConsentBusy(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={colors.brand.DEFAULT} size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <SafeAreaView className="flex-1">
          <View className="flex-row items-center px-5 pt-4 pb-2 gap-3">
            <Button variant="icon" icon="chevron-back" accessibilityLabel="Voltar" onPress={() => navigation.goBack()} />
            <Text className="text-ink text-xl font-bold tracking-tight">Tamanhos e Medidas</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
            <Text className="text-ink-4 text-sm mt-2 mb-6 leading-6">
              Usamos isso pra sugerir peças no seu tamanho. Fica cifrado e visível só pra você.
            </Text>

            <View className="gap-y-5">
              <View className="flex-row gap-x-4">
                <View className="flex-1">
                  <Text className="text-ink-5 text-xs font-bold uppercase mb-2 ml-1 tracking-widest">Peso (kg)</Text>
                  <View className="bg-surface border border-surface-4 rounded-2xl px-4 flex-row items-center h-14">
                    <TextInput
                      className="flex-1 text-ink font-medium"
                      placeholder="68.5"
                      placeholderTextColor={colors.ink[6]}
                      keyboardType="decimal-pad"
                      value={weight}
                      onChangeText={setWeight}
                    />
                  </View>
                </View>
                <View className="flex-1">
                  <Text className="text-ink-5 text-xs font-bold uppercase mb-2 ml-1 tracking-widest">Altura (cm)</Text>
                  <View className="bg-surface border border-surface-4 rounded-2xl px-4 flex-row items-center h-14">
                    <TextInput
                      className="flex-1 text-ink font-medium"
                      placeholder="170"
                      placeholderTextColor={colors.ink[6]}
                      keyboardType="decimal-pad"
                      value={height}
                      onChangeText={setHeight}
                    />
                  </View>
                </View>
              </View>

              <View>
                <Text className="text-ink-5 text-xs font-bold uppercase mb-2 ml-1 tracking-widest">
                  Medidas (opcional)
                </Text>
                <View className="bg-surface border border-surface-4 rounded-3xl px-4 py-3 h-24">
                  <TextInput
                    className="text-ink text-sm"
                    placeholder="Ex.: Busto 90cm, Cintura 70cm, Quadril 95cm"
                    placeholderTextColor={colors.ink[6]}
                    multiline
                    textAlignVertical="top"
                    value={measurements}
                    onChangeText={setMeasurements}
                  />
                </View>
              </View>
            </View>

            <View className="mt-8">
              <Button variant="primary" label="SALVAR" onPress={handleSave} loading={saving} />
            </View>

            {/* Consentimento de IA — separado de guardar a medida */}
            <View className="mt-10 bg-surface border border-surface-4 rounded-card p-5">
              <View className="flex-row items-center gap-2 mb-2">
                <Ionicons name="sparkles-outline" size={18} color={colors.brand.DEFAULT} />
                <Text className="text-ink font-bold">Provador virtual com IA</Text>
              </View>
              <Text className="text-ink-4 text-xs leading-5 mb-4">
                Opcional e revogável a qualquer momento (LGPD). Sem isso ligado, suas medidas
                continuam salvas, só não são usadas pra gerar imagens de prova de roupa.
              </Text>
              <Button
                variant={consented ? 'danger' : 'secondary'}
                label={consented ? 'Revogar consentimento' : 'Permitir provador virtual com IA'}
                onPress={handleToggleConsent}
                loading={consentBusy}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}
