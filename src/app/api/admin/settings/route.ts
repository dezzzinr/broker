import { getPlatformSettings, listAnnouncements } from "@/lib/server/repo/settings";
import { savePlatformSettings } from "@/lib/server/services/admin.service";
import { platformSettingsSchema } from "@/lib/server/validation";
import { assertSameOrigin, handleApiError, ok, readJson, requireApiAdmin } from "@/lib/server/http";
import { requestMeta } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/** GET /api/admin/settings — platform configuration + announcements. */
export async function GET() {
  try {
    await requireApiAdmin();
    return ok({
      settings: getPlatformSettings(),
      announcements: listAnnouncements({ includeUnpublished: true }),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/** PATCH /api/admin/settings — updates platform configuration. */
export async function PATCH(req: Request) {
  try {
    assertSameOrigin(req);
    const admin = await requireApiAdmin();
    const meta = await requestMeta();
    const patch = await readJson(req, platformSettingsSchema);
    const settings = savePlatformSettings(admin, patch, meta);
    return ok({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}
