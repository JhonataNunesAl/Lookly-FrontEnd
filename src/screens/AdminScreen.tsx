import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../components/Text';
import ScreenHeader from '../components/ScreenHeader';
import Button from '../components/Button';
import Campo from '../components/Campo';
import { SectionHeader, StatBoard } from '../components/PanelKit';
import { colors } from '../theme/colors';
import { formatarMoeda, formatarNumero, lerPreco, precoParaCampo } from '../utils/format';
import {
  admin,
  CategoriaAdmin,
  CONFIRMACAO,
  DenunciaAdmin,
  erroAdmin,
  LojaAdmin,
  Pagina,
  PecaAdmin,
  PedidoAdmin,
  Repasse,
  Resumo,
  TaxaConfig,
  UsuarioAdmin,
} from '../lib/admin';

/**
 * Painel de administração do Lookly. Só abre para o admin — e mesmo que alguém
 * chegue aqui, toda chamada é recusada pelo servidor (403) para quem não é.
 *
 * No site tudo cabe na coluna: abas e filtros QUEBRAM LINHA em vez de rolar para o
 * lado (no PC não dá para arrastar uma lista horizontal com o mouse).
 */

type Aba = 'resumo' | 'usuarios' | 'lojas' | 'pecas' | 'pedidos' | 'categorias' | 'denuncias' | 'taxa';

const ABAS: { id: Aba; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'resumo', label: 'Resumo', icon: 'speedometer-outline' },
  { id: 'usuarios', label: 'Usuários', icon: 'people-outline' },
  { id: 'lojas', label: 'Lojas', icon: 'storefront-outline' },
  { id: 'pecas', label: 'Peças', icon: 'shirt-outline' },
  { id: 'pedidos', label: 'Pedidos', icon: 'receipt-outline' },
  { id: 'categorias', label: 'Categorias', icon: 'pricetags-outline' },
  { id: 'denuncias', label: 'Denúncias', icon: 'flag-outline' },
  { id: 'taxa', label: 'Taxa', icon: 'cash-outline' },
];

const STATUS: Record<string, string> = {
  active: 'Ativo',
  suspended: 'Suspenso',
  banned: 'Banido',
  deleted: 'Excluído',
  draft: 'Rascunho',
  under_review: 'Em análise',
  removed: 'Fora do ar',
  open: 'Aberta',
  reviewing: 'Em análise',
  resolved: 'Resolvida',
  rejected: 'Rejeitada',
  pending: 'Pendente',
  approved: 'Aprovado',
  refused: 'Recusado',
  refunded: 'Estornado',
  paid: 'Pago',
  shipped: 'Enviado',
  delivered: 'Entregue',
  canceled: 'Cancelado',
};

function data(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function falhar(titulo: string, e: unknown) {
  Alert.alert(titulo, erroAdmin(e));
}

// ─── Peças pequenas ───────────────────────────────────────────────────────────

/** Chip que quebra linha junto com os outros (flex-wrap no pai). */
function Chip({ label, ativo, onPress, icon }: { label: string; ativo: boolean; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      className={`flex-row items-center gap-1.5 px-3 min-h-10 rounded-lg border-2 ${ativo ? 'bg-ink border-ink' : 'bg-surface border-surface-5'}`}
    >
      {icon ? <Ionicons name={icon} size={16} color={ativo ? colors.white : colors.ink.DEFAULT} /> : null}
      <Text className={`text-sm font-sans-bold ${ativo ? 'text-white' : 'text-ink'}`}>{label}</Text>
    </TouchableOpacity>
  );
}

function Selo({ status, conteudo = false }: { status: string; conteudo?: boolean }) {
  const ruim = ['suspended', 'banned', 'removed', 'refused', 'deleted', 'open'].includes(status);
  const ok = ['active', 'approved', 'resolved', 'paid', 'delivered'].includes(status);
  return (
    <View className={`px-2 py-0.5 rounded-md ${ruim ? 'bg-seal-soft' : ok ? 'bg-surface-3' : 'bg-signal-soft'}`}>
      <Text className={`text-xs font-sans-bold ${ruim ? 'text-seal' : 'text-ink'}`}>{conteudo && status === 'active' ? 'No ar' : STATUS[status] ?? status}</Text>
    </View>
  );
}

/** Botão de texto pequeno para as ações de cada cartão. */
function Acao({ label, onPress, perigo = false }: { label: string; onPress: () => void; perigo?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      className={`px-3 min-h-10 justify-center rounded-lg border ${perigo ? 'border-seal' : 'border-ink'}`}
    >
      <Text className={`text-sm font-sans-bold ${perigo ? 'text-seal' : 'text-ink'}`}>{label}</Text>
    </TouchableOpacity>
  );
}

function Cartao({ children }: { children: React.ReactNode }) {
  return <View className="bg-surface border border-surface-5 rounded-card p-3 gap-2">{children}</View>;
}

function Linha({ children }: { children: React.ReactNode }) {
  return <View className="flex-row flex-wrap items-center gap-2">{children}</View>;
}

function Vazio({ texto }: { texto: string }) {
  return <Text className="text-ink-4 text-base font-display-italic text-center py-8">{texto}</Text>;
}

function Busca({ valor, onChange, placeholder }: { valor: string; onChange: (t: string) => void; placeholder: string }) {
  return (
    <View className="bg-surface border border-surface-5 border-b-2 border-b-ink flex-row items-center px-3 min-h-12 gap-2">
      <Ionicons name="search" size={18} color={colors.ink[4]} />
      <TextInput
        value={valor}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.ink[5]}
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        className="flex-1 text-ink text-base font-sans-medium"
        style={{ paddingVertical: 0 }}
      />
    </View>
  );
}

