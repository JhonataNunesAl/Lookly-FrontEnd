# Lookly — documentação do projeto

Este documento explica o que o Lookly é, como as peças se encaixam e por que
foram construídas do jeito que foram. É o ponto de partida pra entender o
sistema — para o detalhe técnico de cada arquivo, os `CLAUDE.md` de cada
repositório (`lookly-front/CLAUDE.md` e `Lucker/CLAUDE.md`) são a referência
viva, atualizada a cada mudança.

---

## 1. O que é o Lookly

Um app estilo Tinder/Reels pra moda: a pessoa desliza um feed de peças de
roupa (fotos, em breve vídeo) publicadas por lojas, curte ou salva o que
gosta. Dois perfis convivem no mesmo login:

- **Comprador** — desliza o feed, salva peças, (no futuro) compra.
- **Loja/vendedor** — publica peças, gerencia catálogo, vê métricas.

Uma pessoa pode ser as duas coisas com a mesma conta: começa como
comprador e pode "virar loja" depois, sem criar um cadastro novo.

**Nomenclatura, de propósito confusa**: o repositório do backend chama-se
`Lucker`, o produto chama-se `Lookly`, e o pacote do app React Native chama-se
`fitfeed`. Três nomes pra mesma coisa — histórico do projeto, não vale a pena
unificar (o nome aparece em bundle IDs e tokens salvos).

---

## 2. Os dois repositórios

```
lookly-front/   → o app (React Native + Expo). O que a pessoa toca.
Lucker/         → a API (FastAPI). Toda a regra de negócio mora aqui.
```

Não existe um "repositório raiz" que junte os dois — são projetos irmãos,
cada um com seu próprio `CLAUDE.md`, rodando e sendo versionados
separadamente. O `lookly-front` fala com o `Lucker` por HTTP; o `Lucker` fala
com o Postgres do Supabase.

---

## 3. Arquitetura — como uma requisição viaja

```
┌─────────────┐     JWT (Bearer)      ┌──────────────┐     asyncpg      ┌──────────────┐
│  App (RN)   │ ────────────────────► │  Lucker API  │ ───────────────► │   Postgres   │
│ lookly-front│                       │  (FastAPI)   │                  │  (Supabase)  │
└──────┬──────┘                       └──────────────┘                  └──────────────┘
       │
       │ login/cadastro (direto, sem passar pelo Lucker)
       ▼
┌──────────────┐
│ Supabase Auth│
└──────────────┘
```

Dois pontos importantes de entender logo de cara:

**O Lucker nunca autentica ninguém.** Login e cadastro acontecem direto entre
o app e o Supabase Auth (`supabase-js`), que devolve um JWT. Esse JWT vai no
header `Authorization: Bearer <token>` em toda chamada ao Lucker, que só
**valida** o token (contra as chaves públicas do Supabase) e lê de quem é —
nunca guarda senha, nunca emite token.

**O Lucker conecta no banco como um usuário fixo e privilegiado**
(`DATABASE_URL`, role `postgres`), não como a pessoa logada. Isso significa
que o RLS (Row Level Security) configurado no Postgres **não protege nada**
que passe pelo Lucker — ele só protegeria alguém que extraísse a chave pública
do Supabase de dentro do app e batesse direto no banco via PostgREST,
contornando a API. A proteção de verdade, pra tudo que passa pela API, é o
código dentro de `Lucker/app/service/*.py` — quem verifica se a peça é
realmente sua, se a loja é realmente sua, etc. Isso mudou o jeito de pensar
segurança no projeto: **nenhuma rota nova pode confiar no banco pra se
proteger.**

---

## 4. Autenticação e papéis

- **Cadastro**: o app chama `supabase.auth.signUp` diretamente. Um gatilho no
  banco (`handle_new_user`) cria a linha correspondente em `profiles`
  automaticamente quando a conta nasce no Supabase Auth — o app não precisa
  (nem consegue) criar esse registro na mão.
- **Confirmação por código, não por link.** O fluxo padrão do Supabase manda
  um link de confirmação por e-mail. Isso não funciona bem num app mobile: sem
  domínio configurado o link cai num destino inexistente, e clientes de
  e-mail (Gmail, Outlook, principalmente o Apple Mail) pré-carregam todo link
  recebido pra escanear segurança — o que consome o token antes da pessoa
  clicar de verdade. A solução foi trocar por um código de 6 dígitos digitado
  no app (`ConfirmEmailScreen`) — não existe link nenhum pra ser
  pré-carregado.
