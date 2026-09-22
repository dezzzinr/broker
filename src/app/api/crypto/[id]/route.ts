import { NextResponse } from "next/server";
import { COIN_MAP } from "@/lib/data/coins";

/** GET /api/crypto/[id] → single coin or 404 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const coin = COIN_MAP.get(id);
  if (!coin) {
    return NextResponse.json({ error: "Coin not found" }, { status: 404 });
  }
  return NextResponse.json(coin);
}
