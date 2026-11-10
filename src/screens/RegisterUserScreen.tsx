import React, { useState } from 'react';
import {
  Alert,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Text from '../components/Text';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { colors } from '../theme/colors';
import BirthDateInput from '../components/BirthDateInput';
import { toISODate, isAdult } from '../utils/birthDate';
import { seedStyles } from '../utils/algorithm';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';

// Estilos para o usuário escolher no onboarding
const INITIAL_STYLES = [
  { id: 'streetwear', label: 'Streetwear' },
  { id: 'minimalista', label: 'Minimalista' },
  { id: 'casual', label: 'Casual' },
  { id: 'elegante', label: 'Elegante' },
  { id: 'vintage', label: 'Vintage' },
  { id: 'esportivo', label: 'Esportivo' },
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

    // O perfil v2 não tem campo de estilos no servidor, então eles semeiam o DNA
    // de estilo local (o que aparece no Perfil).
    await seedStyles(selectedStyles).catch(() => {});

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
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScreenHeader title="Criar conta" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1">
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          >
            
            <Text className="text-ink text-lg font-sans-semibold mt-6 mb-8">
              Descubra peças que combinam com você.
            </Text>

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
              <Text className="text-ink text-xl font-display-bold mb-1">O que você curte?</Text>
              <Text className="text-ink-3 text-base mb-4">Escolha pelo menos 2 estilos.</Text>
              
              <View className="flex-row flex-wrap gap-3">
                {INITIAL_STYLES.map((style) => {
                  const isSelected = selectedStyles.includes(style.id);
                  return (
                    <TouchableOpacity
                      key={style.id}
                      onPress={() => toggleStyle(style.id)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      className={`flex-row items-center px-4 min-h-12 rounded-card border-2 border-ink ${
                        isSelected ? 'bg-ink' : 'bg-surface'
                      }`}
                    >
                      {isSelected && <Ionicons name="checkmark" size={18} color={colors.signal.DEFAULT} style={{ marginRight: 6 }} />}
                      <Text className={`font-sans-bold text-base ${isSelected ? 'text-white' : 'text-ink'}`}>
                        {style.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Botão de Finalizar */}
            <View className="mt-12">
              <Button variant="primary" label="Criar conta" icon="arrow-forward" onPress={handleRegister} loading={loading} />
            </View>

            <View className="flex-row justify-center items-center mt-4">
              <Text className="text-ink-4 text-base">Já tem conta? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login' as never)} accessibilityRole="button" className="min-h-12 justify-center">
                <Text className="text-ink text-base font-sans-bold underline">Fazer login</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// Componente de Input Reutilizável
function InputField({ label, placeholder, icon, secureTextEntry = false, keyboardType = 'default', autoCapitalize = 'sentences', value, onChange }: any) {
  return (
    <View>
      <Text className="text-ink text-sm font-sans-bold mb-2">{label}</Text>
      <View className="bg-surface border border-b-2 border-surface-5 border-b-ink px-4 flex-row items-center h-16">
        <Ionicons name={icon} size={20} color={colors.ink[5]} />
        <TextInput
          className="flex-1 ml-3 text-ink"
          placeholder={placeholder}
          placeholderTextColor={colors.ink[5]}
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