- **Login**: `supabase.auth.signInWithPassword`, depois o app chama
  `GET /api/profiles/me` e decide pra qual área ir — comprador ou loja — com
  base no campo **`is_seller`**, que o servidor resolve sozinho (existe uma
  loja no banco cujo dono é essa pessoa?). O app nunca decide isso por conta
  própria; um seletor na tela de login é só um atalho de navegação, não uma
  fonte de verdade.
- **Virar vendedor**: uma pessoa já logada como comprador pode criar uma loja
  a partir do próprio perfil. Isso exige verificar o CNPJ/CPF antes de liberar
  — ver seção 7.

---

## 5. Modelo de dados — o que existe e por quê

Cada tabela nasceu resolvendo um problema específico; entender o "porquê" da
separação ajuda a não misturar as coisas de novo por engano.

| Tabela | O que guarda | Por que está separada |
|---|---|---|
| `profiles` | Nome, username, foto, bio, data de nascimento | Só dado **público** — visível pra qualquer pessoa logada |
| `body_profiles` | Peso, altura, medidas | Dado sensível, dono-only, cifrado no servidor. Separado de `profiles` porque RLS filtra **linha**, não **coluna** — não dava pra esconder só esses campos numa tabela pública |
| `sellers` | Nome da loja, logo, descrição, nota | A loja é uma entidade própria, separada do dono — pode ter equipe (`store_members`) e o dono pode ser trocado sem recriar a loja |
| `sellers_private` | CNPJ/CPF cifrado + hash de verificação | Documento fiscal nunca pode aparecer em claro num payload público da loja |
| `categories` | Categoria de moda (ex.: Streetwear, Vintage) | Cadastrada só por acesso direto ao banco — nenhum usuário do app pode criar categoria (ver seção 8) |
| `looks` | O conteúdo do feed **e** o catálogo — são a mesma entidade (fotos, preço, estoque, tamanhos) | Uma peça publicada por uma loja é ao mesmo tempo um post do feed e um item pra venda |
| `look_likes` | Curtidas (swipe direita) | Baixo volume, permanente |
| `look_views` | Todo swipe, direita ou esquerda | Altíssimo volume, descartável — particionado por mês, apagado por lote depois de ~6 meses |
| `saved_looks` | Peças salvas deliberadamente | **Curtir ≠ salvar.** Antes, um curtir salvava automaticamente, o que misturava "gostei de passagem" com "quero comprar" — o sinal mais importante pra uma loja |
| `user_category_affinity` | Placar de afinidade por categoria (curtir +2, salvar +4) | A base de dado pra um futuro algoritmo de recomendação estilo TikTok — captura o sinal hoje, o re-ranqueamento do feed em cima disso ainda não foi construído, de propósito |
| `reports` | Denúncias de perfil/loja/peça | Moderação — existe a estrutura, mas não existe fila de revisão nem quem processa ainda |

---

## 6. Segurança — o que realmente protege os dados

Resumindo o ponto da seção 3 de um jeito mais concreto:

1. **RLS no Postgres** protege só quem acessa **direto** via PostgREST + a
   chave pública do Supabase (que vai embarcada no app publicado e pode ser
   extraída — isso é esperado, não um vazamento).
2. **O caminho do app real** (app → Lucker → Postgres) não passa por RLS
   nenhum — o Lucker conecta como superusuário. A única coisa que impede um
   usuário de ler/editar dado de outra pessoa é o código em
   `Lucker/app/service/*.py` checando dono/papel antes de cada leitura ou
   escrita.
3. **Rate limiting** existe nos endpoints mais sensíveis a abuso (feed, swipe,
   criar loja, verificar documento).
4. **Dados sensíveis são cifrados no servidor** antes de ir pro banco — CNPJ,
   peso, altura, medidas. O cliente manda em texto puro sobre HTTPS pra um
   endpoint já autenticado; o Lucker cifra (AES-256-GCM) antes de gravar. Não
   é o desenho ideal (o certo seria envelope encryption com KMS gerenciado
   pelo cliente), mas fecha o buraco real que existia — nada cifrava esses
   dados antes.
