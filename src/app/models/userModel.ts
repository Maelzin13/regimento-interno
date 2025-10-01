export class UserModel {
  id: any;
  name: string = '';
  email: string = '';
  token: string = '';
  provider: string = '';
  password: string = '';
  is_admin: boolean = false;
  subscription_status: string = '';
  plan: any = '';
  subscription_start_date: string = '';
  subscription_end_date: string = '';
  ends_at: string = '';
  stripe_id: string = '';
  pm_type: string = '';
  pm_last_four: string = '';
  trial_ends_at: string = '';
  created_at: string = '';
  updated_at: string = '';
  provider_id: string = '';
}
