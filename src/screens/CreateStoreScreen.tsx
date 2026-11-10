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
import { slugify } from '../utils/format';
import { createStore, verifySellerDocument, submitSellerDocument } from '../lib/sellers';
import { DocumentVerifyResponse } from '../types/api';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';

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
      // A loja já existe a partir daqui. Se só o documento falhar, tentar de
      // novo "Criar loja" bateria em "já é vendedor" e a pessoa ficaria presa:
      // segue para o painel e o documento se reenvia por lá.
      try {
        await submitSellerDocument({
          document_number: documentNumber.trim(),
          document_type: documentType,
        });
      } catch {
        Alert.alert(
          'Loja criada, documento não',
          'Não foi possível gravar o documento agora. Envie de novo em Perfil > Documento fiscal.',
        );
      }
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
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScreenHeader title="Criar minha loja" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <View className="flex-1">
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>

            <Text className="text-ink text-lg font-sans-semibold mt-6 mb-6">
              Sua conta continua a mesma — só ganha acesso ao painel de vendedor.
            </Text>

            <View className="gap-y-5">
              <View>
                <Text className="text-ink text-sm font-sans-bold mb-2">Nome da marca</Text>
                <View className="bg-surface border border-b-2 border-surface-5 border-b-ink px-4 flex-row items-center h-14">
                  <Ionicons name="business-outline" size={20} color={colors.ink[5]} />
                  <TextInput
                    className="flex-1 ml-3 text-ink font-sans-medium"
                    placeholder="Ex: Lookly Studio"
                    placeholderTextColor={colors.ink[5]}
                    value={storeName}
                    onChangeText={setStoreName}
                  />
                </View>
              </View>

              <View>
                <Text className="text-ink text-sm font-sans-bold mb-2">Bio da marca</Text>
                <View className="bg-surface border border-b-2 border-surface-5 border-b-ink px-4 py-3 h-24">
                  <TextInput
                    className="text-ink text-sm"
                    placeholder="Descreva o estilo da sua marca..."
                    placeholderTextColor={colors.ink[5]}
                    multiline
                    textAlignVertical="top"
                    value={bio}
                    onChangeText={setBio}
                  />
                </View>
              </View>

              {/* Toggle CNPJ/CPF */}
              <View>
                <Text className="text-ink text-sm font-sans-bold mb-2">Documento</Text>
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
              </View>
            </View>

            <View className="mt-8">
              <Button
                variant="primary"
                label="Criar loja" icon="arrow-forward"
                onPress={handleCreate}
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