5. **Verificação real de CNPJ** — antes de alguém virar loja, o CNPJ é
   checado contra a Receita Federal (via BrasilAPI, gratuita) pra confirmar
   que a empresa existe e está ativa, não só que o número é matematicamente
   válido.

---

## 7. Principais fluxos do app

### Feed (o coração do app)
`FeedScreen` busca peças em `GET /api/feed`, com filtro opcional de categoria.
Deslizar pra direita curte (`POST /api/swipes`); salvar é um botão separado
(`POST /api/saved-looks`). O feed exclui peças que a pessoa já viu.

### Busca
Looks e lojas, cada um com seu próprio endpoint de busca — deliberadamente
**sem** excluir peças já vistas (ao contrário do feed, procurar precisa achar
algo que a pessoa já passou por cima).

A busca de **peças** tem filtros de verdade, aplicados no servidor: faixa de
**preço**, **tamanho** (qualquer um dos marcados), **só em estoque** e **ordem**
(mais recentes, mais procuradas, menor ou maior preço), além do texto e da
categoria. Filtrar só o que já chegou na tela esconderia peças das páginas
seguintes, por isso o app manda os filtros junto a cada página. Cor, marca e
estilo ainda não existem na peça (dependem de uma decisão de produto sobre tags).

### Perfil
Identidade (nome, username, bio, foto) e estatísticas (peças salvas, categoria
favorita) vêm de dado real. A seção "Estilos" continua rodando sobre um motor
local no aparelho porque o backend não guarda esse tipo de tag na peça ainda
— decisão de produto em aberto (tags manuais vs. embeddings de imagem).

### Virar loja
A partir do perfil, um comprador pode iniciar o fluxo de criar loja: nome,
bio, CNPJ/CPF → verificação contra a Receita → confirmação → loja criada.

### Loja (área de vendedor)
A loja publica, edita e remove peças pelo app: escolhe de 1 a 6 fotos na
galeria (a primeira é a capa), informa nome, preço, estoque, tamanhos,
categoria, descrição e link de compra. As fotos sobem por um endpoint do
Lucker (`POST /api/uploads/image`), que confere o tipo pelos bytes e guarda no
Storage do Supabase; o app nunca grava direto no Storage. Logo da loja e foto
de perfil usam o mesmo caminho.

O painel "Início" e os "Insights" são calculados sobre o catálogo real: peças,
curtidas, salvos, estoque, o que precisa de atenção e as peças mais procuradas.
**Vendas, faturamento e visualizações não aparecem** — não existem pedidos nem
contagem de visualizações no backend, e um número inventado numa tela de dono
de loja é pior que a ausência dele. "Pedidos recebidos" ainda é "Em breve".

---

## 8. O que é real, o que é rascunho, e o que falta

**Funciona de ponta a ponta hoje:**
cadastro e login (a sessão é lembrada ao reabrir o app), confirmação por
código, feed com curtir/salvar/filtro de categoria, busca de looks e lojas com
filtros de preço, tamanho, estoque e ordem, perfil (dados + medidas corporais +
consentimento de IA + foto), virar vendedor com verificação de CNPJ, editar
dados e logo da loja, publicar/editar/remover peças com fotos, ajustar estoque,
painel e insights da loja sobre dados reais, e o **carrinho** (adicionar,
aumentar, diminuir, remover) com checagem de estoque — otimista, sem reserva.

**Existe como rascunho — estrutura pronta, sem funcionar de verdade:**
pedidos, checkout e pagamento. `lookly-front/src/lib/commerce.ts` e
`types/commerce.ts` já definem o formato exato que essas telas vão consumir
(alinhado com o desenho de "Commerce invariants" documentado no `CLAUDE.md`
do Lucker — um pedido pode ter várias lojas, pagamento é uma tabela própria,
item de pedido é uma cópia congelada do preço na hora da compra). Isso existe
justamente pra quem for implementar essa parte não precisar redesenhar a
tela — só trocar o corpo de cada função por uma chamada real.

**Não existe ainda:**
upload de vídeo, notificações, vendas/faturamento/visualizações por peça,
fila de moderação de denúncias, remoção de arquivos órfãos no Storage, filtros
por cor/marca/estilo, qualquer coisa de pagamento de verdade.

