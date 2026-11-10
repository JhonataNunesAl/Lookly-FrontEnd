import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Text from '../components/Text';
import Button from '../components/Button';
import Campo from '../components/Campo';
import ScreenHeader from '../components/ScreenHeader';
import { supabase } from '../lib/supabase';
import { excluirMinhaConta } from '../lib/profile';
import { resetProfile } from '../utils/algorithm';
import { colors } from '../theme/colors';

const PALAVRA = 'EXCLUIR';

const O_QUE_SAI = [
  'Seu perfil, suas medidas e a foto de perfil.',
  'Peças salvas, coleções, curtidas e o carrinho.',
  'Se você tem uma loja: a loja, todas as peças e as fotos enviadas.',
  'O seu login — não será possível entrar de novo com este e-mail.',
];

/**
 * Excluir a conta, de verdade e para sempre (exigência da LGPD e das lojas de
 * aplicativo). Três barreiras contra o clique por engano: digitar a palavra
 * EXCLUIR, digitar a senha (reautenticação) e uma confirmação final. O servidor
 * apaga os dados e o login; aqui só pedimos e, no fim, encerramos a sessão local
 * e voltamos ao login.
 */
export default function ExcluirContaScreen(): React.ReactElement {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [palavra, setPalavra] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const pronto = palavra.trim() === PALAVRA && senha.length > 0 && !excluindo;

  const executar = async () => {
    setExcluindo(true);
    setErro(null);
    try {
      // Reautentica: prova que quem está no aparelho conhece a senha.
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user.email;
      if (!email) throw new Error('sem-sessao');
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) {
        setErro('Senha incorreta.');
        return;
      }

      await excluirMinhaConta();

      // O login já foi apagado no servidor: encerra só a sessão local.
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      await resetProfile().catch(() => {});
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      Alert.alert('Conta excluída', 'Seus dados foram apagados. Obrigado por ter usado o Lookly.');
    } catch (e: any) {
      const status = e?.response?.status;
      const detalhe = e?.response?.data?.detail;
      if (e?.message === 'sem-sessao') {
        setErro('Sua sessão expirou. Entre de novo e tente outra vez.');
      } else if (status === 409 && typeof detalhe === 'string') {
        setErro(detalhe); // ex.: conta com pedidos
      } else if (status === 429) {
        setErro('Muitas tentativas. Aguarde um pouco e tente de novo.');
      } else if (status === 502 || status === 503) {
        setErro('Não foi possível concluir agora. Seus dados podem ter sido apagados em parte — toque de novo para terminar.');
      } else {
        setErro('Não foi possível excluir a conta. Verifique a conexão e tente de novo.');
      }
    } finally {
      setExcluindo(false);
    }
  };

  const confirmarEExecutar = () => {
    Alert.alert(
      'Excluir a conta para sempre?',
      'Isso não pode ser desfeito.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: executar },
      ],
    );
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScreenHeader title="Excluir conta" subtitle="Esta ação não tem volta" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 20 }}
        >
          <View className="bg-surface border border-surface-5 rounded-card p-4">
            <Text className="text-ink text-lg font-display-bold mb-2">O que será apagado</Text>
            {O_QUE_SAI.map((linha) => (
              <View key={linha} className="flex-row gap-2 mb-1.5">
                <MaterialCommunityIcons name="close-circle-outline" size={20} color={colors.danger} style={{ marginTop: 2 }} />
                <Text className="flex-1 text-ink-2 text-base">{linha}</Text>
              </View>
            ))}
            <Text className="text-ink-4 text-sm font-display-italic mt-2">
              Contas com pedidos registrados não podem ser excluídas pelo app: fale com o suporte.
            </Text>
          </View>

          <Campo
            rotulo={`Digite ${PALAVRA} para confirmar`}
            placeholder={PALAVRA}
            value={palavra}
            onChangeText={(v) => { setPalavra(v); setErro(null); }}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
          />
          <Campo
            rotulo="Sua senha"
            placeholder="Para provar que é você"
            value={senha}
            onChangeText={(v) => { setSenha(v); setErro(null); }}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            erro={erro}
          />

          <Button
            variant="danger"
            label="Excluir minha conta"
            icon="trash-outline"
            onPress={confirmarEExecutar}
            loading={excluindo}
            disabled={!pronto}
          />
          <Button variant="secondary" label="Cancelar" onPress={() => navigation.goBack()} disabled={excluindo} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
