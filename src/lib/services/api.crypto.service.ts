import type { Coin } from "@/lib/types";
import type { CryptoService } from "./crypto.service";

/**
 * Service implementation backed by this app's own REST endpoints
 * (/api/crypto). Swap the exported `cryptoService` singleton to go live.
 */
export class ApiCryptoService implements CryptoService {
  constructor(private baseUrl = "/api/crypto") {}

  async getCoins(): Promise<Coin[]> {
    const res = await fetch(this.baseUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load coins (${res.status})`);
    return res.json();
  }

  async getCoin(id: string): Promise<Coin | null> {
    const res = await fetch(`${this.baseUrl}/${id}`, { cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to load coin (${res.status})`);
    return res.json();
  }

  async getCoinsBySymbols(symbols: string[]): Promise<Coin[]> {
    const qs = new URLSearchParams({ symbols: symbols.join(",") });
    const res = await fetch(`${this.baseUrl}?${qs}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load tickers (${res.status})`);
    return res.json();
  }
}
