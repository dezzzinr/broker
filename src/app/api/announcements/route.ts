import { listAnnouncements } from "@/lib/server/repo/settings";
import { handleApiError, ok } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** GET /api/announcements — published announcements for the support page. */
export async function GET() {
  try {
    return ok({ announcements: listAnnouncements({ limit: 20 }) });
  } catch (error) {
    return handleApiError(error);
  }
}
