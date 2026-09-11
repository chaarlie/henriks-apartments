import { redirect } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { checkAdmin } from "@/lib/admin/auth";
import { getAdminUnits, getAdminBookings, getUnitOptions } from "@/lib/admin/data";
import AdminApp from "./AdminApp";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const access = await checkAdmin();

  if (access.status === "unauthenticated") redirect("/admin/sign-in");

  if (access.status === "forbidden") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0b2033",
          color: "#cde0ec",
          fontFamily: "var(--font-manrope), system-ui, sans-serif",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>No access</h1>
          <p style={{ color: "#7fa9c0", maxWidth: 380, margin: "0 auto 18px" }}>
            <b>{access.email}</b> isn&rsquo;t on the admin allowlist for this
            site. Ask the site owner to add your email, then sign in again.
          </p>
          <SignOutButton>
            <button
              style={{
                background: "#15aebf",
                color: "#fff",
                border: 0,
                borderRadius: 8,
                padding: "10px 18px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </SignOutButton>
        </div>
      </div>
    );
  }

  const [units, bookings, unitOptions] = await Promise.all([
    getAdminUnits(),
    getAdminBookings(),
    getUnitOptions(),
  ]);

  return (
    <AdminApp
      units={units}
      bookings={bookings}
      unitOptions={unitOptions}
      adminName={access.identity.name}
    />
  );
}