// ─── Lista paginada genérica ──────────────────────────────────────────────────

const POR_PAGINA = 30;

/** Carrega uma lista com busca (com espera de digitação) e "carregar mais". */
function useLista<T>(buscar: (f: { q: string; status: string; offset: number }) => Promise<Pagina<T>>) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [itens, setItens] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (offset = 0) => {
    setCarregando(true);
    try {
      const r = await buscar({ q, status, offset });
      setItens((ant) => (offset === 0 ? r.items : [...ant, ...r.items]));
      setTotal(r.total);
      setErro(null);
    } catch (e) {
      setErro(erroAdmin(e));
    } finally {
      setCarregando(false);
    }
    // `buscar` é estável por aba
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  useEffect(() => {
    const t = setTimeout(() => carregar(0), q ? 350 : 0);
    return () => clearTimeout(t);
  }, [carregar, q]);

  const trocar = (novo: T, igual: (a: T) => boolean) => setItens((l) => l.map((a) => (igual(a) ? novo : a)));
  const tirar = (igual: (a: T) => boolean) => { setItens((l) => l.filter((a) => !igual(a))); setTotal((n) => Math.max(n - 1, 0)); };

  return { q, setQ, status, setStatus, itens, total, carregando, erro, carregar, trocar, tirar };
}

function Rodape({ lista }: { lista: { itens: unknown[]; total: number; carregando: boolean; erro: string | null; carregar: (o?: number) => void } }) {
  if (lista.erro) {
    return (
      <View className="gap-3 py-4">
        <Text className="text-seal text-base font-sans-semibold text-center">{lista.erro}</Text>
        <Button variant="secondary" label="Tentar de novo" icon="refresh" onPress={() => lista.carregar(0)} />
      </View>
    );
  }
  if (lista.carregando) return <ActivityIndicator color={colors.ink.DEFAULT} style={{ marginVertical: 24 }} />;
  if (lista.itens.length === 0) return <Vazio texto="Nada encontrado." />;
  if (lista.itens.length < lista.total) {
    return <Button variant="secondary" label={`Carregar mais (${lista.itens.length} de ${lista.total})`} onPress={() => lista.carregar(lista.itens.length)} />;
  }
  return <Text className="text-ink-4 text-sm text-center py-3">{lista.total} no total</Text>;
}

function Filtros({ opcoes, valor, onChange }: { opcoes: [string, string][]; valor: string; onChange: (v: string) => void }) {
  return (
    <Linha>
      {opcoes.map(([v, l]) => (
        <Chip key={v || 'todos'} label={l} ativo={valor === v} onPress={() => onChange(v)} />
      ))}
    </Linha>
  );
}

// ─── Modais: editar e apagar ──────────────────────────────────────────────────

interface CampoEdicao { chave: string; rotulo: string; valor: string; teclado?: 'default' | 'decimal-pad'; multilinha?: boolean }

function Editor({
  titulo, campos, onSalvar, onFechar,
}: {
  titulo: string;
  campos: CampoEdicao[];
  onSalvar: (valores: Record<string, string>) => Promise<void>;
  onFechar: () => void;
}) {
  const [valores, setValores] = useState<Record<string, string>>(() => Object.fromEntries(campos.map((c) => [c.chave, c.valor])));
  const [salvando, setSalvando] = useState(false);
  const salvar = async () => {
    setSalvando(true);
    try {
      await onSalvar(valores);
      onFechar();
    } catch (e) {
      falhar('Não foi possível salvar', e);
    } finally {
      setSalvando(false);
    }
  };
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onFechar}>
      <View className="flex-1 bg-black/50 items-center justify-center p-4">
        <View className="bg-background w-full rounded-card p-4 gap-4" style={{ maxWidth: 440 }}>
          <Text className="text-ink text-xl font-display-bold">{titulo}</Text>
          {campos.map((c) => (
            <Campo
              key={c.chave}
              rotulo={c.rotulo}
              value={valores[c.chave]}
              onChangeText={(t) => setValores((v) => ({ ...v, [c.chave]: t }))}
              keyboardType={c.teclado ?? 'default'}
              multilinha={c.multilinha}
            />
          ))}
          <View className="gap-2">
            <Button label="Salvar" icon="checkmark" onPress={salvar} loading={salvando} />
            <Button variant="secondary" label="Cancelar" onPress={onFechar} disabled={salvando} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Apagar pede que a pessoa digite APAGAR — o servidor confere a mesma palavra. */
