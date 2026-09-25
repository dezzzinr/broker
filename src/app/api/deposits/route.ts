import { depositSchema, validateProofFile, withdrawalSchema } from "@/lib/server/validation";
import { submitDeposit, submitWithdrawal } from "@/lib/server/services/deposit.service";
import { listFundRequests } from "@/lib/server/repo/funds";
import {
  assertSameOrigin,
  badRequest,
  handleApiError,
  ok,
  rateLimit,
  requireApiUser,
  tooMany,
} from "@/lib/server/http";
import { requestMeta } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/** GET /api/deposits — the signed-in user's deposit + withdrawal history. */
export async function GET(req: Request) {
  try {
    const user = await requireApiUser();
    const url = new URL(req.url);
    const kind = (url.searchParams.get("kind") ?? "all") as "all" | "deposit" | "withdrawal";
    const status = (url.searchParams.get("status") ?? "all") as
      | "all"
      | "pending"
      | "approved"
      | "rejected"
      | "cancelled";
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));

    const result = listFundRequests({
      userId: user.id,
      kind,
      status,
      page,
      pageSize: 20,
    });
    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/deposits — submits a manual deposit (multipart with proof of
 * payment) or a withdrawal request (`kind=withdrawal`, JSON).
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireApiUser();
    const meta = await requestMeta();

    const contentType = req.headers.get("content-type") ?? "";
    const isMultipart = contentType.includes("multipart/form-data");

    if (isMultipart) {
      const limit = rateLimit(`deposit:${user.id}`, 12, 60 * 60_000);
      if (!limit.allowed) throw tooMany("Too many deposit submissions. Please wait an hour.");

      const form = await req.formData();
      const payload = depositSchema.parse({
        methodId: form.get("methodId"),
        amount: form.get("amount"),
        payerName: form.get("payerName"),
        reference: form.get("reference") ?? "",
        note: form.get("note") ?? "",
      });

      const file = form.get("proof");
      if (!(file instanceof File)) throw badRequest("Attach your proof of payment.");
      const check = validateProofFile(file);
      if (!check.ok) throw badRequest(check.message, { proof: check.message });

      const buffer = Buffer.from(await file.arrayBuffer());
      const request = submitDeposit(
        user,
        {
          methodId: payload.methodId,
          amount: payload.amount,
          payerName: payload.payerName,
          reference: payload.reference,
          note: payload.note,
          proof: { data: buffer, mime: file.type, name: file.name.slice(0, 120) },
        },
        meta
      );
      return ok({ request }, 201);
    }

    const body = (await req.json()) as unknown;
    const parsed = withdrawalSchema.parse(body);
    const limit = rateLimit(`withdraw:${user.id}`, 12, 60 * 60_000);
    if (!limit.allowed) throw tooMany("Too many withdrawal requests. Please wait an hour.");

    const request = submitWithdrawal(user, parsed, meta);
    return ok({ request }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
