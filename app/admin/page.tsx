import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { getAdminUnits, getAdminBookings, getAdminSettings, getUnitOptions } from "@/lib/admin/data";
import AdminApp from "./AdminApp";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const [units, bookings, unitOptions, settings] = await Promise.all([
    getAdminUnits(),
    getAdminBookings(),
    getUnitOptions(),
    getAdminSettings(),
  ]);

  return (
    <AdminApp
      units={units}
      bookings={bookings}
      unitOptions={unitOptions}
      settings={settings}
      adminName={session.username}
    />
  );
}
