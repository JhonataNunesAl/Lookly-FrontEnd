# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

Jovens brasileiros que descobrem moda pelo celular e querem achar peças do estilo deles sem precisar buscar. Usam o app em pequenos intervalos (fila, transporte, sofá), com uma mão, deslizando. Segundo público, no mesmo login: lojas/marcas que publicam as peças, gerenciam catálogo e estoque e acompanham métricas. Uma pessoa pode ser as duas coisas e "virar loja" depois, sem novo cadastro.

## Product Purpose

Lookly é um feed de moda estilo Tinder/Reels. A pessoa desliza uma sequência de looks (foto em tela cheia): para a direita curte, para a esquerda passa, e salva à parte o que tem intenção de comprar. Curtir e salvar são gestos separados de propósito (curtir é barato e frequente; salvar sinaliza intenção de compra). As lojas vendem as peças pelo próprio app (carrinho real; pedidos/pagamento ainda não existem). Sucesso: a pessoa passa muitas peças por sessão, salva o que gosta e chega ao carrinho; a loja é descoberta sem a pessoa ter que procurar.

## Positioning

O catálogo é o próprio feed: uma peça publicada por uma loja é ao mesmo tempo o post que se desliza e o item à venda. O app aprende o gosto por categoria a partir de curtidas (+2) e salvamentos (+4). Uma loja online comum não tem esse ritmo de descoberta por gesto; uma rede social de moda não vende dentro.

## Operating Context

App nativo Android (Expo SDK 55, React Native 0.83, NativeWind/Tailwind), TypeScript. Backend FastAPI (Lucker) hospedado no Render, banco Postgres e autenticação no Supabase. Tudo em português do Brasil (código, comentários e textos de interface). Dois conjuntos de abas: comprador (feed, busca, salvos, perfil) e loja (início, itens, insights, marca). Telas empurradas: carrinho, pedidos, detalhe de loja, criar/editar loja, documento fiscal, medidas corporais, "Em breve". Primeiro request depois de ocioso pode levar ~40s (plano gratuito do Render).

## Capabilities and Constraints

- Real hoje: cadastro/login com confirmação por código, feed paginado com filtro opcional por categoria, curtir/passar/salvar, detalhe da peça, busca de looks e lojas, salvos, perfil com afinidade por categoria, virar vendedor com verificação de CNPJ, catálogo e estoque da loja, publicar/editar/remover peça com fotos (upload de imagem), troca de logo da loja e de foto de perfil, painel e insights da loja calculados sobre o catálogo real (curtidas, salvos, estoque), carrinho (adicionar, aumentar, diminuir, remover; com checagem de estoque).
- Ainda mock ou ausente: pedidos/checkout/pagamento, vendas e faturamento da loja, visualizações por peça, upload de vídeo, notificações, "Estilos" do perfil (motor local, sem tags no backend).
- Um look tem de 1 a 6 fotos e até 2 vídeos; a categoria é obrigatória; não há tags, cores nem marca na peça.
- A paleta vive espelhada em `tailwind.config.js` e `src/theme/colors.ts` (mudar um, mudar o outro); usar tokens semânticos, nunca hex solto.
- Fontes carregadas via expo-font; React Native não tem peso de fonte real em fonte customizada, cada peso é uma família própria (`font-sans-*`, `font-display*`).
- O código só vai ao GitHub quando o dono pedir; nada é enviado automaticamente.

## Brand Commitments

Nome: Lookly (o pacote chama-se `fitfeed` e o repositório do backend `Lucker`, por histórico; nome de produto é Lookly). Identidade visual atual: catálogo vintage de loja (mala direta dos anos 60-70), escolhida pelo dono. A primeira versão do redesign ("sinalização de aeroporto") foi recusada; não voltar a ela. Funcionalidade e conteúdo não mudam com o visual.

## Evidence on Hand

Dados de teste no banco: 4 categorias (Gótica, Vintage, Streetwear, Sertanejo) e looks de exemplo (ex.: "Vestido Corset Preto", R$ 289,90) cujas fotos são placeholders de `placehold.co` em SVG, que o React Native não renderiza (hoje aparecem em branco). Não há fotos reais de peças. O ícone do app existe (selo vermelho com um "L" em serifa, em `assets/`) e o app já tem configuração de build Android via EAS (`eas.json`). Não existem depoimentos, métricas ou números de usuários reais; nada disso deve ser inventado.

## Product Principles

1. A foto da peça é o protagonista; a interface serve o gesto de deslizar.
2. Curtir e salvar são gestos diferentes e a interface deve deixar a diferença óbvia.
3. O ritmo importa: ação com uma mão, resposta imediata, pouca leitura.
4. O app vende moda brasileira para quem descobre pelo gosto, não pela busca.
5. Estados vazios, de carregamento e de erro fazem parte do produto (o back pode levar ~40s para acordar).

## Accessibility & Inclusion

Alvos de toque confortáveis para uso com uma mão e contraste de texto verificado (o design atual mediu ink sobre fundo claro; qualquer cor nova de texto precisa manter pelo menos 4,5:1). Botões só com ícone precisam de rótulo de acessibilidade.
