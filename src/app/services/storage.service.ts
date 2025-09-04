import { Storage } from '@ionic/storage-angular';
import { Injectable, Inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private ready = this.storage.create();
  constructor(@Inject(Storage) private storage: Storage) {}

  async get<T = any>(key: string): Promise<T | null> {
    await this.ready;
    return (await this.storage.get(key)) ?? null;
  }
  async set(key: string, value: any): Promise<void> {
    await this.ready;
    await this.storage.set(key, value);
  }
  async remove(key: string): Promise<void> {
    await this.ready;
    await this.storage.remove(key);
  }
  async clear(): Promise<void> {
    await this.ready;
    await this.storage.clear();
  }
}
