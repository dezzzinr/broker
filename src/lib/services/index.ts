import { ApiCryptoService } from "./api.crypto.service";
import { MockCryptoService, type CryptoService } from "./crypto.service";

/**
 * Market-data service singleton.
 *
 * The offline mock keeps the platform fully self-contained. To stream a real
 * feed, point NEXT_PUBLIC_CRYPTO_API_URL at a REST endpoint that returns the
 * `Coin` shape and restart — every component keeps working because it only
 * depends on the CryptoService interface.
 *
 * Account data (balances, deposits, trades, ledger) never goes through this
 * layer: it is served by the platform API routes backed by SQLite.
 */
const useApi = Boolean(process.env.NEXT_PUBLIC_CRYPTO_API_URL);

export const cryptoService: CryptoService = useApi
  ? new ApiCryptoService(process.env.NEXT_PUBLIC_CRYPTO_API_URL!)
  : new MockCryptoService();

export type { CryptoService };
