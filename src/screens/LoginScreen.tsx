import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import Text from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
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
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  /**
   * Login via Supabase Auth. O supabase-js guarda a sessão (com refresh) e o
   * interceptor do axios injeta o JWT em cada request. O papel (usuário x empresa)
   * NÃO vem do toggle da tela — vem do servidor, via `GET /api/profiles/me`
   * (`is_seller`). O toggle é só dica de navegação para o cadastro.
   */
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Campos vazios', 'Preencha e-mail e senha para entrar.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        Alert.alert('Não foi possível entrar', 'E-mail ou senha incorretos.');
        return;
      }

      // Papel resolvido no servidor — decide para qual dashboard ir.
      const { data: profile } = await api.get<ProfileResponse>('/profiles/me');
      navigation.replace(profile.is_seller ? 'MainBusiness' : 'MainUser');
    } catch {
      // Sessão criada mas o backend não respondeu (offline, IP errado, perfil
      // ainda não provisionado). Não deixa a pessoa presa na tela de login.
      Alert.alert(
        'Sem conexão com o servidor',
        'O login foi feito, mas o servidor não respondeu. Verifique a conexão e tente de novo.',
      );
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterRedirect = () => {
    navigation.navigate(role === 'company' ? 'RegisterCompany' : 'RegisterUser');
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* Capa do catálogo: nome da casa em serifa, filete duplo e a promessa */}
          <SafeAreaView edges={['top']} className="bg-background">
            <View className="px-6 pt-10 pb-6 items-center">
              <View className="w-16 h-16 rounded-full border-2 border-seal bg-surface items-center justify-center mb-4">
                <Ionicons name="book" size={30} color={colors.seal.DEFAULT} />
              </View>
              <Text className="text-ink text-display font-display-black">Lookly</Text>
              <View className="self-stretch h-[5px] border-t-2 border-b border-ink mt-3 mb-3" />
              <Text className="text-ink-3 text-xl font-display-italic text-center">
                {role === 'user'
                  ? 'O catálogo de moda que você folheia com o dedo.'
                  : 'Publique suas peças no catálogo e acompanhe sua loja.'}
              </Text>
            </View>
          </SafeAreaView>

          <View className="px-6 pt-6 pb-10">
            {/* Quem está entrando — dica de navegação para o cadastro */}
            <View className="flex-row gap-2 mb-6">
              {([
                { id: 'user', label: 'Sou usuário', icon: 'person' },
                { id: 'company', label: 'Sou empresa', icon: 'storefront' },
              ] as const).map((op) => {
                const ativo = role === op.id;
                return (
                  <TouchableOpacity
                    key={op.id}
                    onPress={() => setRole(op.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: ativo }}
                    className={`flex-1 h-14 rounded-card flex-row items-center justify-center gap-2 border-2 border-ink ${
                      ativo ? 'bg-ink' : 'bg-surface'
                    }`}
                  >
                    <Ionicons name={op.icon} size={20} color={ativo ? colors.white : colors.ink.DEFAULT} />
                    <Text className={`text-base font-sans-bold ${ativo ? 'text-white' : 'text-ink'}`}>
                      {op.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text className="text-ink text-sm font-sans-bold mb-2">E-mail</Text>
            <View className="bg-surface border border-b-2 border-surface-5 border-b-ink px-4 flex-row items-center h-14 mb-4">
              <Ionicons name="mail-outline" size={20} color={colors.ink[4]} />
              <TextInput
                className="flex-1 ml-3 text-ink text-base font-sans-medium"
                placeholder="exemplo@email.com"
                placeholderTextColor={colors.ink[5]}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                accessibilityLabel="E-mail"
              />
            </View>

            <Text className="text-ink text-sm font-sans-bold mb-2">Senha</Text>
            <View className="bg-surface border border-b-2 border-surface-5 border-b-ink pl-4 flex-row items-center h-14">
              <Ionicons name="lock-closed-outline" size={20} color={colors.ink[4]} />
              <TextInput
                className="flex-1 ml-3 text-ink text-base font-sans-medium"
                placeholder="Sua senha"
                placeholderTextColor={colors.ink[5]}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                accessibilityLabel="Senha"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="w-12 h-14 items-center justify-center"
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.ink.DEFAULT} />
              </TouchableOpacity>
            </View>

            <View className="mt-8">
              <Button variant="primary" label="Entrar" icon="arrow-forward" onPress={handleLogin} loading={loading} />
            </View>

            <View className="flex-row justify-center items-center mt-6 min-h-12">
              <Text className="text-ink-4 text-base font-sans-medium">Não tem conta? </Text>
              <TouchableOpacity onPress={handleRegisterRedirect} accessibilityRole="button" className="min-h-12 justify-center">
                <Text className="text-ink text-base font-sans-bold underline">Cadastre-se</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
