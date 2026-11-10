---
version: 1
slug: "app-tsx"
primary_target: "App.tsx"
related_targets: []
---

# Lookly: redesign completo do app (Android)

Escopo: app inteiro (comprador e loja), prioridade no feed de swipe. Modo: Operate (app de uso repetido, uma mão, em trânsito).

Usuário e tarefa: jovem brasileiro desliza peças de moda (foto em tela cheia) e decide curtir, passar ou salvar; depois abre detalhe, carrinho e perfil. Loja gerencia catálogo e estoque. Restrições: Android, Expo/NativeWind, Material 3 manda na estrutura (barra de navegação, alvos 48dp, snackbar), tokens semânticos espelhados em `tailwind.config.js` e `src/theme/colors.ts`, textos em português, sem inventar claims.

Direção escolhida: Catálogo vintage de loja (mala direta dos anos 60-70), escolhida pelo dono entre quatro opções de catálogo (lookbook de revista, ficha de catálogo impresso, grife, vintage) depois de recusar a primeira direção (sinalização de aeroporto — "o que eu queria era um catálogo").

Não resolvido: foto real das peças (hoje placeholder SVG não renderiza). O ícone do app já existe (`assets/icon.png`).

## Direction contract

THESIS: o app é um catálogo de loja folheado com o dedo: uma página por peça, com moldura, legenda e selo de preço. Recusa a grade de loja online e o minimalismo neutro.

OWN-WORLD: papel creme #F3E9D2 com folhas #FBF5E6, tinta marrom #2B1D12, vermelho de selo #B3261E (selo de preço, moldura da foto, aba ativa, ação Curtir), mostarda só sobre tinta escura. DM Serif Display nos títulos, nomes e preços (numerais de linha), Courier Prime só nos códigos de item ("Ref. 0001"), Hind no corpo. Cantos quase retos, filete duplo sob os cabeçalhos, linhas pontilhadas ligando rótulo a valor, carimbo inclinado ao arrastar. Reconhecível sem conteúdo: papel creme, moldura vermelha dupla e selo redondo de preço.

STORY: a pessoa entende em um segundo em que página está (cabeçalho), o que é a peça e quanto custa (legenda + selo) e o que pode fazer (três fichas: Passar, Curtir, Salvar). Acredita que folhear é leve e que a loja é de verdade.

FIRST VIEWPORT: masthead "Lookly" com filete duplo e chips de categoria; a foto numa moldura vermelha/tinta ocupando a página, com o selo redondo de preço pousado no canto inferior; legenda com nome em serifa, "Ref." datilografada e categoria em itálico; três fichas de ação (Curtir em vermelho no centro); barra de abas de papel com filete de tinta e marcador vermelho na aba ativa.

FORM: `catalogo-vintage-de-loja`, escolhido diretamente pelo dono entre as direções A-D apresentadas (D). Assinatura de interação: o carimbo de borracha inclinado (CURTIR / PASSAR) ao arrastar, e a legenda que entra como nova página a cada peça.

FINISH: o finish review rodou apenas na direção anterior (aeroporto); para o catálogo foi feita verificação no emulador (login, feed, busca, perfil, sheet, carrinho vazio) e o DESIGN.md foi reescrito. Telas da loja (dashboard, insights, catálogo, formulários) herdam os tokens mas não foram conferidas no aparelho.
