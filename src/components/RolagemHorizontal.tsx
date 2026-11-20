import React, { useEffect, useRef } from 'react';
import { Platform, ScrollView, ScrollViewProps } from 'react-native';

/**
 * ScrollView horizontal que também rola no computador.
 *
 * No site (react-native-web) uma faixa horizontal só rolava arrastando o dedo
 * na tela de toque: com mouse não havia como ver o que passava da borda. Aqui,
 * no navegador, a roda do mouse rola a faixa para os lados, dá para arrastar com
 * o botão esquerdo (sem disparar o clique do item ao soltar) e a barra de
 * rolagem fica visível. No celular é um ScrollView horizontal comum.
 */
export default function RolagemHorizontal({ children, ...props }: ScrollViewProps): React.ReactElement {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const no: any = (ref.current as any)?.getScrollableNode?.();
    const janela: any = globalThis as any;
    if (!no || !janela.addEventListener) return undefined;

    const roda = (e: any) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || no.scrollWidth <= no.clientWidth) return;
      const antes = no.scrollLeft;
      no.scrollLeft += e.deltaY;
      // Só segura a rolagem da página quando a faixa realmente andou.
      if (no.scrollLeft !== antes) e.preventDefault();
    };

    let arrastando = false;
    let moveu = false;
    let x0 = 0;
    let s0 = 0;
    const desce = (e: any) => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || no.scrollWidth <= no.clientWidth) return;
      arrastando = true;
      moveu = false;
      x0 = e.clientX;
      s0 = no.scrollLeft;
    };
    const move = (e: any) => {
      if (!arrastando) return;
      const dx = e.clientX - x0;
      if (Math.abs(dx) > 5) moveu = true;
      if (!moveu) return;
      no.scrollLeft = s0 - dx;
      janela.getSelection?.()?.removeAllRanges?.(); // arrastar não seleciona texto
    };
    const sobe = () => {
      arrastando = false;
    };
    // Depois de arrastar, o clique de soltar não deve "apertar" o item.
    const clique = (e: any) => {
      if (!moveu) return;
      moveu = false;
      e.stopPropagation();
      e.preventDefault();
    };

    no.addEventListener('wheel', roda, { passive: false });
    no.addEventListener('pointerdown', desce);
    no.addEventListener('click', clique, true);
    janela.addEventListener('pointermove', move);
    janela.addEventListener('pointerup', sobe);
    return () => {
      no.removeEventListener('wheel', roda);
      no.removeEventListener('pointerdown', desce);
      no.removeEventListener('click', clique, true);
      janela.removeEventListener('pointermove', move);
      janela.removeEventListener('pointerup', sobe);
    };
  }, []);

  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={Platform.OS === 'web'}
      {...props}
    >
      {children}
    </ScrollView>
  );
}
