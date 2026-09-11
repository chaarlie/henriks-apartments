import { SignIn } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function AdminSignInPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b2033",
        padding: 24,
      }}
    >
      <SignIn routing="path" path="/admin/sign-in" />
    </div>
  );
}
