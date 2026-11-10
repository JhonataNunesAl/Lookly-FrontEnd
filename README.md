# 👗 Lookly — TikTok de roupas com algoritmo de gosto
### React Native + Expo SDK 55 + TypeScript

---

## 🚀 Como rodar

### Opção 1 — Expo Snack (sem instalar nada)

1. Acesse **https://snack.expo.dev** e faça login
2. Crie a estrutura de pastas e cole cada arquivo
3. Adicione os pacotes via painel:
   - `@react-native-async-storage/async-storage`
   - `@react-navigation/native` + `@react-navigation/bottom-tabs`
   - `react-native-screens`
   - `react-native-safe-area-context`
   - `react-native-gesture-handler`
4. Instale o **Expo Go** no celular e escaneie o QR Code

### Opção 2 — Local com Node.js 18+

```bash
cd fitfeed
npm install
npx expo start
```

Escaneie o QR Code com o **Expo Go** (iOS / Android).

---

## 📁 Estrutura do projeto

```
fitfeed/
├── App.tsx                           ← raiz com navegação tipada
├── tsconfig.json                     ← config TypeScript strict
├── package.json
├── babel.config.js
├── app.json
└── src/
    ├── types/
    │   └── index.ts                  ← todos os tipos/interfaces
    ├── data/
    │   └── products.ts               ← 30 produtos tipados como Product[]
    ├── utils/
    │   └── algorithm.ts              ← motor de aprendizado de gosto
    ├── components/
    │   ├── Toast.tsx                 ← toast animado reutilizável
    │   └── ProductDetailSheet.tsx   ← bottom sheet de detalhes
    └── screens/
        ├── FeedScreen.tsx            ← feed de swipe principal
        ├── SearchScreen.tsx          ← busca + filtros
        ├── WishlistScreen.tsx        ← peças salvas
        └── ProfileScreen.tsx        ← DNA de estilo
```

---

## 🧠 Como o algoritmo funciona

| Fase | Interações | Comportamento |
|------|-----------|---------------|
| Exploração | 0–19 | Feed 100% aleatório (cold start) |
| Aprendizado | 20–49 | 80% por score de gosto + 20% descoberta |
| Expert | 50+ | Feed altamente personalizado |

Cada interação pontua os atributos do produto:
- ❤️ Like → **+2** em tags, cor, categoria, marca, faixa de preço
- 🔖 Save → **+4** (sinal mais forte de interesse)
- ✕ Skip → **-1** (reduz probabilidade de itens similares)

---

## ✨ Funcionalidades

- **Feed imersivo** com swipe e animações spring nativas
- **Algoritmo de gosto** que evolui com cada interação
- **Tela de busca** com filtros por categoria e estilo
- **Wishlist** com remoção por swipe
- **Perfil / DNA de Estilo** com gráficos de categoria e estilos

---

## 🔮 Melhorias Futuras

### 🔐 Autenticação e perfil em nuvem
- Login com Google / Apple ID via **Firebase Auth** ou **Supabase**
- Sincronização do perfil de gosto entre dispositivos
- Histórico de compras associado ao usuário

### 🤖 Algoritmo mais sofisticado
- Substituir o score simples por **machine learning on-device** com TensorFlow Lite
- Embeddings de produto via modelo de visão computacional (ex: CLIP) para reconhecer similaridade visual entre peças
- Fator de **sazonalidade** (priorizar peças de verão no verão)
- Decaimento temporal: itens curtidos há muito tempo perdem peso
- Collaborative filtering: "usuários parecidos com você também gostaram de..."

### 🎥 Vídeos de roupas
- Suporte a vídeos curtos (estilo TikTok real) dos produtos
- Modelos usando as peças em diferentes contextos (trabalho, praia, festa)
- Integração com câmera para "experimente virtualmente" com AR

### 🛒 E-commerce integrado
- Integração com APIs de lojas (Vtex, Shopify)
- Carrinho de compras nativo no app
- Checkout completo com pagamento via Pix, cartão, parcelamento
- Rastreamento de pedidos

### 👗 Prova virtual (AR)
- Câmera com sobreposição AR para "vestir" a peça virtualmente
- Integração com **MediaPipe** ou **ARKit/ARCore** para detecção de corpo
- Prévia de cores e tamanhos sobre a silhueta do usuário

### 📦 Painel de lojistas (Admin)
- Dashboard web para cadastro de produtos (foto, preço, descrição, tags)
- Métricas de engajamento por produto (quantos likes, saves, skips)
- Gestão de estoque com alerta de baixa quantidade
- Criação de coleções e campanhas sazonais

### 🔔 Notificações inteligentes
- **Push notifications** com "Nova peça do seu estilo chegou"
- Alerta de queda de preço em peças salvas
- Notificação de estoque baixo em itens da wishlist

### 🌐 Social e comunidade
- Feed de "o que estão usando" com fotos de usuários reais
- Sistema de seguidores e curadoria de looks
- Compartilhamento de outfit do dia
- Comentários e reações em produtos

### ♿ Acessibilidade
- Suporte completo a **VoiceOver** (iOS) e **TalkBack** (Android)
- Modo de alto contraste
- Tamanho de fonte ajustável respeitando configurações do sistema

### 📊 Analytics
- Integração com **Amplitude** ou **Mixpanel** para métricas de retenção
- Funil de conversão: feed → detalhe → carrinho → compra
- Heatmap de swipes por categoria/faixa de preço

### 🌍 Internacionalização
- Suporte a múltiplos idiomas com **i18next**
- Moedas internacionais (USD, EUR, ARS)
- Curadoria de marcas por região

---

## 🛠 Stack atual

| Tecnologia | Uso |
|---|---|
| React Native 0.83 | UI nativa |
| Expo SDK 55 | Toolchain e build |
| TypeScript 5.4 | Tipagem estrita |
| AsyncStorage | Persistência local do perfil |
| React Navigation 7 | Navegação (abas e pilha) |
