export interface Plan {
  id: string;
  nome: string;
  preco: string;
  intervalo: string;
  ativo: boolean;
  atualizavel: boolean;
}

export interface PlansResponse {
  planos: Plan[];
  planoAtivo: Plan | null;
  assinaturaAtiva: any | null;
}