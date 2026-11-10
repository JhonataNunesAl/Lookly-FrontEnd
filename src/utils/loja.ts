import { CategoryResponse, LookResponse } from '../types/api';

/** Estoque "baixo": a partir daqui o painel avisa que está acabando. */
export const ESTOQUE_BAIXO = 3;

/** Dias no feed antes de a peça entrar em "vale rever". */
export const DIAS_PARA_AVALIAR = 3;

function idadeEmDias(look: LookResponse): number {
  if (!look.created_at) return DIAS_PARA_AVALIAR; // sem data, não esconde o alerta
  return (Date.now() - new Date(look.created_at).getTime()) / 86400000;
}

export interface ResumoLoja {
  pecas: number;
  curtidas: number;
  salvos: number;
  unidades: number;
  semEstoque: LookResponse[];
  estoqueBaixo: LookResponse[];
  /** Rascunho / em revisão / removida: fora do feed público. */
  foraDoFeed: LookResponse[];
  semCurtidas: LookResponse[];
}

/** Soma o que o catálogo da loja já tem de real: curtidas, salvos e estoque. */
export function resumirLoja(looks: LookResponse[]): ResumoLoja {
  return {
    pecas: looks.length,
    curtidas: looks.reduce((s, l) => s + l.likes_count, 0),
    salvos: looks.reduce((s, l) => s + l.saves_count, 0),
    unidades: looks.reduce((s, l) => s + l.stock_quantity, 0),
    semEstoque: looks.filter((l) => l.stock_quantity <= 0),
    estoqueBaixo: looks.filter((l) => l.stock_quantity > 0 && l.stock_quantity <= ESTOQUE_BAIXO),
    foraDoFeed: looks.filter((l) => l.status !== 'active'),
    // Só vale apontar "sem curtidas" depois de a peça ter tido tempo de circular.
    semCurtidas: looks.filter((l) => l.status === 'active' && l.likes_count === 0 && idadeEmDias(l) >= DIAS_PARA_AVALIAR),
  };
}

/** Peças ordenadas pelo interesse do público (curtidas, e salvos pesam mais:
 *  salvar é sinal de intenção de compra — mesma lógica do back, +2 / +4). */
export function maisEngajadas(looks: LookResponse[], max = 5): LookResponse[] {
  const pontos = (l: LookResponse) => l.likes_count * 2 + l.saves_count * 4;
  return [...looks].filter((l) => pontos(l) > 0).sort((a, b) => pontos(b) - pontos(a)).slice(0, max);
}

export interface FatiaCategoria {
  nome: string;
  pontos: number;
  pct: number;
}

/** Quanto do interesse (curtidas e salvos) veio de cada categoria. */
export function interessePorCategoria(looks: LookResponse[], categorias: CategoryResponse[]): FatiaCategoria[] {
  const nomes = new Map(categorias.map((c) => [c.id, c.name]));
  const soma = new Map<string, number>();
  for (const l of looks) {
    const pts = l.likes_count * 2 + l.saves_count * 4;
    if (pts > 0) soma.set(l.category_id, (soma.get(l.category_id) ?? 0) + pts);
  }
  const total = [...soma.values()].reduce((a, b) => a + b, 0);
  if (!total) return [];
  return [...soma.entries()]
    .map(([id, pontos]) => ({ nome: nomes.get(id) ?? 'Outras', pontos, pct: Math.round((pontos / total) * 100) }))
    .sort((a, b) => b.pontos - a.pontos);
}
