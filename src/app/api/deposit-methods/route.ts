import { listMethods } from "@/lib/server/repo/methods";
import { getPlatformSettings } from "@/lib/server/repo/settings";
import { handleApiError, ok, requireApiUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/deposit-methods — enabled funding methods for the signed-in user,
 * together with the platform-wide deposit limits.
 */
export async function GET() {
  try {
    const user = await requireApiUser();
    const platform = getPlatformSettings();
    return ok({
      methods: listMethods(false),
      limits: {
        minDeposit: platform.minDeposit,
        maxDeposit: platform.maxDeposit,
        withdrawalEnabled: platform.withdrawalEnabled,
      },
      user: { id: user.id, name: user.name, kycStatus: user.kycStatus },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
