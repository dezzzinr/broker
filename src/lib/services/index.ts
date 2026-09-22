import { ApiCryptoService } from "./api.crypto.service";
import { MockCryptoService, type CryptoService } from "./crypto.service";
import { MockPortfolioService, type PortfolioService } from "./portfolio.service";
import { MockTransactionsService } from "./transactions.service";

/**
 * Service singletons.
 *
 * The mock implementations run fully offline. To connect a real backend,
 * point NEXT_PUBLIC_CRYPTO_API_URL at the REST endpoint and restart — every
 * UI component keeps working because it only depends on the interfaces.
 */
const useApi = Boolean(process.env.NEXT_PUBLIC_CRYPTO_API_URL);

export const cryptoService: CryptoService = useApi
  ? new ApiCryptoService(process.env.NEXT_PUBLIC_CRYPTO_API_URL)
  : new MockCryptoService();

export const portfolioService: PortfolioService = new MockPortfolioService(cryptoService);

export const transactionsService = new MockTransactionsService();
