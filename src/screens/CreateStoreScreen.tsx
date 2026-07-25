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
import { slugify } from '../utils/format';
import { createStore, verifySellerDocument, submitSellerDocument } from '../lib/sellers';
import { DocumentVerifyResponse } from '../types/api';
import Button from '../components/Button';

/**
 * Upgrade de usuário comum para vendedor — diferente de `RegisterCompanyScreen`,
 * que também faz `supabase.auth.signUp` (cadastro do zero). Aqui a pessoa já
 * está logada; só falta virar loja. Fluxo: preencher dados → verificar o
 * documento contra a Receita (CNPJ) → confirmar → criar loja.
 */
export default function CreateStoreScreen(): React.ReactElement {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [storeName, setStoreName] = useState('');
  const [bio, setBio] = useState('');
  const [documentType, setDocumentType] = useState<'CNPJ' | 'CPF'>('CNPJ');
  const [documentNumber, setDocumentNumber] = useState('');

  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<DocumentVerifyResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Trocar o número ou o tipo invalida a verificação anterior — não dá pra
  // confirmar em cima de um documento diferente do que foi checado.
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

  const handleCreate = async () => {
    if (!storeName.trim()) {
      Alert.alert('Nome da loja', 'Informe o nome da sua marca.');
      return;
    }
    if (!podeConfirmar) {
      Alert.alert('Verifique o documento', 'Confirme o CNPJ/CPF antes de criar a loja.');
      return;
    }

    setSubmitting(true);
    try {
      await createStore({
        store_name: storeName.trim(),
        store_slug: slugify(storeName),
        description: bio.trim() || undefined,
      });
      await submitSellerDocument({
        document_number: documentNumber.trim(),
        document_type: documentType,
      });
      navigation.replace('MainBusiness');
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail[0]?.msg : detail || 'Não foi possível criar a loja.';
      Alert.alert('Ops!', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <SafeAreaView className="flex-1">
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>

            <View className="mt-8 mb-8">
              <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4">
                <Ionicons name="arrow-back" size={24} color={colors.ink.DEFAULT} />
              </TouchableOpacity>
              <Text className="text-ink text-3xl font-bold tracking-tight">Criar minha loja</Text>
              <Text className="text-ink-4 mt-2">
                Sua conta continua a mesma — só ganha acesso ao painel de vendedor.
              </Text>
            </View>

            <View className="gap-y-5">
              <View>
                <Text className="text-ink-5 text-xs font-bold uppercase mb-2 ml-1 tracking-widest">Nome da marca</Text>
                <View className="bg-surface border border-surface-4 rounded-2xl px-4 flex-row items-center h-14">
                  <Ionicons name="business-outline" size={20} color={colors.ink[5]} />
                  <TextInput
                    className="flex-1 ml-3 text-ink font-medium"
                    placeholder="Ex: Lookly Studio"
                    placeholderTextColor={colors.ink[6]}
                    value={storeName}
                    onChangeText={setStoreName}
                  />
                </View>
              </View>

              <View>
                <Text className="text-ink-5 text-xs font-bold uppercase mb-2 ml-1 tracking-widest">Bio da marca</Text>
                <View className="bg-surface border border-surface-4 rounded-3xl px-4 py-3 h-24">
                  <TextInput
                    className="text-ink text-sm"
                    placeholder="Descreva o estilo da sua marca..."
                    placeholderTextColor={colors.ink[6]}
                    multiline
                    textAlignVertical="top"
                    value={bio}
                    onChangeText={setBio}
                  />
                </View>
              </View>

              {/* Toggle CNPJ/CPF */}
              <View>
                <Text className="text-ink-5 text-xs font-bold uppercase mb-2 ml-1 tracking-widest">Documento</Text>
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
              </View>
            </View>

            <View className="mt-8">
              <Button
                variant="primary"
                label="CRIAR LOJA"
                onPress={handleCreate}
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
