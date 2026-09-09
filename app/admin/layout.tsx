import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./admin.css";

export const metadata: Metadata = {
  title: "Henrik Sosúa — Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClerkProvider signInUrl="/admin/sign-in">{children}</ClerkProvider>;
}
