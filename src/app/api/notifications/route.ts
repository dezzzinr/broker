import { z } from "zod";
import {
  listNotifications,
  markAllRead,
  markRead,
  unreadCount,
} from "@/lib/server/repo/notifications";
import { assertSameOrigin, handleApiError, ok, readJson, requireApiUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** GET /api/notifications — the bell dropdown contents. */
export async function GET() {
  try {
    const user = await requireApiUser();
    return ok({
      notifications: listNotifications(user.id, 15),
      unread: unreadCount(user.id),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const patchSchema = z.object({
  id: z.string().min(1).optional(),
  all: z.boolean().optional(),
});

/** POST /api/notifications — marks one (or all) notifications as read. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireApiUser();
    const input = await readJson(req, patchSchema);

    if (input.all) markAllRead(user.id);
    else if (input.id) markRead(input.id, user.id);

    return ok({ unread: unreadCount(user.id) });
  } catch (error) {
    return handleApiError(error);
  }
}
