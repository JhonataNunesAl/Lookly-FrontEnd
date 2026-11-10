import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/Text';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { createStore, submitSellerDocument } from '../lib/sellers';
import { colors } from '../theme/colors';
import { RootStackParamList } from '../types';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';

type ConfirmEmailRoute = RouteProp<RootStackParamList, 'ConfirmEmail'>;

const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Confirmação de cadastro por CÓDIGO (6 dígitos), não por link.
 *
 * Substitui o antigo fluxo de "clique no link do e-mail": em app mobile sem
 * deep link configurado, o link caía num Site URL não-configurado do
 * Supabase (localhost:3000, o placeholder default) — e mesmo com deep link
 * certo, clientes de e-mail (Gmail, Outlook Safe Links, Apple Mail Privacy
 * Protection) pré-carregam todo link recebido, consumindo o token antes do
 * usuário clicar de verdade (`otp_expired`). Um código digitado à mão não
 * tem esse problema: não existe link nenhum pra ser pré-carregado.
 *
 * Pré-requisito no painel do Supabase (fora do alcance deste código):
 * Authentication → Email Templates → "Confirm signup" precisa usar
 * `{{ .Token }}` (o código) em vez de só `{{ .ConfirmationURL }}`.
 *
 * Segurança: `verifyOtp` é validado no servidor do Supabase, que já aplica
 * limite de tentativas e expiração por conta própria — não há necessidade
 * (nem como, do lado do cliente) de reimplementar isso aqui. O código NUNCA
 * é uma senha: sozinho ele só confirma a posse do e-mail, exatamente como o
 * link fazia.
 */
export default function ConfirmEmailScreen(): React.ReactElement {
  const { params } = useRoute<ConfirmEmailRoute>();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [code, setCode] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleConfirm = async () => {
    const codigo = code.trim();
    if (codigo.length < 6) {
      Alert.alert('Código incompleto', 'Digite os 6 dígitos enviados para seu e-mail.');
      return;
    }

    setConfirming(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: params.email,
        token: codigo,
        type: 'signup',
      });

      if (error || !data.session) {
        Alert.alert(
          'Código inválido',
          'Confira os dígitos ou peça um novo código — códigos expiram depois de um tempo.',
        );
        return;
      }

      // Sessão real existe a partir daqui — igual a um login. Só agora dá
      // para criar a loja (POST /sellers exige o JWT que acabou de nascer).
      if (params.sellerPayload) {
        try {
          await createStore(params.sellerPayload);
        } catch (e: any) {
          const detail = e?.response?.data?.detail;
          const msg = Array.isArray(detail) ? detail[0]?.msg : detail;
          Alert.alert(
            'E-mail confirmado, mas a loja não',
            msg || 'Não foi possível criar a loja agora. Você pode tentar de novo pelo seu perfil.',
          );
          navigation.replace('MainUser');
          return;
        }
        if (params.documentPayload) {
          try {
            await submitSellerDocument(params.documentPayload);
          } catch {
            Alert.alert(
              'Loja criada, documento não',
              'Não foi possível validar o CNPJ agora. Você pode enviá-lo depois, em Perfil > Documento fiscal.',
            );
          }
        }
        navigation.replace('MainBusiness');
        return;
      }

      navigation.replace(params.onConfirmedNavigateTo);
    } catch {
      Alert.alert('Ops', 'Não foi possível confirmar agora. Tente de novo.');
    } finally {
      setConfirming(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: params.email });
      if (error) {
        Alert.alert('Ops', 'Não foi possível reenviar o código agora.');
      } else {
        Alert.alert('Código reenviado', 'Confira seu e-mail.');
        setCooldown(RESEND_COOLDOWN_SECONDS);
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScreenHeader title="Confirmar e-mail" onBack={() => navigation.navigate('Login')} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <View className="flex-1 px-6 justify-center">
          <View className="items-center mb-10">
            <View className="w-16 h-16 rounded-lg bg-ink items-center justify-center mb-5">
              <Ionicons name="mail-open-outline" size={32} color={colors.signal.DEFAULT} />
            </View>
            <Text className="text-ink text-2xl font-display-bold text-center">Confirme seu e-mail</Text>
            <Text className="text-ink-3 text-base mt-2 text-center px-4">
              Enviamos um código de 6 dígitos para{'\n'}
              <Text className="text-ink font-sans-semibold">{params.email}</Text>
            </Text>
          </View>

          <TextInput
            accessibilityLabel="Código de 6 dígitos"
            className="bg-surface border border-b-2 border-surface-5 border-b-ink h-16 text-center text-ink text-3xl font-display-bold"
            placeholder="000000"
            placeholderTextColor={colors.ink[5]}
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
          />

          <View className="mt-6">
            <Button variant="primary" label="Confirmar" icon="arrow-forward" onPress={handleConfirm} loading={confirming} />
          </View>

          <TouchableOpacity
            onPress={handleResend}
            disabled={cooldown > 0 || resending}
            accessibilityRole="button"
            className="mt-4 min-h-12 items-center justify-center"
          >
            <Text className={`text-base font-sans-bold ${cooldown > 0 ? 'text-ink-4' : 'text-ink underline'}`}>
              {resending
                ? 'Enviando...'
                : cooldown > 0
                  ? `Reenviar código em ${cooldown}s`
                  : 'Reenviar código'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
