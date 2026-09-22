import type { Coin } from "@/lib/types";
import { COINS } from "@/lib/data/coins";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Abstraction over market data. UI components only ever talk to this
 * interface, so a real provider (CoinGecko, CCXT, exchange WebSocket…) can
 * replace the mock without touching a single component.
 */
export interface CryptoService {
  getCoins(): Promise<Coin[]>;
  getCoin(id: string): Promise<Coin | null>;
  getCoinsBySymbols(symbols: string[]): Promise<Coin[]>;
}

/** Local mock service with realistic network latency. */
export class MockCryptoService implements CryptoService {
  private async lag<T>(value: T): Promise<T> {
    await sleep(180 + Math.random() * 220);
    return structuredClone(value);
  }

  getCoins(): Promise<Coin[]> {
    return this.lag(COINS);
  }

  async getCoin(id: string): Promise<Coin | null> {
    const coin = COINS.find((c) => c.id === id) ?? null;
    return this.lag(coin);
  }

  async getCoinsBySymbols(symbols: string[]): Promise<Coin[]> {
    const wanted = new Set(symbols.map((s) => s.toUpperCase()));
    const coins = COINS.filter((c) => wanted.has(c.symbol));
    return this.lag(coins);
  }
}
