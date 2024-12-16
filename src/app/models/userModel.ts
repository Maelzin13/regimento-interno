export class UserModel {
  name: string;
  email: string;
  photo?: string;

  constructor(data: Partial<UserModel>) {
    this.name = data.name || '';
    this.email = data.email || '';
    this.photo = data.photo || '';
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
  }
}
