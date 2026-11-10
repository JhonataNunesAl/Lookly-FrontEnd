import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Text from '../components/Text';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert} from 'react-native';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';
import api from '../lib/api';
import { colors } from '../theme/colors';
import { SellerCreate } from '../types/api';
import BirthDateInput from '../components/BirthDateInput';
import { toISODate, isAdult } from '../utils/birthDate';
import { slugify } from '../utils/format';
import { submitSellerDocument } from '../lib/sellers';
import ScreenHeader from '../components/ScreenHeader';

export default function RegisterCompanyScreen(): React.ReactElement {
  const [logo, setLogo] = useState<string | null>(null);
  const [brandName, setBrandName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cnpj, setCnpj] = useState('');
  const [bio, setBio] = useState('');
  const [category, setCategory] = useState('Streetwear');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const categories = ['Streetwear', 'Casual', 'Elegante', 'Minimalista', 'Vintage'];
  

const handleRegister = async () => {
  // 1. Validações básicas no Front
  if (!brandName || !email || !password) {
    Alert.alert("Erro", "Preencha os campos obrigatórios.");
    return;
  }

  // O dono da loja também ganha uma linha em `profiles` (mesma tabela,
  // mesma trigger) — sem enviar birth_date, essa linha nascia com a idade
  // caindo exatamente no limite de 18 anos pra qualquer pessoa, tornando o
  // gate decorativo. Mesma regra do backend, checada antes de qualquer chamada.
  const birthDate = toISODate(birthDay, birthMonth, birthYear);
  if (!birthDate) {
    Alert.alert("Data inválida", "Confira o dia, mês e ano de nascimento do responsável.");
    return;
  }
  if (!isAdult(birthDate)) {
    Alert.alert("Idade mínima", "É necessário ter 18 anos ou mais para cadastrar uma loja.");
    return;
  }

  setLoading(true);

  try {
    // 1. Cria a conta no Supabase Auth (o trigger do backend gera o `profiles`).
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { birth_date: birthDate } },
    });

    if (error) {
      const msg = /already registered/i.test(error.message)
        ? 'Este e-mail já está cadastrado.'
        : /at least 6/i.test(error.message)
          ? 'A senha precisa ter ao menos 6 caracteres.'
          : 'Não foi possível criar a conta.';
      Alert.alert('Erro no Cadastro', msg);
      return;
    }

    // `category` não existe no SellerCreate v2 e o CNPJ é cifrado à parte, então
    // não vão neste payload: o CNPJ segue por `documentPayload` e é gravado em
    // PUT /sellers/me/document logo depois da loja (antes era digitado e descartado).
    const documentPayload = cnpj.trim()
      ? ({ document_number: cnpj.trim(), document_type: 'CNPJ' } as const)
      : undefined;
    const sellerPayload: SellerCreate = {
      store_name: brandName.trim(),
      store_slug: slugify(brandName),
      description: bio.trim() || undefined,
      ...(logo ? { store_logo_url: logo } : {}),
    };

    // Sem sessão = confirmação de e-mail está ligada no projeto. POST /sellers
    // exige JWT, que só existe depois do código confirmado — o payload da loja
    // viaja com a navegação e só é enviado lá (ver ConfirmEmailScreen).
    if (!data.session) {
      navigation.navigate('ConfirmEmail', {
        email: email.trim(),
        onConfirmedNavigateTo: 'MainBusiness',
        sellerPayload,
        documentPayload,
      });
      return;
    }

    // Confirmação de e-mail desligada no projeto: sessão já existe, cria a loja direto.
    await api.post('/sellers', sellerPayload);
    if (documentPayload) {
      try {
        await submitSellerDocument(documentPayload);
      } catch {
        Alert.alert(
          'Loja criada, documento não',
          'Não foi possível validar o CNPJ agora. Você pode enviá-lo depois, em Perfil > Documento fiscal.',
        );
      }
    }
    navigation.replace('MainBusiness');
  } catch (error: any) {
    const detail = error?.response?.data?.detail;
    const msg = Array.isArray(detail)
      ? detail[0]?.msg
      : detail || 'Não foi possível concluir o cadastro da loja.';
    Alert.alert('Ops!', msg);
  } finally {
    setLoading(false);
  }
};


  return (
    
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScreenHeader title="Conta empresa" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1">
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          >
            
            <Text className="text-ink text-lg font-sans-semibold mt-6 mb-6">
              Dados da marca e acesso ao painel.
            </Text>

            {/* Upload de Logo */}
            <View className="items-center mb-10">
              <TouchableOpacity 
                activeOpacity={0.8}
                className="w-28 h-28 rounded-card bg-surface border-2 border-dashed border-ink items-center justify-center overflow-hidden"
              >
                {logo ? (
                  <Image source={{ uri: logo }} className="w-full h-full" />
                ) : (
                  <View className="items-center">
                    <Ionicons name="cloud-upload-outline" size={32} color={colors.ink.DEFAULT} />
                    <Text className="text-ink text-sm font-sans-bold mt-1">Logo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Formulário Completo */}
            <View className="gap-y-6">
              
              <InputField 
                label="Nome da Marca" 
                placeholder="Ex: Lookly Studio" 
                value={brandName}
                onChange={setBrandName}
                icon="business-outline"
              />

              {/* Campo CNPJ Mantido */}
              <InputField 
                label="Cnpj" 
                placeholder="00.000.000/0000-00" 
                value={cnpj}
                onChange={setCnpj}
                icon="document-text-outline"
                keyboardType="numeric"
              />

              <InputField 
                label="E-mail de Acesso" 
                placeholder="contato@suamarca.com" 
                value={email}
                onChange={setEmail}
                icon="mail-outline"
                keyboardType="email-address"
              />

              <View>
                <Text className="text-ink text-sm font-sans-bold mb-2">Senha</Text>
                <View className="bg-surface border border-b-2 border-surface-5 border-b-ink px-4 flex-row items-center h-16">
                  <Ionicons name="lock-closed-outline" size={20} color={colors.ink[5]} />
                  <TextInput
                    className="flex-1 ml-3 text-ink font-sans-medium"
                    placeholder="••••••••"
                    placeholderTextColor={colors.ink[5]}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="w-12 h-14 -mr-3 items-center justify-center"
                  >
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color={colors.ink.DEFAULT} />
                  </TouchableOpacity>
                </View>
              </View>

              <BirthDateInput
                day={birthDay}
                month={birthMonth}
                year={birthYear}
                onChangeDay={setBirthDay}
                onChangeMonth={setBirthMonth}
                onChangeYear={setBirthYear}
              />

              <View>
                <Text className="text-ink text-sm font-sans-bold mb-2">Bio da marca</Text>
                <View className="bg-surface border border-b-2 border-surface-5 border-b-ink px-4 py-3 h-28">
                  <TextInput
                    className="text-ink text-sm"
                    placeholder="Descreva o estilo da sua marca para os clientes..."
                    placeholderTextColor={colors.ink[5]}
                    multiline
                    textAlignVertical="top"
                    value={bio}
                    onChangeText={setBio}
                  />
                </View>
              </View>

              {/* Seletor de Segmento */}
              <View>
                <Text className="text-ink text-sm font-sans-bold mb-2">Segmento principal</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                  {categories.map((cat) => (
                    <TouchableOpacity 
                      key={cat}
                      onPress={() => setCategory(cat)}
                      className={`mr-2 min-h-12 px-4 justify-center rounded-lg border-2 border-ink ${category === cat ? 'bg-ink' : 'bg-surface'}`}
                    >
                      <Text className={`text-sm font-sans-bold ${category === cat ? 'text-white' : 'text-ink'}`}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

            </View>

            {/* Botão Finalizar */}
            <View className="mt-6">
              <Button variant="primary" label="Criar conta empresa" icon="arrow-forward" onPress={handleRegister} loading={loading} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// Sub-componente de Input
function InputField({ label, placeholder, value, onChange, icon, keyboardType = 'default' }: any) {
  return (
    <View>
      <Text className="text-ink text-sm font-sans-bold mb-2">{label}</Text>
      <View className="bg-surface border border-b-2 border-surface-5 border-b-ink px-4 flex-row items-center h-16">
        <Ionicons name={icon} size={20} color={colors.ink[5]} />
        <TextInput
          className="flex-1 ml-3 text-ink font-sans-medium"
          placeholder={placeholder}
          placeholderTextColor={colors.ink[5]}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType}
          autoCapitalize="none"
        />
      </View>
    </View>
  );
}