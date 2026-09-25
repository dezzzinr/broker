import { getMethod } from "@/lib/server/repo/methods";
import { removeMethod, saveMethod } from "@/lib/server/services/admin.service";
import { methodPatchSchema } from "@/lib/server/validation";
import {
  assertSameOrigin,
  handleApiError,
  notFound,
  ok,
  readJson,
  requireApiAdmin,
} from "@/lib/server/http";
import { requestMeta } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

/** PATCH /api/admin/methods/:id — updates a funding method. */
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    const admin = await requireApiAdmin();
    const meta = await requestMeta();
    const { id } = await ctx.params;
    if (!getMethod(id)) throw notFound("Deposit method not found.");

    const input = await readJson(req, methodPatchSchema);
    const method = saveMethod(admin, { ...input, id }, meta);
    return ok({ method });
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/admin/methods/:id — removes a funding method. */
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    const admin = await requireApiAdmin();
    const meta = await requestMeta();
    const { id } = await ctx.params;
    removeMethod(admin, id, meta);
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
