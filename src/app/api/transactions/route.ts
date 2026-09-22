import { NextResponse } from "next/server";
import { TRANSACTIONS } from "@/lib/data/transactions";

/** GET /api/transactions → mock demo transaction history */
export async function GET() {
  return NextResponse.json(TRANSACTIONS);
}
