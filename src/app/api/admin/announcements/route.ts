import { listAnnouncements } from "@/lib/server/repo/settings";
import { broadcastMessage, publishAnnouncement, removeAnnouncement } from "@/lib/server/services/admin.service";
import { announcementSchema } from "@/lib/server/validation";
import { assertSameOrigin, handleApiError, ok, readJson, requireApiAdmin } from "@/lib/server/http";
import { requestMeta } from "@/lib/server/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** GET /api/admin/announcements — every announcement, published or not. */
export async function GET() {
  try {
    await requireApiAdmin();
    return ok({ announcements: listAnnouncements({ includeUnpublished: true }) });
  } catch (error) {
    return handleApiError(error);
  }
}

const postSchema = z.discriminatedUnion("intent", [
  announcementSchema.extend({ intent: z.literal("announcement") }),
  z
    .object({
      intent: z.literal("broadcast"),
      title: z.string().trim().min(3).max(120),
      body: z.string().trim().min(5).max(400),
      href: z.string().trim().max(120).optional(),
    }),
]);

/** POST /api/admin/announcements — publishes an announcement or a broadcast. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const admin = await requireApiAdmin();
    const meta = await requestMeta();
    const input = await readJson(req, postSchema);

    if (input.intent === "broadcast") {
      const reached = broadcastMessage(admin, input, meta);
      return ok({ reached }, 201);
    }

    const announcement = publishAnnouncement(admin, input, meta);
    return ok({ announcement }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/admin/announcements?id=… — removes an announcement. */
export async function DELETE(req: Request) {
  try {
    assertSameOrigin(req);
    const admin = await requireApiAdmin();
    const meta = await requestMeta();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return ok({ deleted: false });
    removeAnnouncement(admin, id, meta);
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
