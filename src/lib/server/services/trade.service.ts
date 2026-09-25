import "server-only";
import * as wallet from "../repo/wallet";
import * as activity from "../repo/activity";
import * as notifications from "../repo/notifications";
import { ApiError } from "../http";
import type { SessionUser } from "../auth";
import type { RequestMeta } from "./auth.service";
import type { Coin } from "@/lib/types";

/**
 * Spot trading against real per-user balances.
 *
 * Orders settle immediately at the quoted price (market) or the limit price,
 * moving quote and base balances atomically and recording the fill in the
 * ledger and the activity stream.
 */

export interface PlaceOrderInput {
  coin: Coin;
  side: "buy" | "sell";
  orderType: "market" | "limit";
  baseAmount: number;
  price: number;
}

const FEE_RATE = 0.001;

export function placeOrder(user: SessionUser, input: PlaceOrderInput, meta: RequestMeta) {
  const { coin, side, orderType, baseAmount, price } = input;
  const quoteAsset = "USD";
  const baseAsset = coin.symbol;

  if (baseAsset === quoteAsset) {
    throw new ApiError(400, "USDT/USD pairs cannot be traded against themselves.");
  }
  if (!(baseAmount > 0) || !(price > 0)) {
    throw new ApiError(400, "Enter a valid amount and price.", {
      amount: "Must be greater than zero.",
    });
  }

  const gross = baseAmount * price;
  const fee = Math.round(gross * FEE_RATE * 100) / 100;

  wallet.ensureAssets(user.id, [baseAsset, quoteAsset]);

  let result: { txId: string };
  try {
    result = wallet.executeTrade({
      userId: user.id,
      side,
      baseAsset,
      quoteAsset,
      baseAmount,
      price,
      fee,
      note: `${side === "buy" ? "Bought" : "Sold"} ${baseAmount} ${baseAsset} @ ${price.toFixed(2)} (${orderType})`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Order could not be filled.";
    activity.logActivity({
      actionKey: "tradeExecuted",
      userId: user.id,
      summary: `${side === "buy" ? "Buy" : "Sell"} order rejected — ${message}`,
      entityType: "order",
      severity: "warning",
      meta: { coin: baseAsset, side, baseAmount, price, reason: message },
      ...meta,
    });
    throw new ApiError(400, message, { amount: message });
  }

  activity.logActivity({
    actionKey: "tradeExecuted",
    userId: user.id,
    summary: `${side === "buy" ? "Bought" : "Sold"} ${baseAmount} ${baseAsset} at ${price.toFixed(2)} (${orderType})`,
    entityType: "order",
    entityId: result.txId,
    severity: "success",
    meta: { coin: baseAsset, side, baseAmount, price, fee, gross, orderType },
    ...meta,
  });

  if (user.role === "user") {
    notifications.pushNotification({
      userId: user.id,
      title: `${side === "buy" ? "Buy" : "Sell"} order filled`,
      body: `${baseAmount} ${baseAsset} at ${price.toFixed(2)} · fee ${fee.toFixed(2)} USD`,
      kind: "success",
      href: "/transactions",
    });
  }

  return {
    txId: result.txId,
    fee,
    gross,
    total: side === "buy" ? gross + fee : gross - fee,
    balances: wallet.getBalances(user.id),
  };
}
