import { listMethods } from "@/lib/server/repo/methods";
import { saveMethod } from "@/lib/server/services/admin.service";
import { methodSchema } from "@/lib/server/validation";
import {
  assertSameOrigin,
  handleApiError,
  ok,
  readJson,
  requireApiAdmin,
} from "@/lib/server/http";
import { requestMeta } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/** GET /api/admin/methods — every deposit method, including disabled ones. */
export async function GET() {
  try {
    await requireApiAdmin();
    return ok({ methods: listMethods(true) });
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST /api/admin/methods — creates a funding method users can choose from. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const admin = await requireApiAdmin();
    const meta = await requestMeta();
    const input = await readJson(req, methodSchema);
    const method = saveMethod(admin, input, meta);
    return ok({ method }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
