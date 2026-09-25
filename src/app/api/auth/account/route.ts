import { changePasswordSchema, profileSchema } from "@/lib/server/validation";
import { changePassword, updateProfile } from "@/lib/server/services/auth.service";
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
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.discriminatedUnion("intent", [
  profileSchema.extend({ intent: z.literal("profile") }),
  changePasswordSchema.extend({ intent: z.literal("password") }),
]);

/**
 * POST /api/auth/account — updates the signed-in profile or changes the password.
 * `{ intent: "profile" | "password", ... }`
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireApiUser();
    const meta = await requestMeta();
    const input = await readJson(req, bodySchema);

    if (input.intent === "password") {
      const limit = rateLimit(`password:${user.id}`, 5, 10 * 60_000);
      if (!limit.allowed) throw tooMany("Too many password changes. Try again later.");
      changePassword(user, input.currentPassword, input.newPassword, meta);
      return ok({ updated: "password" });
    }

    const updated = updateProfile(user, input, meta);
    return ok({ updated: "profile", user: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
