import { listUsers, type ListUsersParams } from "@/lib/server/repo/users";
import { handleApiError, ok, requireApiAdmin } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users — searchable, filterable, paginated account list.
 * `?q=&status=&role=&sort=&dir=&page=&pageSize=`
 */
export async function GET(req: Request) {
  try {
    await requireApiAdmin();
    const url = new URL(req.url);

    const sort = url.searchParams.get("sort") as ListUsersParams["sort"] | null;
    const dir = url.searchParams.get("dir") as "asc" | "desc" | null;

    const result = listUsers({
      query: url.searchParams.get("q") ?? "",
      status: (url.searchParams.get("status") ?? "all") as ListUsersParams["status"],
      role: (url.searchParams.get("role") ?? "all") as ListUsersParams["role"],
      sort: sort ?? "created",
      dir: dir ?? "desc",
      page: Math.max(1, Number(url.searchParams.get("page") ?? 1)),
      pageSize: Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") ?? 20))),
    });

    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}
