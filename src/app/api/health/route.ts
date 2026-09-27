import { NextResponse } from "next/server";
import { db, dbFile } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — lightweight deployment probe.
 *
 * Opens (and if needed creates + seeds) the database and reports which file
 * ended up being used. On hosts with a read-only filesystem this surfaces the
 * ephemeral temp-dir fallback instead of failing opaquely.
 */
export async function GET() {
  try {
    db().prepare("SELECT 1 AS ok").get();
    return NextResponse.json({
      ok: true,
      data: {
        service: "quantix",
        database: dbFile(),
        time: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 503 },
    );
  }
}
