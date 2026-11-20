import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Text from '../components/Text';
import Campo from '../components/Campo';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import PecaFoto from '../components/PecaFoto';
import { CartItem, EnderecoEntrega } from '../types/commerce';
import { abrirPagamento, buscarCep, checkout, fetchCart, mensagemDeErroCheckout } from '../lib/commerce';
import { formatarMoeda } from '../utils/format';
import { colors } from '../theme/colors';

const CHAVE_ENDERECO = 'lookly:ultimo_endereco';

const VAZIO: EnderecoEntrega = {
  postal_code: '', street: '', number: '', complement: '', district: '', city: '', state: '',
};

/** 01001000 → 01001-000 enquanto digita. */
function mascaraCep(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/**
 * Checkout: resumo do carrinho + endereço de entrega + "Pagar com Mercado Pago".
 * O pagamento acontece na página do Mercado Pago (Pix, cartão, boleto); quando
 * aprovado, o backend marca o pedido como pago e ele aparece em Meus pedidos.
 */
export default function CheckoutScreen(): React.ReactElement {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [itens, setItens] = useState<CartItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [end, setEnd] = useState<EnderecoEntrega>(VAZIO);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tocado, setTocado] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [carrinho, salvo] = await Promise.all([fetchCart(), AsyncStorage.getItem(CHAVE_ENDERECO)]);
        setItens(carrinho);
        if (salvo) setEnd({ ...VAZIO, ...JSON.parse(salvo) });
      } catch {
        setErro('Não foi possível carregar o carrinho.');
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const mudar = (campo: keyof EnderecoEntrega) => (valor: string) => setEnd((e) => ({ ...e, [campo]: valor }));

  const mudarCep = useCallback(async (valor: string) => {
    const cep = mascaraCep(valor);
    setEnd((e) => ({ ...e, postal_code: cep }));
    if (cep.length === 9) {
      setBuscandoCep(true);
      const achado = await buscarCep(cep);
      setBuscandoCep(false);
      if (achado) setEnd((e) => ({ ...e, ...Object.fromEntries(Object.entries(achado).filter(([, v]) => v)) }));
    }
  }, []);

  const total = itens.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);

  const faltando: Partial<Record<keyof EnderecoEntrega, string>> = {};
  if (!/^\d{5}-?\d{3}$/.test(end.postal_code)) faltando.postal_code = 'CEP com 8 números';
  if (end.street.trim().length < 2) faltando.street = 'Informe a rua';
  if (!end.number.trim()) faltando.number = 'Informe o número (ou "S/N")';
  if (end.district.trim().length < 2) faltando.district = 'Informe o bairro';
  if (end.city.trim().length < 2) faltando.city = 'Informe a cidade';
  if (!/^[A-Za-z]{2}$/.test(end.state.trim())) faltando.state = 'UF com 2 letras';
  const valido = Object.keys(faltando).length === 0;

  const pagar = async () => {
    setTocado(true);
    if (!valido || enviando) return;
    setEnviando(true);
    setErro(null);
    const endereco = { ...end, state: end.state.trim().toUpperCase() };
    try {
      await AsyncStorage.setItem(CHAVE_ENDERECO, JSON.stringify(endereco)).catch(() => {});
      const r = await checkout(endereco);
      await abrirPagamento(r.payment_url);
      // No celular a pessoa volta para o app depois de pagar: mostra o pedido.
      if (Platform.OS !== 'web') navigation.replace('Pedidos', { pedidoId: r.order_id });
    } catch (e) {
      setErro(mensagemDeErroCheckout(e));
    } finally {
      setEnviando(false);
    }
  };

  const erroDe = (c: keyof EnderecoEntrega) => (tocado ? faltando[c] ?? null : null);

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScreenHeader title="Finalizar compra" subtitle="Entrega e pagamento" onBack={() => navigation.goBack()} />

      {carregando ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.ink.DEFAULT} size="large" />
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
            {/* Resumo */}
            <Text className="text-ink text-xl font-display-bold mb-2">Resumo</Text>
            {itens.map((i) => (
              <View key={i.lookId} className="flex-row items-center bg-surface border border-surface-5 rounded-card p-2 mb-2">
                <PecaFoto uri={i.photo} compact className="w-12 h-16 rounded-lg" />
                <View className="flex-1 ml-3">
                  <Text className="text-ink text-base font-sans-bold" numberOfLines={1}>{i.name}</Text>
                  <Text className="text-ink-4 text-sm">{i.quantity} × {formatarMoeda(i.unitPrice, true)}</Text>
                </View>
                <Text className="text-ink text-base font-display-bold">{formatarMoeda(i.unitPrice * i.quantity, true)}</Text>
              </View>
            ))}

            {/* Endereço */}
            <Text className="text-ink text-xl font-display-bold mt-4 mb-2">Endereço de entrega</Text>
            <View className="gap-y-3">
              <Campo
                rotulo="CEP"
                value={end.postal_code}
                onChangeText={mudarCep}
                keyboardType="number-pad"
                placeholder="00000-000"
                dica={buscandoCep ? 'Buscando endereço…' : 'Preenchemos rua, bairro e cidade pelo CEP.'}
                erro={erroDe('postal_code')}
              />
              <Campo rotulo="Rua" value={end.street} onChangeText={mudar('street')} erro={erroDe('street')} />
              <View className="flex-row gap-x-3">
                <View className="w-28">
                  <Campo rotulo="Número" value={end.number} onChangeText={mudar('number')} erro={erroDe('number')} />
                </View>
                <View className="flex-1">
                  <Campo rotulo="Complemento" value={end.complement} onChangeText={mudar('complement')} placeholder="Opcional" />
                </View>
              </View>
              <Campo rotulo="Bairro" value={end.district} onChangeText={mudar('district')} erro={erroDe('district')} />
              <View className="flex-row gap-x-3">
                <View className="flex-1">
                  <Campo rotulo="Cidade" value={end.city} onChangeText={mudar('city')} erro={erroDe('city')} />
                </View>
                <View className="w-20">
                  <Campo
                    rotulo="UF"
                    value={end.state}
                    onChangeText={(v) => mudar('state')(v.toUpperCase().slice(0, 2))}
                    autoCapitalize="characters"
                    erro={erroDe('state')}
                  />
                </View>
              </View>
            </View>

            {/* Pagamento */}
            <View className="flex-row items-center bg-surface border border-surface-5 rounded-card p-4 mt-5">
              <Ionicons name="shield-checkmark-outline" size={26} color={colors.ink.DEFAULT} />
              <Text className="text-ink-3 text-sm flex-1 ml-3 leading-5">
                Você paga na página segura do Mercado Pago, com Pix, cartão ou boleto. O Lookly não vê os dados do seu cartão.
              </Text>
            </View>

            {erro ? <Text className="text-seal text-base font-sans-bold mt-4">{erro}</Text> : null}
          </ScrollView>

          <SafeAreaView edges={['bottom']} className="bg-surface border-t-2 border-dashed border-ink">
            <View className="px-5 pt-3 pb-4">
              <View className="flex-row items-end mb-3">
                <Text className="text-ink text-xl font-display-bold">Total</Text>
                <View className="flex-1 mx-2 mb-2 border-b border-dotted border-ink-5" />
                <Text className="text-seal text-display-sm font-display-bold">{formatarMoeda(total, true)}</Text>
              </View>
              <Button
                variant="primary"
                label="Pagar com Mercado Pago"
                icon="lock-closed-outline"
                onPress={pagar}
                loading={enviando}
                disabled={itens.length === 0}
              />
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
