import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert } from 'react-native';
import { colors, BRAND_GRADIENT_SOLID } from '../theme/colors';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import { ProfileResponse } from '../types/api';
import Button from '../components/Button';

/** Só um atalho de navegação (qual tela de cadastro abrir e a cópia do topo).
 *  O papel real que autoriza vem do servidor — ver handleLogin. */
type UserRole = 'user' | 'company';

export default function LoginScreen(): React.ReactElement {
  const [role, setRole] = useState<UserRole>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // Tipagem da navegação para evitar erros de TS
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

/**
 * Login via Supabase Auth. O supabase-js guarda a sessão (com refresh) e o
 * interceptor do axios injeta o JWT em cada request. O papel (usuário x empresa)
 * NÃO vem do toggle da tela — vem do servidor, via `GET /api/profiles/me`
 * (`is_seller`). O toggle é só dica de navegação para o cadastro.
 */
const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert('Erro', 'Por favor, preencha todos os campos.');
    return;
  }

  setLoading(true);

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      Alert.alert('Erro', 'E-mail ou senha incorretos.');
      return;
    }

    // Papel resolvido no servidor — decide para qual dashboard ir.
    const { data: profile } = await api.get<ProfileResponse>('/profiles/me');
    navigation.replace(profile.is_seller ? 'MainBusiness' : 'MainUser');
  } catch (e) {
    // Sessão criada mas o backend não respondeu (offline, IP errado, perfil
    // ainda não provisionado). Não deixa o usuário preso na tela de login.
    Alert.alert(
      'Conectado, mas sem perfil',
      'Login feito, mas não consegui falar com o servidor. Verifique a conexão e tente de novo.',
    );
    await supabase.auth.signOut();
  } finally {
    setLoading(false);
  }
};

  const handleRegisterRedirect = () => {
    // Redireciona para a tela de cadastro específica baseada na seleção atual do Switch
    if (role === 'company') {
      navigation.navigate('RegisterCompany');
    } else {
      navigation.navigate('RegisterUser');
    }
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <SafeAreaView className="flex-1 px-8 justify-center">

          {/* Header & Logo */}
          <View className="items-center mb-12">
            <LinearGradient
              colors={[...BRAND_GRADIENT_SOLID]}
              className="w-20 h-20 rounded-3xl items-center justify-center rotate-12 mb-6"
            >
              <Ionicons name="flash" size={45} color={colors.white} className="-rotate-12" />
            </LinearGradient>
            <Text className="text-ink text-4xl font-black tracking-tighter">Lookly</Text>
            <Text className="text-ink-4 mt-2 text-center px-4">
              {role === 'user' ? 'Sua dose diária de moda' : 'Gerencie sua marca e impulsione vendas'}
            </Text>
          </View>

          {/* Role Selector (Switcher) */}
          <View className="bg-surface-3 p-1.5 rounded-2xl flex-row mb-8 border border-surface-4">
            <TouchableOpacity
              onPress={() => setRole('user')}
              className={`flex-1 py-3 rounded-xl items-center ${role === 'user' ? 'bg-brand' : ''}`}
            >
              <Text className={`font-bold ${role === 'user' ? 'text-white' : 'text-ink-4'}`}>Sou Usuário</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setRole('company')}
              className={`flex-1 py-3 rounded-xl items-center ${role === 'company' ? 'bg-brand' : ''}`}
            >
              <Text className={`font-bold ${role === 'company' ? 'text-white' : 'text-ink-4'}`}>Sou Empresa</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View className="gap-y-4">
            <View>
              <Text className="text-ink-5 text-xs font-bold uppercase mb-2 ml-1 tracking-widest">E-mail</Text>
              <View className="bg-surface border border-surface-4 rounded-2xl px-4 flex-row items-center h-14">
                <Ionicons name="mail-outline" size={20} color={colors.ink[5]} />
                <TextInput
                  className="flex-1 ml-3 text-ink font-medium"
                  placeholder="exemplo@email.com"
                  placeholderTextColor={colors.ink[6]}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View>
              <Text className="text-ink-5 text-xs font-bold uppercase mb-2 ml-1 tracking-widest">Senha</Text>
              <View className="bg-surface border border-surface-4 rounded-2xl px-4 flex-row items-center h-14">
                <Ionicons name="lock-closed-outline" size={20} color={colors.ink[5]} />
                <TextInput
                  className="flex-1 ml-3 text-ink font-medium"
                  placeholder="••••••••"
                  placeholderTextColor={colors.ink[6]}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.ink[5]} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Login Button */}
          <View className="mt-10">
            <Button variant="primary" label="ENTRAR" onPress={handleLogin} loading={loading} />
          </View>

          {/* Footer Dinâmico */}
          <View className="flex-row justify-center mt-8">
            <Text className="text-ink-4 text-sm">Não tem uma conta? </Text>
            <TouchableOpacity onPress={handleRegisterRedirect}>
              <Text className="text-brand font-black text-sm">Cadastre-se agora</Text>
            </TouchableOpacity>
          </View>

        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}