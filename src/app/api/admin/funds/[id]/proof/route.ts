import { getFundRequest, getProof } from "@/lib/server/repo/funds";
import { handleApiError, notFound, requireApiAdmin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/funds/:id/proof — streams the stored proof-of-payment file.
 * Administrators only; the blob never leaves the server otherwise.
 */
export async function GET(_req: Request, ctx: Ctx) {
  try {
    await requireApiAdmin();
    const { id } = await ctx.params;

    const request = getFundRequest(id);
    if (!request) throw notFound("That request no longer exists.");

    const proof = getProof(id);
    if (!proof) throw notFound("No proof of payment was attached to this request.");

    return new Response(new Uint8Array(proof.data), {
      status: 200,
      headers: {
        "Content-Type": proof.mime,
        "Content-Length": String(proof.data.byteLength),
        "Content-Disposition": `inline; filename="${proof.name.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
