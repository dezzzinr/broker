import { getCoinById } from "@/lib/data/coins";
import { tradeSchema } from "@/lib/server/validation";
import { placeOrder } from "@/lib/server/services/trade.service";
import {
  assertSameOrigin,
  handleApiError,
  notFound,
  ok,
  rateLimit,
  readJson,
  requireApiUser,
  tooMany,
} from "@/lib/server/http";
import { requestMeta } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/** POST /api/trade — settles a spot order against the user's real balances. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireApiUser();
    const meta = await requestMeta();

    const limit = rateLimit(`trade:${user.id}`, 60, 60_000);
    if (!limit.allowed) throw tooMany("Order rate limit reached. Please slow down.");

    const input = await readJson(req, tradeSchema);
    const coin = getCoinById(input.coinId);
    if (!coin) throw notFound("Unknown market.");

    const result = placeOrder(
      user,
      {
        coin,
        side: input.side,
        orderType: input.orderType,
        baseAmount: input.baseAmount,
        price: input.price,
      },
      meta
    );

    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}
