import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { registrarErro } from '../lib/logger';
import { colors } from '../theme/colors';

interface Estado {
  erro: Error | null;
}

/**
 * Rede de segurança de renderização: se qualquer tela quebrar ao desenhar, a
 * pessoa vê esta ficha — em vez de o app fechar sozinho — e o erro é registrado
 * (`lib/logger`). O visual usa só os primitivos do React Native e estilos
 * diretos de propósito: se o problema estiver no `Text`/`Button` do tema, esta
 * tela precisa continuar funcionando.
 */
export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, Estado> {
  state: Estado = { erro: null };

  static getDerivedStateFromError(erro: Error): Estado {
    return { erro };
  }

  componentDidCatch(erro: Error, info: React.ErrorInfo): void {
    const linha = (info.componentStack ?? '').split('\n').find((l) => l.trim().length > 0)?.trim();
    registrarErro(erro, { origem: 'boundary', nivel: 'fatal', contexto: { componente: linha ?? null } });
  }

  render(): React.ReactNode {
    if (!this.state.erro) return this.props.children;
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <Text style={{ color: colors.ink.DEFAULT, fontSize: 26, fontWeight: '700', textAlign: 'center' }}>
          Algo deu errado
        </Text>
        <Text style={{ color: colors.ink[3], fontSize: 16, textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
          O erro foi registrado e vamos corrigir. Toque abaixo para voltar ao app.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tentar de novo"
          onPress={() => this.setState({ erro: null })}
          style={{
            minHeight: 56,
            minWidth: 200,
            paddingHorizontal: 24,
            backgroundColor: colors.ink.DEFAULT,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
          }}
        >
          <Text style={{ color: colors.white, fontSize: 16, fontWeight: '700' }}>Tentar de novo</Text>
        </Pressable>
      </View>
    );
  }
}