function ConfirmarExclusao({
  titulo, aviso, onApagar, onFechar,
}: {
  titulo: string;
  aviso: string;
  onApagar: (confirm: string) => Promise<void>;
  onFechar: () => void;
}) {
  const [texto, setTexto] = useState('');
  const [apagando, setApagando] = useState(false);
  const pronto = texto.trim().toUpperCase() === CONFIRMACAO;
  const apagar = async () => {
    setApagando(true);
    try {
      await onApagar(texto.trim().toUpperCase());
      onFechar();
    } catch (e) {
      falhar('Não foi possível apagar', e);
    } finally {
      setApagando(false);
    }
  };
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onFechar}>
      <View className="flex-1 bg-black/50 items-center justify-center p-4">
        <View className="bg-background w-full rounded-card p-4 gap-4" style={{ maxWidth: 440 }}>
          <View className="flex-row items-center gap-2">
            <Ionicons name="warning" size={24} color={colors.seal.DEFAULT} />
            <Text className="flex-1 text-ink text-xl font-display-bold">{titulo}</Text>
          </View>
          <Text className="text-ink-3 text-base">{aviso}</Text>
          <Campo
            rotulo={`Digite ${CONFIRMACAO} para confirmar`}
            value={texto}
            onChangeText={setTexto}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <View className="gap-2">
            <Button variant="danger" label="Apagar para sempre" icon="trash-outline" onPress={apagar} disabled={!pronto} loading={apagando} />
            <Button variant="secondary" label="Cancelar" onPress={onFechar} disabled={apagando} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

type Dialogo =
  | { tipo: 'editar'; titulo: string; campos: CampoEdicao[]; onSalvar: (v: Record<string, string>) => Promise<void> }
  | { tipo: 'apagar'; titulo: string; aviso: string; onApagar: (c: string) => Promise<void> }
  | null;

/** Pergunta simples (sim/não) para trocar status. */
function confirmar(titulo: string, mensagem: string, acao: () => Promise<void>, rotulo = 'Confirmar') {
  Alert.alert(titulo, mensagem, [
    { text: 'Cancelar', style: 'cancel' },
    { text: rotulo, style: 'destructive', onPress: () => { acao().catch((e) => falhar(titulo, e)); } },
  ]);
}

// ─── Abas ─────────────────────────────────────────────────────────────────────

function AbaResumo() {
  const [r, setR] = useState<Resumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const carregar = useCallback(() => {
    setErro(null);
    admin.resumo().then(setR).catch((e) => setErro(erroAdmin(e)));
  }, []);
  useEffect(carregar, [carregar]);
  if (erro) return <View className="gap-3"><Text className="text-seal text-base text-center">{erro}</Text><Button variant="secondary" label="Tentar de novo" onPress={carregar} /></View>;
  if (!r) return <ActivityIndicator color={colors.ink.DEFAULT} style={{ marginVertical: 24 }} />;
  return (
    <View className="gap-4">
      <View className="bg-ink rounded-card px-4 py-1">
        <StatBoard
          items={[
            { label: 'Vendido (pago)', value: formatarMoeda(r.revenue_paid, true) },
            { label: 'Pedidos pagos', value: formatarNumero(r.orders_paid) },
            { label: 'Aguardando pagamento', value: formatarNumero(r.orders_pending) },
          ]}
        />
      </View>
      <View className="bg-surface border border-surface-5 rounded-card px-4 py-1">
        <StatBoard
          tone="surface"
          items={[
            { label: 'Usuários', value: formatarNumero(r.users) },
            { label: 'Novos (7 dias)', value: formatarNumero(r.new_users_7d) },
            { label: 'Bloqueados', value: formatarNumero(r.users_blocked) },
            { label: 'Lojas', value: formatarNumero(r.stores) },
            { label: 'Lojas fora do ar', value: formatarNumero(r.stores_inactive) },
            { label: 'Peças no ar', value: `${formatarNumero(r.looks_active)} / ${formatarNumero(r.looks_total)}` },
            { label: 'Denúncias abertas', value: formatarNumero(r.reports_open) },
          ]}
        />
      </View>
      <Button variant="secondary" label="Atualizar" icon="refresh" onPress={carregar} />
    </View>
  );
}

