import type { Transaction } from "@/lib/types";
import { TRANSACTIONS } from "@/lib/data/transactions";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class MockTransactionsService {
  async getTransactions(): Promise<Transaction[]> {
    await sleep(160 + Math.random() * 220);
    return structuredClone(TRANSACTIONS);
  }
}
