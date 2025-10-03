// Interface para detalhes do Stripe
export interface StripeDetails {
  cancel_at_period_end: boolean;
  cancel_at: string | null;
  current_period_end: string;
  current_period_start: string;
  status: string;
}

// Interface para informações da assinatura
export interface SubscriptionInfo {
  id: number;
  stripe_id: string;
  stripe_status: string;
  stripe_price: string;
  trial_ends_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  stripe_details: StripeDetails;
}

// Interface para informações do plano
export interface PlanInfo {
  name: string;
  price_id: string;
  is_free: boolean;
  intervalo: string;
  display_name: string;
  valor: number;
}

// Interface para política de assinatura
export interface SubscriptionPolicy {
  is_annual: boolean;
  is_active: boolean;
  can_switch_to_monthly: boolean;
  can_switch_to_annual: boolean;
  must_cancel_before_monthly: boolean;
}

// Interface para resposta do endpoint /me/assinatura
export interface MeAssinaturaResponse {
  active: boolean;
  status: string;
  ends_at: string;
  plan: string;
  will_cancel: boolean;
  current_period_end: string;
  policy: SubscriptionPolicy;
}

// Interface para resposta completa da API /profile
export interface ProfileResponse {
  user: UserModel;
  subscription: SubscriptionInfo;
  plan_info: PlanInfo;
}

export class UserModel {
  id: any;
  name: string = '';
  email: string = '';
  token: string = '';
  provider: string | null = null;
  password: string = '';
  is_admin: boolean = false;
  subscription_status: string = '';
  plan: any = '';
  subscription_start_date: string = '';
  subscription_end_date: string | null = null;
  ends_at: string = '';
  stripe_id: string = '';
  pm_type: string | null = null;
  pm_last_four: string | null = null;
  trial_ends_at: string | null = null;
  created_at: string = '';
  updated_at: string = '';
  provider_id: string | null = null;
  has_cancelled_once: boolean = false; // Campo para controlar cancelamento único
}
