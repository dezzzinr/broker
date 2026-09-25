import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/auth";

/** Landing route — sends visitors to the trading app or the sign-in page. */
export default async function Home() {
  const user = await getSessionUser();
  redirect(user ? "/dashboard" : "/login");
}
