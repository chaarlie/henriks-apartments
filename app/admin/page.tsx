import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";
import {
  getAdminUnits,
  getAdminBookings,
  getAdminSettings,
  getAdminHero,
  getAdminLocation,
  getUnitOptions,
} from "@/lib/admin/data";
import AdminApp from "./AdminApp";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const [units, bookings, unitOptions, settings, hero, location] = await Promise.all([
    getAdminUnits(),
    getAdminBookings(),
    getUnitOptions(),
    getAdminSettings(),
    getAdminHero(),
    getAdminLocation(),
  ]);

  return (
    <AdminApp
      units={units}
      bookings={bookings}
      unitOptions={unitOptions}
      settings={settings}
      hero={hero}
      location={location}
      adminName={session.username}
    />
  );
}
