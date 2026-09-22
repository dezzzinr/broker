import { TradeContent } from "./trade-content";

export const metadata = { title: "Trade" };

export default async function TradePage({
  searchParams,
}: {
  searchParams: Promise<{ coin?: string }>;
}) {
  const { coin } = await searchParams;
  return <TradeContent initialCoinId={coin ?? "bitcoin"} />;
}
