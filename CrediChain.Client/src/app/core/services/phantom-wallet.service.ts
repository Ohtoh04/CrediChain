import { Injectable, signal } from '@angular/core';
import { PublicKey } from '@solana/web3.js';


interface PhantomProvider {
  isPhantom?: boolean;
  publicKey?: PublicKey | null;

  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;

  on: (event: string, handler: (...args: any[]) => void) => void;
  request: (method: string, params?: any) => Promise<any>;
}

function getPhantomProvider(): PhantomProvider | null {
  const provider = (window as any).solana;
  if (provider?.isPhantom) return provider as PhantomProvider;
  return null;
}

@Injectable({ providedIn: 'root' })
export class PhantomWalletService {
  private provider = getPhantomProvider();
  public publicKey = signal<PublicKey | null>(null);

  constructor() {
    this.provider?.on('connect', (publicKey: PublicKey) => {
      this.publicKey.set(publicKey);
    });

    this.provider?.on('disconnect', () => {
      console.log("[PhantomWalletService] Wallet disconnected")
      this.publicKey.set(null);
    });
  }

  isPhantomInstalled(): boolean {
    return !!this.provider;
  }

  async connect(): Promise<PublicKey> {
    if (!this.provider) {
      throw new Error('Phantom wallet not found. Install from https://phantom.app/');
    }

    try {
      const { publicKey } = await this.provider.connect();
      this.publicKey.set(publicKey);
      return publicKey;
    } catch (err) {
      console.error('Phantom connection error', err);
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.provider) return;
    console.log("disconnected");
    await this.provider.disconnect();
    this.publicKey.set(null);
  }

  getProvider(): PhantomProvider | null {
    return this.provider;
  }
}
