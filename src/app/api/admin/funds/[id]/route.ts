import { approveDeposit, rejectDeposit } from "@/lib/server/services/deposit.service";
import { getFundRequest } from "@/lib/server/repo/funds";
import { reviewSchema } from "@/lib/server/validation";
import {
  assertSameOrigin,
  handleApiError,
  notFound,
  ok,
  rateLimit,
  readJson,
  requireApiAdmin,
  tooMany,
} from "@/lib/server/http";
import { requestMeta } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

/** GET /api/admin/funds/:id — one request with its requester context. */
export async function GET(_req: Request, ctx: Ctx) {
  try {
    await requireApiAdmin();
    const { id } = await ctx.params;
    const request = getFundRequest(id);
    if (!request) throw notFound("That request no longer exists.");
    return ok({ request });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/admin/funds/:id — approves or rejects a pending request.
 * `{ decision: "approved" | "rejected", note?: string }`
 * Approval credits the user's wallet inside the same transaction.
 */
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    const admin = await requireApiAdmin();
    const meta = await requestMeta();
    const { id } = await ctx.params;

    const limit = rateLimit(`review:${admin.id}`, 120, 10 * 60_000);
    if (!limit.allowed) throw tooMany("You are reviewing too quickly. Please slow down.");

    const input = await readJson(req, reviewSchema);
    const request =
      input.decision === "approved"
        ? approveDeposit(admin, id, meta, input.note)
        : rejectDeposit(admin, id, meta, input.note);

    return ok({ request });
  } catch (error) {
    return handleApiError(error);
  }
}
