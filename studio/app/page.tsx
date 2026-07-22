import { redirect } from "next/navigation";
import StudioClient from "@/components/studio-client";
import { getSession } from "@/lib/auth";

export default async function Home() {
  if (process.env.AUTH_REQUIRED === "true" && !(await getSession())) {
    redirect("/login");
  }
  return <StudioClient />;
}
