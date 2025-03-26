export interface DashboardData {
  active_subscriptions: number;
  pending_subscriptions: number;
  canceled_subscriptions: number;
  total_revenue: string;
  recent_subscriptions: Subscription[];
  recent_payments: Payment[];
}

export interface Subscription {
  id: number;
  user_id: number;
  type: string;
  stripe_status: string;
  created_at: string;
  user: {
    name: string;
    email: string;
    plan: string;
  };
}

export interface Payment {
  id: number;
  status: string;
  valor: string;
  payment_method: string;
  created_at: string;
  user: {
    name: string;
    email: string;
  };
}
