import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root'
})
export class TokenStorageService {
  private readonly tokenKey = 'authToken';

  async getToken(): Promise<string | null> {
    if (Capacitor.getPlatform() === 'web') {
      return localStorage.getItem(this.tokenKey);
    }
    const result = await Preferences.get({ key: this.tokenKey });
    return result.value;
  }

  async setToken(token: string): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      localStorage.setItem(this.tokenKey, token);
    } else {
      await Preferences.set({ key: this.tokenKey, value: token });
    }
  }

  async removeToken(): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      localStorage.removeItem(this.tokenKey);
    } else {
      await Preferences.remove({ key: this.tokenKey });
    }
  }

  async clearAll(): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      localStorage.clear();
      sessionStorage.clear();
    } else {
      await Preferences.clear();
    }
  }
}
