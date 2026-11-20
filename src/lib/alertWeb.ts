import { Alert, Platform, type AlertButton } from 'react-native';

/**
 * No navegador (react-native-web) o `Alert.alert` não faz nada: avisos de erro e
 * confirmações ("Remover dos salvos?") simplesmente sumiam no site. Aqui ele passa
 * a usar os diálogos do próprio navegador, para o app inteiro, sem mudar as telas:
 *  - sem botões ou com um botão só → `window.alert` e depois o onPress desse botão;
 *  - com "cancelar" + ação → `window.confirm`; OK roda a ação, Cancelar roda o cancel;
 *  - com várias ações → `window.confirm` para cada uma, na ordem, até a pessoa aceitar.
 * No celular nada muda.
 */
// O tsconfig do app não inclui os tipos do DOM; só o que usamos daqui.
declare const window: { alert(texto: string): void; confirm(texto: string): boolean } | undefined;

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (titulo: string, mensagem?: string, botoes?: AlertButton[]) => {
    const texto = [titulo, mensagem].filter(Boolean).join('\n\n');
    const lista = botoes ?? [];
    const cancelar = lista.find((b) => b.style === 'cancel');
    const acoes = lista.filter((b) => b.style !== 'cancel');

    if (acoes.length === 0) {
      window.alert(texto);
      cancelar?.onPress?.();
      return;
    }
    if (acoes.length === 1 && !cancelar) {
      window.alert(texto);
      acoes[0].onPress?.();
      return;
    }
    for (const acao of acoes) {
      const pergunta = acoes.length === 1 ? texto : `${texto}\n\nOK = "${acao.text ?? 'OK'}"`;
      if (window.confirm(pergunta)) {
        acao.onPress?.();
        return;
      }
    }
    cancelar?.onPress?.();
  };
}
