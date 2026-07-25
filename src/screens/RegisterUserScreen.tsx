import React, { useState } from 'react';
import {
  Alert,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { colors } from '../theme/colors';
import BirthDateInput from '../components/BirthDateInput';
import { toISODate, isAdult } from '../utils/birthDate';
import Button from '../components/Button';

// Estilos para o usuário escolher no onboarding
const INITIAL_STYLES = [
  { id: 'streetwear', label: 'Streetwear', emoji: '🧢' },
  { id: 'minimalista', label: 'Minimalista', emoji: '◻️' },
  { id: 'casual', label: 'Casual', emoji: '👟' },
  { id: 'elegante', label: 'Elegante', emoji: '✨' },
  { id: 'vintage', label: 'Vintage', emoji: '📷' },
  { id: 'esportivo', label: 'Esportivo', emoji: '🏃' },
];

export default function RegisterUserScreen(): React.ReactElement {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const toggleStyle = (id: string) => {
    if (selectedStyles.includes(id)) {
      setSelectedStyles(selectedStyles.filter(s => s !== id));
    } else {
      setSelectedStyles([...selectedStyles, id]);
    }
  };

const handleRegister = async () => {
  // 1. Validações Básicas
  if (!name || !email || !password) {
    Alert.alert("Atenção", "Por favor, preencha todos os campos principais.");
    return;
  }

  if (selectedStyles.length < 2) {
    Alert.alert("Estilos", "Selecione pelo menos 2 estilos para personalizarmos seu feed.");
    return;
  }

  // A tela nunca enviou birth_date antes — o trigger do banco cobria a
  // ausência com "hoje - 18 anos" para todo mundo, o que tornava o gate de
  // maioridade decorativo. Agora a idade real é coletada e checada aqui,
  // com a MESMA regra do backend (18 anos), antes de qualquer chamada.
  const birthDate = toISODate(birthDay, birthMonth, birthYear);
  if (!birthDate) {
    Alert.alert("Data inválida", "Confira o dia, mês e ano de nascimento.");
    return;
  }
  if (!isAdult(birthDate)) {
    Alert.alert("Idade mínima", "É necessário ter 18 anos ou mais para usar o Lookly.");
    return;
  }

  const usernameLimpo = username.trim().toLowerCase();
  if (usernameLimpo && !/^[a-z0-9_.]{3,30}$/.test(usernameLimpo)) {
    Alert.alert(
      "Nome de usuário inválido",
      "Use de 3 a 30 caracteres: letras minúsculas, números, \".\" ou \"_\".",
    );
    return;
  }

  setLoading(true);

  try {
    // Cadastro no Supabase Auth. O trigger do backend cria a linha em
    // `profiles`, lendo estes metadados — sem eles, cai no fallback (idade
    // exatamente no limite de 18 anos, username opaco `user_xxxxxxxx`).
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: name.trim(),
          birth_date: birthDate,
          ...(usernameLimpo ? { username: usernameLimpo } : {}),
        },
      },
    });

    if (error) {
      const msg = /already registered/i.test(error.message)
        ? 'Este e-mail já está cadastrado.'
        : /at least 6/i.test(error.message)
          ? 'A senha precisa ter ao menos 6 caracteres.'
          : 'Não foi possível realizar o cadastro.';
      Alert.alert('Erro no Cadastro', msg);
      return;
    }

    // Se a confirmação de e-mail estiver desligada no projeto, já existe sessão
    // e dá para entrar direto — full_name/birth_date/username já foram
    // gravados pelo trigger a partir do `options.data` acima, não precisa de
    // um PUT extra. (O perfil v2 não tem campo de estilos, então
    // `selectedStyles` fica só no onboarding por enquanto.)
    if (data.session) {
      navigation.replace('MainUser');
    } else {
      // Confirmação por e-mail ligada no projeto: sem sessão ainda. Pede o
      // código de 6 dígitos em vez de mandar pra um link (ver ConfirmEmailScreen).
      navigation.navigate('ConfirmEmail', {
        email: email.trim(),
        onConfirmedNavigateTo: 'MainUser',
      });
    }
  } catch (e) {
    Alert.alert('Erro no Cadastro', 'Não foi possível concluir o cadastro. Tente novamente.');
  } finally {
    setLoading(false);
  }
};

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <SafeAreaView className="flex-1">
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          >
            
            {/* Header */}
            <View className="mt-8 mb-10">
              <TouchableOpacity onPress={() => navigation.goBack()} className="mb-6">
                <Ionicons name="arrow-back" size={24} color={colors.ink.DEFAULT} />
              </TouchableOpacity>
              <Text className="text-ink text-3xl font-bold tracking-tight">Crie sua conta</Text>
              <Text className="text-ink-4 mt-2">Descubra peças que combinam com você.</Text>
            </View>

            {/* Inputs Principais */}
            <View className="gap-y-5 mb-10">
              <InputField 
                label="Nome Completo" 
                placeholder="Como quer ser chamado?" 
                icon="person-outline"
                value={name}
                onChange={setName}
              />
              
              <InputField 
                label="E-mail" 
                placeholder="seu@email.com" 
                icon="mail-outline"
                keyboardType="email-address"
                value={email}
                onChange={setEmail}
              />

              <InputField
                label="Senha"
                placeholder="Mínimo 6 caracteres"
                icon="lock-closed-outline"
                secureTextEntry
                value={password}
                onChange={setPassword}
              />

              <BirthDateInput
                day={birthDay}
                month={birthMonth}
                year={birthYear}
                onChangeDay={setBirthDay}
                onChangeMonth={setBirthMonth}
                onChangeYear={setBirthYear}
              />

              <InputField
                label="Nome de usuário (opcional)"
                placeholder="como_quer_aparecer"
                icon="at-outline"
                autoCapitalize="none"
                value={username}
                onChange={setUsername}
              />
            </View>

            {/* Seletor de Estilos (Diferencial Lookly) */}
            <View>
              <Text className="text-ink font-bold text-lg mb-1">O que você curte?</Text>
              <Text className="text-ink-5 text-xs mb-5 uppercase tracking-widest">Selecione pelo menos 2</Text>
              
              <View className="flex-row flex-wrap gap-3">
                {INITIAL_STYLES.map((style) => {
                  const isSelected = selectedStyles.includes(style.id);
                  return (
                    <TouchableOpacity
                      key={style.id}
                      onPress={() => toggleStyle(style.id)}
                      activeOpacity={0.7}
                      className={`flex-row items-center px-5 py-3 rounded-2xl border ${
                        isSelected ? 'bg-brand border-brand' : 'bg-surface border-surface-4'
                      }`}
                    >
                      <Text className="mr-2">{style.emoji}</Text>
                      <Text className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-ink-3'}`}>
                        {style.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Botão de Finalizar */}
            <View className="mt-12">
              <Button variant="primary" label="Começar minha jornada" onPress={handleRegister} loading={loading} />
            </View>

            <View className="flex-row justify-center mt-6">
              <Text className="text-ink-5 text-xs">Já tem conta? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
                <Text className="text-brand text-xs font-bold">Fazer login</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Componente de Input Reutilizável
function InputField({ label, placeholder, icon, secureTextEntry = false, keyboardType = 'default', autoCapitalize = 'sentences', value, onChange }: any) {
  return (
    <View>
      <Text className="text-ink-5 text-[10px] font-bold uppercase mb-2 ml-1 tracking-[2px]">{label}</Text>
      <View className="bg-surface border border-surface-4 rounded-2xl px-4 flex-row items-center h-16">
        <Ionicons name={icon} size={20} color={colors.ink[5]} />
        <TextInput
          className="flex-1 ml-3 text-ink"
          placeholder={placeholder}
          placeholderTextColor={colors.ink[6]}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          value={value}
          onChangeText={onChange}
        />
      </View>
    </View>
  );
}