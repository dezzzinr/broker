import { getAdminUser, updateUser } from "@/lib/server/repo/users";
import { getBalances } from "@/lib/server/repo/wallet";
import { listFundRequests } from "@/lib/server/repo/funds";
import { listLedger } from "@/lib/server/repo/ledger";
import { listActivity } from "@/lib/server/repo/activity";
import { deleteUser, setUserRole, setUserStatus, setKycStatus } from "@/lib/server/services/admin.service";
import {
  adminUserPatchSchema,
} from "@/lib/server/validation";
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

/** GET /api/admin/users/:id — full account dossier. */
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const admin = await requireApiAdmin();
    const { id } = await ctx.params;
    const user = getAdminUser(id);
    if (!user) throw notFound("That account no longer exists.");

    const funds = listFundRequests({ userId: id, pageSize: 20 });
    const ledger = listLedger({ userId: id, pageSize: 20 });
    const activityRows = listActivity({ userId: id, pageSize: 30 });

    return ok({
      user,
      balances: getBalances(id),
      fundRequests: funds.rows,
      fundTotal: funds.total,
      transactions: ledger.rows,
      transactionTotal: ledger.total,
      activity: activityRows.rows,
      activityTotal: activityRows.total,
      isSelf: admin.id === id,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/** PATCH /api/admin/users/:id — edit profile, role, status or KYC. */
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    const admin = await requireApiAdmin();
    const meta = await requestMeta();
    const { id } = await ctx.params;
    const patch = await readJson(req, adminUserPatchSchema);

    if (!getAdminUser(id)) throw notFound("That account no longer exists.");

    let user = getAdminUser(id)!;
    if (patch.status && patch.status !== user.status) {
      setUserStatus(admin, id, patch.status, meta, "");
    }
    if (patch.role && patch.role !== user.role) {
      setUserRole(admin, id, patch.role, meta);
    }
    if (patch.kycStatus && patch.kycStatus !== user.kycStatus) {
      setKycStatus(admin, id, patch.kycStatus, meta);
    }

    const profilePatch = {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.email !== undefined ? { email: patch.email } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      ...(patch.country !== undefined ? { country: patch.country } : {}),
      ...(patch.twoFactor !== undefined ? { twoFactor: patch.twoFactor } : {}),
    };
    if (Object.keys(profilePatch).length > 0) {
      updateUser(id, profilePatch);
    }

    user = getAdminUser(id)!;
    return ok({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/admin/users/:id — permanently removes an account. */
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    const admin = await requireApiAdmin();
    const meta = await requestMeta();
    const { id } = await ctx.params;
    deleteUser(admin, id, meta);
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
