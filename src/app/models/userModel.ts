export class UserModel {
  id: number;
  name: string;
  email: string;
  token?: string;
  provider?: string;
  is_admin?: boolean;
  password?: boolean;

  constructor(data: Partial<UserModel>) {
    this.id = data.id || 0;
    this.name = data.name || '';
    this.email = data.email || '';
    this.token = data.token || '';
    this.provider = data.provider || '';
    this.is_admin = !!data.is_admin;
  }

  static fromLocalStorage(): UserModel | null {
    const user = localStorage.getItem('authUser');
    return user ? new UserModel(JSON.parse(user)) : null;
  }

  saveToLocalStorage(): void {
    localStorage.setItem('authUser', JSON.stringify(this));
  }

  static clearLocalStorage(): void {
    localStorage.removeItem('authUser');
    localStorage.removeItem('authToken');
  }
}
