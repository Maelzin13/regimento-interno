// src/app/services/token-storage.service.ts
import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly tokenKey = 'authToken';
  constructor(private storage: StorageService) {}

  getToken(): Promise<string | null> {
    return this.storage.get<string>(this.tokenKey);
  }
  setToken(token: string): Promise<void> {
    return this.storage.set(this.tokenKey, token);
  }
  removeToken(): Promise<void> {
    return this.storage.remove(this.tokenKey);
  }
  clearAll(): Promise<void> {
    return this.storage.clear();
  }
}
