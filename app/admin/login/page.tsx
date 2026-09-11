import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in · Henrik Sosúa admin",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  if (await getAdminSession()) redirect("/admin");
  const { next } = await searchParams;

  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-4 py-10">
      <LoginForm next={typeof next === "string" ? next : "/admin"} />
    </main>
  );
}
