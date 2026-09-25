import { supportSchema } from "@/lib/server/validation";
import * as activity from "@/lib/server/repo/activity";
import { notifyAdmins } from "@/lib/server/services/deposit.service";
import {
  assertSameOrigin,
  handleApiError,
  ok,
  rateLimit,
  readJson,
  requireApiUser,
  tooMany,
} from "@/lib/server/http";
import { requestMeta } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/** POST /api/support — raises a support request that lands in the admin console. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireApiUser();
    const meta = await requestMeta();

    const limit = rateLimit(`support:${user.id}`, 6, 60 * 60_000);
    if (!limit.allowed) throw tooMany("You have sent several requests recently. We'll be in touch.");

    const input = await readJson(req, supportSchema);

    activity.logActivity({
      actionKey: "supportTicket",
      userId: user.id,
      summary: `Support request — ${input.topic}`,
      entityType: "ticket",
      meta: { topic: input.topic, message: input.message.slice(0, 400) },
      ...meta,
    });

    notifyAdmins({
      title: `Support request from ${user.name}`,
      body: `${input.topic} — ${input.message.slice(0, 140)}`,
      href: `/admin/activity?userId=${user.id}`,
      kind: "info",
    });

    return ok({ received: true });
  } catch (error) {
    return handleApiError(error);
  }
}