**Escopo deste time, por decisão explícita**: cuidar do CRUD entre app,
backend e banco. Custódia/processamento de pagamento, compliance fiscal de
intermediação de marketplace e mediação de disputa comprador↔loja são
assuntos legais/de produto que precisam de decisão antes de virar código —
não é algo pra este time resolver sozinho reativamente.

---

## 9. Design e navegação

O app é folheado como um **catálogo de mala direta dos anos 60–70**: papel
creme, tinta marrom, um vermelho de selo que marca preço, moldura da foto e o
estado ativo, serifa (DM Serif Display) nos títulos, nomes e preços, e
Courier Prime nos códigos de item ("Ref. 7F3A"). Filetes duplos sob os
cabeçalhos, linhas pontilhadas entre rótulo e valor, carimbo de borracha ao
arrastar a peça. Não é o visual escuro+neon de TikTok/Kwai: a foto da roupa
continua sendo o único ponto saturado. Uma primeira versão ("sinalização de
aeroporto") foi recusada — não voltar a ela. A descrição completa do sistema
está em `DESIGN.md`; o contexto de produto, em `PRODUCT.md`.

A paleta vive espelhada em dois lugares (`tailwind.config.js` e
`src/theme/colors.ts`) porque nem tudo no React Native aceita classe do
Tailwind.

Os blocos são compartilhados: `Button` (primário, secundário, perigo, ícone),
`Campo` (campo de formulário "linha de preencher"), `ScreenHeader` (cabeçalho e
o conserto da colisão com a barra de status), `PecaRow`, `PecaFoto`,
`FiltroSheet`, entre outros. A busca usa abas de fichário e um índice de
categorias em texto, em vez de botões.

A navegação principal é uma barra fixa embaixo (não uma barra lateral — em
celular, lateral rouba espaço horizontal bem na tela mais importante do app, o
feed em tela cheia). Uma tarja vermelha desliza até a aba tocada, e os ícones
são objetos de loja (livro de catálogo, etiqueta de preço, cabide, ábaco,
carimbo), não ícones genéricos. O que a pessoa vê — abas de comprador ou de
loja — depende do mesmo `is_seller` resolvido no servidor.

---

## 10. Onde encontrar cada coisa

**`lookly-front/src/`**
- `screens/` — uma tela por arquivo.
- `components/` — peças reutilizáveis (`Button`, `Campo`, `ScreenHeader`,
  `CatalogTabBar`, `PecaRow`, `FiltroSheet`, `ProductDetailSheet`, `Toast`, etc.).
- `lib/` — toda chamada à API do Lucker, organizada por domínio (`feed.ts`,
  `sellers.ts`, `bodyProfile.ts`, `commerce.ts`, `media.ts` para fotos,
  `profile.ts`, `filtros.ts`...). Telas não chamam `axios` direto; chamam uma
  função daqui.
- `utils/` — formatação pt-BR, tamanhos aceitos, cálculo do painel da loja.
- `types/api.ts` — cópia tipada do contrato do backend (espelha os schemas do
  Lucker).
- `theme/` — a paleta, espelhada do `tailwind.config.js`.

**`Lucker/app/`**
- `controller/` — as rotas HTTP (uma por domínio: `profile_controller.py`,
  `look_controller.py`...). Só recebe a requisição e chama o service.
- `service/` — toda a regra de negócio e verificação de autorização mora
  aqui. **É a camada que protege os dados de verdade** (ver seção 6).
- `model/` — as tabelas, em SQLAlchemy.
- `schemas/` — os formatos de entrada/saída (Pydantic).
- `nem_schema.sql` — o schema do banco, fonte da verdade (não `schema.sql`,
  que é uma cópia antiga mantida por engano).
- `tests/` — testes (`python -m pytest tests -q`, sem banco).
- `sql/` (na raiz do Lucker) — scripts avulsos para rodar no SQL Editor do
  Supabase: a coluna de tamanhos (`filtros_busca.sql`, **rodar antes de
  publicar o back novo**), partições de `look_views` e as fotos de exemplo.

---

## 11. Pra ir mais fundo

Este documento explica a lógica geral. Pra decisões técnicas específicas,
histórico de bugs corrigidos e o porquê de cada escolha de implementação, os
`CLAUDE.md` de cada repositório são atualizados a cada mudança e são a
referência mais precisa:

- `lookly-front/CLAUDE.md`
- `Lucker/CLAUDE.md`
