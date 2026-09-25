import { adjustBalance } from "@/lib/server/services/admin.service";
import { balanceAdjustSchema } from "@/lib/server/validation";
import { getAdminUser } from "@/lib/server/repo/users";
import { assertSameOrigin, handleApiError, notFound, ok, readJson, requireApiAdmin } from "@/lib/server/http";
import { requestMeta } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

/** POST /api/admin/users/:id/balance — credit or debit a wallet (manual adjustment). */
export async function POST(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    const admin = await requireApiAdmin();
    const meta = await requestMeta();
    const { id } = await ctx.params;
    if (!getAdminUser(id)) throw notFound("That account no longer exists.");

    const input = await readJson(req, balanceAdjustSchema);
    const result = adjustBalance(admin, id, input.asset, input.amount, input.reason, meta);
    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}
