export class UserModel {
  id?: number;
  name: string;
  email: string;
  photo?: string;
  provider?: string;
  token?: string;

  constructor(data: Partial<UserModel>) {
    this.id = data.id || 0;
    this.name = data.name || '';
    this.email = data.email || '';
    this.photo = data.photo || '';
    this.provider = data.provider || '';
    this.token = data.token || '';
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
