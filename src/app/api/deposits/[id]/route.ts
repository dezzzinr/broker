import { cancelDeposit } from "@/lib/server/services/deposit.service";
import { getFundRequest } from "@/lib/server/repo/funds";
import { assertSameOrigin, forbidden, handleApiError, notFound, ok, requireApiUser } from "@/lib/server/http";
import { requestMeta } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

/** GET /api/deposits/:id — one of the signed-in user's fund requests. */
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const user = await requireApiUser();
    const { id } = await ctx.params;
    const request = getFundRequest(id);
    if (!request) throw notFound("That request does not exist.");
    if (request.userId !== user.id && user.role !== "admin") throw forbidden();
    return ok({ request });
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/deposits/:id — cancels a pending request (refunds withdrawals). */
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    const user = await requireApiUser();
    const meta = await requestMeta();
    const { id } = await ctx.params;
    const request = getFundRequest(id);
    if (!request) throw notFound("That request does not exist.");
    if (request.userId !== user.id) throw forbidden();

    cancelDeposit(user, id, meta);
    return ok({ cancelled: true });
  } catch (error) {
    return handleApiError(error);
  }
}
