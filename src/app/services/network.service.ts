import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Network } from '@capacitor/network';

@Injectable({
  providedIn: 'root',
})
export class NetworkService {
  private onlineStatus = new BehaviorSubject<boolean>(true);

  constructor() {
    this.initializeNetworkEvents();
  }

  get isOnline$() {
    return this.onlineStatus.asObservable();
  }

  get currentStatus(): boolean {
    return this.onlineStatus.value;
  }

  private async initializeNetworkEvents() {
    const status = await Network.getStatus();
    this.onlineStatus.next(status.connected);

    Network.addListener('networkStatusChange', (status) => {
      this.onlineStatus.next(status.connected);
    });
  }
}