function AbaUsuarios({ abrir }: { abrir: (d: Dialogo) => void }) {
  const lista = useLista<UsuarioAdmin>((f) => admin.usuarios(f));
  const igual = (id: string) => (u: UsuarioAdmin) => u.id === id;

  const mudarStatus = (u: UsuarioAdmin, status: UsuarioAdmin['status']) =>
    confirmar(
      status === 'active' ? 'Reativar conta' : status === 'banned' ? 'Banir conta' : 'Suspender conta',
      status === 'active'
        ? `@${u.username} volta a poder entrar no app.`
        : `@${u.username} não vai mais conseguir entrar (o login é bloqueado). Pode ser desfeito depois.`,
      async () => lista.trocar(await admin.editarUsuario(u.id, { status }), igual(u.id)),
    );

  return (
    <View className="gap-3">
      <Busca valor={lista.q} onChange={lista.setQ} placeholder="Buscar por nome, @usuário ou e-mail" />
      <Filtros
        valor={lista.status}
        onChange={lista.setStatus}
        opcoes={[['', 'Todos'], ['active', 'Ativos'], ['suspended', 'Suspensos'], ['banned', 'Banidos']]}
      />
      {lista.itens.map((u) => (
        <Cartao key={u.id}>
          <Linha>
            <Text className="text-ink text-base font-sans-bold">@{u.username}</Text>
            <Selo status={u.status} />
            {u.is_admin ? <View className="bg-ink px-2 py-0.5 rounded-md"><Text className="text-white text-xs font-sans-bold">Admin</Text></View> : null}
          </Linha>
          {u.full_name ? <Text className="text-ink-3 text-sm">{u.full_name}</Text> : null}
          <Text className="text-ink-3 text-sm" selectable>{u.email ?? 'e-mail indisponível'}</Text>
          <Text className="text-ink-4 text-xs">
            Desde {data(u.created_at)} · {u.orders_count} pedido(s){u.store ? ` · Loja: ${u.store.store_name}` : ''}
          </Text>
          {!u.is_admin ? (
            <Linha>
              <Acao
                label="Editar"
                onPress={() => abrir({
                  tipo: 'editar',
                  titulo: `Editar @${u.username}`,
                  campos: [
                    { chave: 'full_name', rotulo: 'Nome', valor: u.full_name ?? '' },
                    { chave: 'username', rotulo: 'Usuário (sem @)', valor: u.username },
                  ],
                  onSalvar: async (v) => {
                    const dados: { full_name: string; username?: string } = { full_name: v.full_name };
                    if (v.username.trim() !== u.username) dados.username = v.username.trim();
                    lista.trocar(await admin.editarUsuario(u.id, dados), igual(u.id));
                  },
                })}
              />
              {u.status === 'active' ? (
                <>
                  <Acao label="Suspender" onPress={() => mudarStatus(u, 'suspended')} />
                  <Acao label="Banir" perigo onPress={() => mudarStatus(u, 'banned')} />
                </>
              ) : (
                <Acao label="Reativar" onPress={() => mudarStatus(u, 'active')} />
              )}
              <Acao
                label="Apagar"
                perigo
                onPress={() => abrir({
                  tipo: 'apagar',
                  titulo: `Apagar @${u.username}?`,
                  aviso: u.orders_count > 0
                    ? 'Esta conta tem pedidos e o servidor não vai deixar apagar (o registro da venda precisa ficar). Use "Banir".'
                    : `Apaga perfil, ${u.store ? 'a loja e as peças dela, ' : ''}fotos e o login. Não dá para desfazer.`,
                  onApagar: async (c) => { await admin.apagarUsuario(u.id, c); lista.tirar(igual(u.id)); },
                })}
              />
            </Linha>
          ) : null}
        </Cartao>
      ))}
      <Rodape lista={lista} />
    </View>
  );
}

const STATUS_CONTEUDO: [string, string][] = [['', 'Todas'], ['active', 'No ar'], ['under_review', 'Em análise'], ['removed', 'Fora do ar']];

function AbaLojas({ abrir, verPecas }: { abrir: (d: Dialogo) => void; verPecas: (l: LojaAdmin) => void }) {
  const lista = useLista<LojaAdmin>((f) => admin.lojas(f));
  const igual = (id: string) => (l: LojaAdmin) => l.id === id;
  const mudar = (l: LojaAdmin, status: string) =>
    confirmar(
      status === 'active' ? 'Colocar loja no ar' : 'Tirar loja do ar',
      status === 'active'
        ? `${l.store_name} e as peças dela voltam a aparecer no feed e na busca.`
        : `${l.store_name} e todas as peças dela somem do feed, da busca e não podem ser compradas. Pedidos já pagos não mudam.`,
      async () => lista.trocar(await admin.editarLoja(l.id, { status }), igual(l.id)),
    );
  return (
    <View className="gap-3">
      <Busca valor={lista.q} onChange={lista.setQ} placeholder="Buscar loja pelo nome" />
      <Filtros valor={lista.status} onChange={lista.setStatus} opcoes={STATUS_CONTEUDO} />
      {lista.itens.map((l) => (
        <Cartao key={l.id}>
          <Linha>
            <Text className="text-ink text-base font-sans-bold">{l.store_name}</Text>
            <Selo status={l.status} conteudo />
          </Linha>
          <Text className="text-ink-3 text-sm" selectable>
            Dono: @{l.owner_username ?? '—'}{l.owner_email ? ` · ${l.owner_email}` : ''}
          </Text>
          <Text className="text-ink-4 text-xs">
            {l.looks_count} peça(s) · {l.items_sold} vendida(s) · {formatarMoeda(l.revenue, true)} · desde {data(l.created_at)}
          </Text>
          <Linha>
            <Acao label="Ver peças" onPress={() => verPecas(l)} />
            <Acao
              label="Editar"
              onPress={() => abrir({
                tipo: 'editar',
                titulo: `Editar ${l.store_name}`,
                campos: [
                  { chave: 'store_name', rotulo: 'Nome da loja', valor: l.store_name },
                  { chave: 'description', rotulo: 'Descrição', valor: l.description ?? '', multilinha: true },
                ],
                onSalvar: async (v) => lista.trocar(await admin.editarLoja(l.id, v), igual(l.id)),
              })}
            />
            {l.status === 'active'
              ? <Acao label="Tirar do ar" perigo onPress={() => mudar(l, 'removed')} />
              : <Acao label="Colocar no ar" onPress={() => mudar(l, 'active')} />}
            <Acao
              label="Apagar"
              perigo
              onPress={() => abrir({
                tipo: 'apagar',
                titulo: `Apagar ${l.store_name}?`,
                aviso: l.items_sold > 0
                  ? 'Esta loja já vendeu e o servidor não vai deixar apagar (o histórico de vendas precisa ficar). Use "Tirar do ar".'
                  : 'Apaga a loja, todas as peças e o histórico de estoque. A conta do dono continua. Não dá para desfazer.',
                onApagar: async (c) => { await admin.apagarLoja(l.id, c); lista.tirar(igual(l.id)); },
              })}
            />
          </Linha>
        </Cartao>
      ))}
      <Rodape lista={lista} />
    </View>
  );
}

