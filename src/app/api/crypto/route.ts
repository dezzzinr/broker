import { NextResponse } from "next/server";
import { COINS } from "@/lib/data/coins";

/**
 * GET /api/crypto            → all coins
 * GET /api/crypto?symbols=BTC,ETH → filtered by symbol
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get("symbols");

  if (symbols) {
    const wanted = new Set(symbols.split(",").map((s) => s.trim().toUpperCase()));
    const coins = COINS.filter((c) => wanted.has(c.symbol));
    return NextResponse.json(coins);
  }

  return NextResponse.json(COINS);
}
