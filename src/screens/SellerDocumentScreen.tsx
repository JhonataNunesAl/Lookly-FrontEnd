import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/Text';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { verifySellerDocument, submitSellerDocument } from '../lib/sellers';
import { DocumentVerifyResponse } from '../types/api';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';

/**
 * "Documento fiscal (CPF/CNPJ)" no `CompanyProfileScreen` — antes um
 * `onPress={() => {}}`. Mesmo fluxo de verificação usado em `CreateStoreScreen`
 * (verificar antes de gravar), extraído aqui pra quem já é vendedor e precisa
 * corrigir ou reenviar o documento — `CreateStoreScreen` também cria a loja
 * (`POST /sellers`), o que não faz sentido repetir pra quem já tem uma.
 */
export default function SellerDocumentScreen(): React.ReactElement {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [documentType, setDocumentType] = useState<'CNPJ' | 'CPF'>('CNPJ');
  const [documentNumber, setDocumentNumber] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<DocumentVerifyResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const atualizarDocumento = (v: string) => {
    setDocumentNumber(v);
    setVerifyResult(null);
  };
  const atualizarTipo = (tipo: 'CNPJ' | 'CPF') => {
    setDocumentType(tipo);
    setVerifyResult(null);
  };

  const handleVerify = async () => {
    if (!documentNumber.trim()) {
      Alert.alert('Documento', `Informe o número do ${documentType}.`);
      return;
    }
    setVerifying(true);
    try {
      const res = await verifySellerDocument({
        document_number: documentNumber.trim(),
        document_type: documentType,
      });
      setVerifyResult(res);
      if (!res.valid) Alert.alert('Não confere', res.message);
    } catch {
      Alert.alert('Ops', 'Não foi possível verificar agora. Tente de novo em instantes.');
    } finally {
      setVerifying(false);
    }
  };

  const podeConfirmar = !!verifyResult?.valid;

  const handleSubmit = async () => {
    if (!podeConfirmar) {
      Alert.alert('Verifique o documento', 'Confirme o CNPJ/CPF antes de salvar.');
      return;
    }
    setSubmitting(true);
    try {
      await submitSellerDocument({
        document_number: documentNumber.trim(),
        document_type: documentType,
      });
      Alert.alert('Salvo', 'Documento fiscal atualizado.');
      navigation.goBack();
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      Alert.alert('Ops!', typeof detail === 'string' ? detail : 'Não foi possível salvar agora.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <View className="flex-1">
          <ScreenHeader title="Documento fiscal" onBack={() => navigation.goBack()} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 }}>
            <Text className="text-ink-4 text-sm mb-6 leading-6">
              O número fica cifrado no servidor — nunca é exibido em claro depois de salvo.
            </Text>

            <View className="flex-row gap-x-2 mb-3">
              {(['CNPJ', 'CPF'] as const).map((tipo) => (
                <TouchableOpacity
                  key={tipo}
                  onPress={() => atualizarTipo(tipo)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: documentType === tipo }}
                  className={`flex-1 h-12 rounded-card items-center justify-center border-2 border-ink ${
                    documentType === tipo ? 'bg-ink' : 'bg-surface'
                  }`}
                >
                  <Text className={`font-sans-bold text-base ${documentType === tipo ? 'text-white' : 'text-ink'}`}>
                    {tipo}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="bg-surface border border-b-2 border-surface-5 border-b-ink px-4 flex-row items-center h-14">
              <Ionicons name="document-text-outline" size={20} color={colors.ink[5]} />
              <TextInput
                className="flex-1 ml-3 text-ink font-sans-medium"
                placeholder={documentType === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                placeholderTextColor={colors.ink[5]}
                keyboardType="numeric"
                value={documentNumber}
                onChangeText={atualizarDocumento}
              />
            </View>

            <View className="mt-3">
              <Button variant="secondary" label="Verificar documento" onPress={handleVerify} loading={verifying} />
            </View>

            {verifyResult?.valid && (
              <View className="mt-3 bg-surface border-2 border-success rounded-card p-4 flex-row items-center gap-3">
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <Text className="text-ink text-base flex-1 leading-5">{verifyResult.message}</Text>
              </View>
            )}

            <View className="mt-8">
              <Button
                variant="primary"
                label="Salvar"
                onPress={handleSubmit}
                loading={submitting}
                disabled={!podeConfirmar}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
