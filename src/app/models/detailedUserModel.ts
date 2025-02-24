export class DetailedUserModel {
  id: number;
  name: string;
  plan?: string;
  email: string;
  isAdmin: boolean;
  subscriptionStartDate?: any;
  subscriptionEndDate?: any;
  subscriptionStatus?: string;

  constructor(data: Partial<DetailedUserModel>) {
    this.id = data.id || 0;
    this.name = data.name || '';
    this.isAdmin = !!data.isAdmin;
    this.email = data.email || '';
    this.plan = data.plan || 'not_informed';
    this.subscriptionEndDate = data.subscriptionEndDate;
    this.subscriptionStartDate = data.subscriptionStartDate;
    this.subscriptionStatus = data.subscriptionStatus || 'inactive';
  }

  static fromJSON(data: any): DetailedUserModel {
    return new DetailedUserModel({
      id: data.id,
      name: data.name,
      plan: data.plan,
      email: data.email,
      isAdmin: data.is_admin === 1,
      subscriptionStatus: data.subscription_status,
      subscriptionStartDate: data.subscription_start_date,
    });
  }

  toJSON(): any {
    return {
      id: this.id,
      plan: this.plan,
      name: this.name,
      email: this.email,
      is_admin: this.isAdmin ? 1 : 0,
      subscription_status: this.subscriptionStatus,
      subscription_end_date: this.subscriptionEndDate || null,
      subscription_start_date: this.subscriptionStartDate || null,
    };
  }
}
