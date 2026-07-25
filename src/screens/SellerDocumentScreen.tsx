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
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { verifySellerDocument, submitSellerDocument } from '../lib/sellers';
import { DocumentVerifyResponse } from '../types/api';
import Button from '../components/Button';

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
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <SafeAreaView className="flex-1">
          <View className="flex-row items-center px-5 pt-4 pb-2 gap-3">
            <Button variant="icon" icon="chevron-back" accessibilityLabel="Voltar" onPress={() => navigation.goBack()} />
            <Text className="text-ink text-xl font-bold tracking-tight">Documento fiscal</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 }}>
            <Text className="text-ink-4 text-sm mb-6 leading-6">
              O número fica cifrado no servidor — nunca é exibido em claro depois de salvo.
            </Text>

            <View className="flex-row gap-x-2 mb-3">
              {(['CNPJ', 'CPF'] as const).map((tipo) => (
                <TouchableOpacity
                  key={tipo}
                  onPress={() => atualizarTipo(tipo)}
                  className={`flex-1 py-3 rounded-xl items-center border ${
                    documentType === tipo ? 'bg-brand border-brand' : 'bg-surface border-surface-4'
                  }`}
                >
                  <Text className={`font-bold text-sm ${documentType === tipo ? 'text-white' : 'text-ink-4'}`}>
                    {tipo}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="bg-surface border border-surface-4 rounded-2xl px-4 flex-row items-center h-14">
              <Ionicons name="document-text-outline" size={20} color={colors.ink[5]} />
              <TextInput
                className="flex-1 ml-3 text-ink font-medium"
                placeholder={documentType === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                placeholderTextColor={colors.ink[6]}
                keyboardType="numeric"
                value={documentNumber}
                onChangeText={atualizarDocumento}
              />
            </View>

            <View className="mt-3">
              <Button variant="secondary" label="Verificar documento" onPress={handleVerify} loading={verifying} />
            </View>

            {verifyResult?.valid && (
              <View className="mt-3 bg-success/10 border border-success/25 rounded-2xl p-4 flex-row gap-3">
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text className="text-ink-2 text-sm flex-1 leading-5">{verifyResult.message}</Text>
              </View>
            )}

            <View className="mt-8">
              <Button
                variant="primary"
                label="SALVAR"
                onPress={handleSubmit}
                loading={submitting}
                disabled={!podeConfirmar}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}
