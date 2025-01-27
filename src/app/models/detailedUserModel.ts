export class DetailedUserModel {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  plan?: string;
  subscriptionStatus?: string;
  subscriptionStartDate?: Date | null;
  subscriptionEndDate?: Date | null;
  photo?: string;

  constructor(data: Partial<DetailedUserModel>) {
    this.id = data.id || 0;
    this.name = data.name || '';
    this.email = data.email || '';
    this.isAdmin = !!data.isAdmin;
    this.plan = data.plan || 'not_informed';
    this.subscriptionStatus = data.subscriptionStatus || 'inactive';
    this.subscriptionStartDate = data.subscriptionStartDate
      ? new Date(data.subscriptionStartDate)
      : null;
    this.subscriptionEndDate = data.subscriptionEndDate
      ? new Date(data.subscriptionEndDate)
      : null;
    this.photo = data.photo || '';
  }

  static fromJSON(data: any): DetailedUserModel {
    return new DetailedUserModel({
      id: data.id,
      name: data.name,
      email: data.email,
      isAdmin: data.is_admin === 1,
      plan: data.plan,
      subscriptionStatus: data.subscription_status,
      subscriptionStartDate: data.subscription_start_date,
      subscriptionEndDate: data.subscription_end_date,
      photo: data.photo,
    });
  }

  toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      is_admin: this.isAdmin ? 1 : 0,
      plan: this.plan,
      subscription_status: this.subscriptionStatus,
      subscription_start_date:
        this.subscriptionStartDate?.toISOString() || null,
      subscription_end_date: this.subscriptionEndDate?.toISOString() || null,
      photo: this.photo,
    };
  }
}
