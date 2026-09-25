import { resetUserPassword } from "@/lib/server/services/admin.service";
import { resetPasswordSchema } from "@/lib/server/validation";
import { getAdminUser } from "@/lib/server/repo/users";
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

/** POST /api/admin/users/:id/password — administrator password reset. */
export async function POST(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    const admin = await requireApiAdmin();
    const meta = await requestMeta();
    const { id } = await ctx.params;
    if (!getAdminUser(id)) throw notFound("That account no longer exists.");

    const limit = rateLimit(`reset:${admin.id}`, 10, 10 * 60_000);
    if (!limit.allowed) throw tooMany("Too many password resets. Try again later.");

    const input = await readJson(req, resetPasswordSchema);
    resetUserPassword(admin, id, input.newPassword, input.notifyUser, meta);
    return ok({ reset: true });
  } catch (error) {
    return handleApiError(error);
  }
}
