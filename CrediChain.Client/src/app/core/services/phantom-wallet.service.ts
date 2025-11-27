import { Injectable, signal } from '@angular/core';
import { PublicKey } from '@solana/web3.js';

@Injectable({
  providedIn: 'root',
})
export class PhantomWalletService {
  private provider: any;
  public publicKey = signal<PublicKey | null>(null);

  constructor() {
    this.provider = (window as any).solana;
  }

  isPhantomInstalled(): boolean {
    return !!this.provider?.isPhantom;
  }

  async connect() {
    if (!this.isPhantomInstalled()) {
      throw new Error('Phantom wallet not found');
    }

    const resp = await this.provider.connect();
    this.publicKey.set(new PublicKey(resp.publicKey.toString()));
    return this.publicKey;
  }

  async disconnect() {
    await this.provider.disconnect();
    this.publicKey.set(null);
  }

  getProvider() {
    return this.provider;
  }
}