function AbaPecas({ abrir, loja, limparLoja }: { abrir: (d: Dialogo) => void; loja: LojaAdmin | null; limparLoja: () => void }) {
  const lista = useLista<PecaAdmin>((f) => admin.pecas({ ...f, seller_id: loja?.id }));
  const igual = (id: string) => (p: PecaAdmin) => p.id === id;
  const mudar = async (p: PecaAdmin, status: string) => {
    try {
      lista.trocar(await admin.editarPeca(p.id, { status }), igual(p.id));
    } catch (e) {
      falhar('Peça', e);
    }
  };
  return (
    <View className="gap-3">
      {loja ? (
        <Linha>
          <Text className="text-ink text-sm font-sans-semibold">Só da loja {loja.store_name}</Text>
          <Acao label="Ver todas" onPress={limparLoja} />
        </Linha>
      ) : null}
      <Busca valor={lista.q} onChange={lista.setQ} placeholder="Buscar peça, código ou marca" />
      <Filtros valor={lista.status} onChange={lista.setStatus} opcoes={STATUS_CONTEUDO} />
      {lista.itens.map((p) => (
        <Cartao key={p.id}>
          <View className="flex-row gap-3">
            {p.photo ? (
              <Image source={{ uri: p.photo }} style={{ width: 56, height: 72, borderRadius: 6, backgroundColor: colors.surface[3] }} />
            ) : null}
            <View className="flex-1 gap-1">
              <Linha>
                <Text className="text-ink text-base font-sans-bold" numberOfLines={2}>{p.name}</Text>
                <Selo status={p.status} conteudo />
              </Linha>
              <Text className="text-ink-3 text-sm">
                {p.price != null ? formatarMoeda(p.price, true) : 'sem preço'} · estoque {p.stock_quantity} · vendida {p.times_sold}x
              </Text>
              <Text className="text-ink-4 text-xs">{p.store_name ?? '—'}{p.category_name ? ` · ${p.category_name}` : ''}</Text>
            </View>
          </View>
          <Linha>
            <Acao
              label="Editar"
              onPress={() => abrir({
                tipo: 'editar',
                titulo: 'Editar peça',
                campos: [
                  { chave: 'name', rotulo: 'Nome', valor: p.name },
                  { chave: 'price', rotulo: 'Preço (R$)', valor: p.price != null ? precoParaCampo(p.price) : '', teclado: 'decimal-pad' },
                ],
                onSalvar: async (v) => {
                  const dados: { name: string; price?: string } = { name: v.name };
                  const preco = lerPreco(v.price);
                  if (v.price.trim() && preco == null) throw { response: { data: { detail: 'Preço inválido.' } } };
                  if (preco != null) dados.price = preco.toFixed(2);
                  lista.trocar(await admin.editarPeca(p.id, dados), igual(p.id));
                },
              })}
            />
            {p.status === 'active'
              ? <Acao label="Tirar do ar" perigo onPress={() => mudar(p, 'removed')} />
              : <Acao label="Colocar no ar" onPress={() => mudar(p, 'active')} />}
            <Acao
              label="Apagar"
              perigo
              onPress={() => abrir({
                tipo: 'apagar',
                titulo: `Apagar "${p.name}"?`,
                aviso: p.times_sold > 0
                  ? 'Esta peça já foi vendida e o servidor não vai deixar apagar (apagaria a linha do pedido). Use "Tirar do ar".'
                  : 'A peça sai do catálogo, dos salvos e dos carrinhos. Não dá para desfazer.',
                onApagar: async (c) => { await admin.apagarPeca(p.id, c); lista.tirar(igual(p.id)); },
              })}
            />
          </Linha>
        </Cartao>
      ))}
      <Rodape lista={lista} />
    </View>
  );
}

