import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import { getAdminUnits, getAdminBookings, getUnitOptions } from "@/lib/admin/data";
import AdminApp from "./AdminApp";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

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
      adminName={session.username}
    />
  );
}