function AbaPedidos() {
  const lista = useLista<PedidoAdmin>((f) => admin.pedidos({ q: f.q, offset: f.offset, payment_status: f.status }));
  return (
    <View className="gap-3">
      <Text className="text-ink-4 text-sm font-display-italic">
        Só leitura: quem muda o pagamento é o Mercado Pago, e o envio é marcado pela loja.
      </Text>
      <Busca valor={lista.q} onChange={lista.setQ} placeholder="Buscar pelo @usuário do comprador" />
      <Filtros
        valor={lista.status}
        onChange={lista.setStatus}
        opcoes={[['', 'Todos'], ['approved', 'Pagos'], ['pending', 'Pendentes'], ['refused', 'Recusados'], ['refunded', 'Estornados']]}
      />
      {lista.itens.map((o) => (
        <Cartao key={o.id}>
          <Linha>
            <Text className="text-ink text-base font-sans-bold">{formatarMoeda(o.total, true)}</Text>
            <Selo status={o.payment_status} />
            <Text className="text-ink-4 text-xs">{data(o.created_at)}</Text>
          </Linha>
          <Text className="text-ink-3 text-sm" selectable>
            @{o.buyer_username ?? '—'}{o.buyer_email ? ` · ${o.buyer_email}` : ''}
          </Text>
          {o.items.map((i, k) => (
            <Text key={`${i.look_id}-${k}`} className="text-ink-4 text-xs">
              {i.quantity}x {i.name} ({i.store_name ?? '—'}) · {formatarMoeda(i.subtotal, true)}
              {i.fulfillment_status ? ` · ${STATUS[i.fulfillment_status] ?? i.fulfillment_status}` : ''}
            </Text>
          ))}
          <Text className="text-ink-6 text-xs" selectable>#{o.id.slice(0, 8)}</Text>
        </Cartao>
      ))}
      <Rodape lista={lista} />
    </View>
  );
}

function AbaCategorias({ abrir }: { abrir: (d: Dialogo) => void }) {
  const [cats, setCats] = useState<CategoriaAdmin[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [nova, setNova] = useState('');
  const [criando, setCriando] = useState(false);
  const carregar = useCallback(() => {
    admin.categorias().then((c) => { setCats(c); setErro(null); }).catch((e) => setErro(erroAdmin(e)));
  }, []);
  useEffect(carregar, [carregar]);
  const trocar = (c: CategoriaAdmin) => setCats((l) => (l ?? []).map((a) => (a.id === c.id ? c : a)));

  const criar = async () => {
    if (nova.trim().length < 2) return;
    setCriando(true);
    try {
      const c = await admin.criarCategoria(nova.trim());
      setCats((l) => [...(l ?? []), c]);
      setNova('');
    } catch (e) {
      falhar('Nova categoria', e);
    } finally {
      setCriando(false);
    }
  };

  return (
    <View className="gap-3">
      <Text className="text-ink-4 text-sm font-display-italic">
        Categorias de estilo do app (ex.: Streetwear). Desativada some dos filtros, mas as peças continuam.
      </Text>
      <Campo rotulo="Nova categoria" value={nova} onChangeText={setNova} placeholder="Ex.: Festa" onSubmitEditing={criar} />
      <Button label="Criar categoria" icon="add" onPress={criar} loading={criando} disabled={nova.trim().length < 2} />
      {erro ? <Text className="text-seal text-base text-center">{erro}</Text> : null}
      {!cats && !erro ? <ActivityIndicator color={colors.ink.DEFAULT} /> : null}
      {(cats ?? []).map((c) => (
        <Cartao key={c.id}>
          <Linha>
            <Text className="text-ink text-base font-sans-bold">{c.name}</Text>
            <Selo status={c.is_active ? 'active' : 'removed'} conteudo />
            <Text className="text-ink-4 text-xs">{c.looks_count} peça(s) · ordem {c.sort_order}</Text>
          </Linha>
          <Linha>
            <Acao
              label="Editar"
              onPress={() => abrir({
                tipo: 'editar',
                titulo: `Editar ${c.name}`,
                campos: [
                  { chave: 'name', rotulo: 'Nome', valor: c.name },
                  { chave: 'sort_order', rotulo: 'Ordem (menor aparece antes)', valor: String(c.sort_order), teclado: 'decimal-pad' },
                ],
                onSalvar: async (v) => trocar(await admin.editarCategoria(c.id, { name: v.name, sort_order: Math.max(0, parseInt(v.sort_order, 10) || 0) })),
              })}
            />
            <Acao
              label={c.is_active ? 'Desativar' : 'Ativar'}
              onPress={() => admin.editarCategoria(c.id, { is_active: !c.is_active }).then(trocar).catch((e) => falhar('Categoria', e))}
            />
            <Acao
              label="Apagar"
              perigo
              onPress={() => abrir({
                tipo: 'apagar',
                titulo: `Apagar ${c.name}?`,
                aviso: c.looks_count > 0
                  ? 'Há peças nesta categoria e o servidor não vai deixar apagar. Desative em vez disso.'
                  : 'A categoria some do app. Não dá para desfazer.',
                onApagar: async (k) => { await admin.apagarCategoria(c.id, k); setCats((l) => (l ?? []).filter((a) => a.id !== c.id)); },
              })}
            />
          </Linha>
        </Cartao>
      ))}
    </View>
  );
}

const ALVO: Record<string, string> = { profile: 'Perfil', seller: 'Loja', look: 'Peça' };

function AbaDenuncias() {
  const lista = useLista<DenunciaAdmin>((f) => admin.denuncias({ status: f.status, offset: f.offset }));
  const mudar = async (d: DenunciaAdmin, status: DenunciaAdmin['status']) => {
    try {
      const novo = await admin.editarDenuncia(d.id, status);
      lista.trocar({ ...d, status: novo.status }, (a) => a.id === d.id);
    } catch (e) {
      falhar('Denúncia', e);
    }
  };
  return (
    <View className="gap-3">
      <Filtros
        valor={lista.status}
        onChange={lista.setStatus}
        opcoes={[['', 'Todas'], ['open', 'Abertas'], ['reviewing', 'Em análise'], ['resolved', 'Resolvidas'], ['rejected', 'Rejeitadas']]}
      />
      {lista.itens.map((d) => (
        <Cartao key={d.id}>
          <Linha>
            <Text className="text-ink text-base font-sans-bold">{ALVO[d.target_type] ?? d.target_type}: {d.target_label ?? '(apagado)'}</Text>
            <Selo status={d.status} />
          </Linha>
          <Text className="text-ink-3 text-sm">Motivo: {d.reason}</Text>
          {d.description ? <Text className="text-ink-3 text-sm">{d.description}</Text> : null}
          <Text className="text-ink-4 text-xs" selectable>
            {data(d.created_at)} · por @{d.reporter_username ?? 'anônimo'}{d.contact_email ? ` · ${d.contact_email}` : ''}
          </Text>
          <Linha>
            {d.status !== 'reviewing' ? <Acao label="Em análise" onPress={() => mudar(d, 'reviewing')} /> : null}
            {d.status !== 'resolved' ? <Acao label="Resolvida" onPress={() => mudar(d, 'resolved')} /> : null}
            {d.status !== 'rejected' ? <Acao label="Rejeitar" perigo onPress={() => mudar(d, 'rejected')} /> : null}
          </Linha>
        </Cartao>
      ))}
      <Rodape lista={lista} />
    </View>
  );
}

function AbaTaxa() {
  const [cfg, setCfg] = useState<TaxaConfig | null>(null);
  const [repasses, setRepasses] = useState<Repasse[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pct, setPct] = useState('');
  const [dias, setDias] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(() => {
    setErro(null);
    admin.taxa().then((c) => {
      setCfg(c);
      setPct(String(c.fee_percent).replace('.', ','));
      setDias(String(c.grace_days));
    }).catch((e) => setErro(erroAdmin(e)));
    admin.repasses().then(setRepasses).catch(() => setRepasses([]));
  }, []);
  useEffect(carregar, [carregar]);

  const salvar = async () => {
    const p = Number(pct.replace(',', '.'));
    const d = parseInt(dias, 10);
    if (!Number.isFinite(p) || p < 0 || p > 50) return Alert.alert('Taxa', 'Use um percentual entre 0 e 50.');
    if (!Number.isFinite(d) || d < 0) return Alert.alert('Taxa', 'Dias de carência inválidos.');
    setSalvando(true);
    try {
      setCfg(await admin.mudarTaxa({ fee_percent: p.toFixed(2), grace_days: d }));
      Alert.alert('Taxa', 'Regra salva.');
    } catch (e) {
      falhar('Taxa', e);
    } finally {
      setSalvando(false);
    }
  };

  const demo = (encerrar: boolean) =>
    confirmar(
      encerrar ? 'Encerrar a demo' : 'Reabrir a demo',
      encerrar
        ? `A partir de agora cada loja tem ${dias || cfg?.grace_days} dias sem taxa contados do fim da demo (ou do cadastro, se entrar depois) e depois paga ${pct || cfg?.fee_percent}%. Vendas já feitas não mudam.`
        : 'Todas as lojas voltam a pagar 0% nas próximas vendas.',
      async () => setCfg(await admin.mudarTaxa(encerrar ? { end_demo_now: true } : { demo_ends_at: null })),
      encerrar ? 'Encerrar' : 'Reabrir',
    );

  const pagar = (r: Repasse) =>
    confirmar(
      'Repasse feito',
      `Confirma que você já transferiu ${formatarMoeda(r.net, true)} para ${r.store_name}? As ${r.items} venda(s) saem da lista.`,
      async () => {
        await admin.marcarRepasse(r.seller_id);
        setRepasses((l) => (l ?? []).filter((a) => a.seller_id !== r.seller_id));
      },
    );

  if (erro) return <View className="gap-3"><Text className="text-seal text-base text-center">{erro}</Text><Button variant="secondary" label="Tentar de novo" onPress={carregar} /></View>;
  if (!cfg) return <ActivityIndicator color={colors.ink.DEFAULT} style={{ marginVertical: 24 }} />;

  return (
    <View className="gap-4">
      <View className="bg-ink rounded-card p-4 gap-1">
        <Text className="text-signal text-2xl font-display-bold">
          {cfg.demo_active ? 'Demo: 0% para todos' : `Taxa padrão: ${String(cfg.fee_percent).replace('.', ',')}%`}
        </Text>
        <Text className="text-white text-sm">
          {cfg.demo_active
            ? `Ao encerrar a demo: ${cfg.grace_days} dias grátis por loja e depois ${String(cfg.fee_percent).replace('.', ',')}%.${cfg.demo_ends_at ? ` Demo termina em ${data(cfg.demo_ends_at)}.` : ''}`
            : `Demo encerrada em ${data(cfg.demo_ends_at)}. Cada loja tem ${cfg.grace_days} dias grátis.`}
        </Text>
      </View>

      <Campo rotulo="Taxa padrão (%)" value={pct} onChangeText={setPct} keyboardType="decimal-pad" dica="Cobrada sobre o valor das peças vendidas no app." />
      <Campo rotulo="Dias sem taxa por loja" value={dias} onChangeText={setDias} keyboardType="number-pad" dica="Contados do fim da demo, ou do cadastro da loja se ela entrar depois." />
      <Button label="Salvar regra" icon="checkmark" onPress={salvar} loading={salvando} />
      {cfg.demo_active
        ? <Button variant="danger" label="Encerrar a demo agora" icon="flag-outline" onPress={() => demo(true)} />
        : <Button variant="secondary" label="Reabrir a demo (0%)" icon="refresh" onPress={() => demo(false)} />}

      <SectionHeader title="Repasses a fazer" />
      {repasses === null ? <ActivityIndicator color={colors.ink.DEFAULT} /> : null}
      {repasses?.length === 0 ? <Vazio texto="Nenhum repasse pendente." /> : null}
      {(repasses ?? []).map((r) => (
        <Cartao key={r.seller_id}>
          <Text className="text-ink text-base font-sans-bold">{r.store_name}</Text>
          <Text className="text-ink-3 text-sm">
            {r.items} venda(s) · bruto {formatarMoeda(r.gross, true)} · taxa Lookly {formatarMoeda(r.fees, true)} · tarifa MP {formatarMoeda(r.mp_fees ?? 0, true)}
          </Text>
          <Text className="text-ink text-lg font-display-bold">A repassar: {formatarMoeda(r.net, true)}</Text>
          <Linha><Acao label="Marcar como pago" onPress={() => pagar(r)} /></Linha>
        </Cartao>
      ))}
    </View>
  );
}

// ─── Tela ─────────────────────────────────────────────────────────────────────

export default function AdminScreen(): React.ReactElement {
  const navigation = useNavigation<any>();
  const [aba, setAba] = useState<Aba>('resumo');
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [lojaFiltro, setLojaFiltro] = useState<LojaAdmin | null>(null);

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Administração" subtitle="Lookly" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 16 }} keyboardShouldPersistTaps="handled">
        {/* Abas em grade: quebram linha, nada fica fora da tela no PC */}
        <View className="flex-row flex-wrap gap-2">
          {ABAS.map((a) => (
            <Chip key={a.id} label={a.label} icon={a.icon} ativo={aba === a.id} onPress={() => { setAba(a.id); if (a.id !== 'pecas') setLojaFiltro(null); }} />
          ))}
        </View>

        {aba === 'resumo' && <AbaResumo />}
        {aba === 'usuarios' && <AbaUsuarios abrir={setDialogo} />}
        {aba === 'lojas' && <AbaLojas abrir={setDialogo} verPecas={(l) => { setLojaFiltro(l); setAba('pecas'); }} />}
        {aba === 'pecas' && <AbaPecas key={lojaFiltro?.id ?? 'todas'} abrir={setDialogo} loja={lojaFiltro} limparLoja={() => setLojaFiltro(null)} />}
        {aba === 'pedidos' && <AbaPedidos />}
        {aba === 'categorias' && <AbaCategorias abrir={setDialogo} />}
        {aba === 'denuncias' && <AbaDenuncias />}
        {aba === 'taxa' && <AbaTaxa />}
      </ScrollView>

      {dialogo?.tipo === 'editar' ? (
        <Editor titulo={dialogo.titulo} campos={dialogo.campos} onSalvar={dialogo.onSalvar} onFechar={() => setDialogo(null)} />
      ) : null}
      {dialogo?.tipo === 'apagar' ? (
        <ConfirmarExclusao titulo={dialogo.titulo} aviso={dialogo.aviso} onApagar={dialogo.onApagar} onFechar={() => setDialogo(null)} />
      ) : null}
    </View>
  );
}
