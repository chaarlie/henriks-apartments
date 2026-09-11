"use client";

import { useActionState, useState } from "react";
import { signIn, type LoginState } from "@/lib/admin/login";

// `text-base!` — admin.css sets unlayered input font sizes, which beat Tailwind's
// layered utilities; 16px also stops iOS zooming into the field.
const INPUT =
  "w-full rounded-[11px] border-[1.5px] border-line-card bg-surface px-3.5 py-3 text-base! text-ink outline-none transition-shadow focus:border-deep focus:shadow-[0_0_0_3px_rgba(4,88,140,0.15)]";
const LABEL = "mb-1.5 block text-[15px] font-bold text-ink";

const INITIAL: LoginState = { error: null, username: "" };

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, INITIAL);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form
      action={action}
      className="w-full max-w-[400px] rounded-[20px] border-[1.5px] border-line-card bg-surface p-6 text-ink shadow-[0_40px_90px_-40px_rgba(0,0,0,0.6)] sm:p-8"
    >
      <input type="hidden" name="next" value={next} />

      <div className="flex items-center gap-2.5">
        <span className="h-6 w-6 rounded-[7px] bg-deep" aria-hidden />
        <span className="text-lg font-bold tracking-[-0.015em]">Henrik Sosúa</span>
      </div>

      <p className="mt-7 font-mono text-xs uppercase tracking-[0.14em] text-lagoon">Admin</p>
      <h1 className="mt-1.5 text-[28px] font-bold leading-tight tracking-[-0.02em]">Sign in</h1>
      <p className="mt-1.5 text-[15px] text-copy">Apartments, bookings and sharing.</p>

      <div className="mt-6 grid gap-4">
        <div>
          <label htmlFor="username" className={LABEL}>Username</label>
          {/* defaultValue from the action state: React clears form fields after an
              action, so a wrong password shouldn't make Henrik retype his username. */}
          <input
            id="username"
            name="username"
            defaultValue={state.username}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            className={INPUT}
          />
        </div>

        <div>
          <label htmlFor="password" className={LABEL}>Password</label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className={`${INPUT} pr-[76px]`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-pressed={showPassword}
              aria-controls="password"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1.5 text-sm font-bold text-lagoon transition-colors hover:bg-tint"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {state.error && (
          <p role="alert" className="rounded-xl bg-sand-soft px-3.5 py-2.5 text-[15px] font-semibold text-danger">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="min-h-[52px] rounded-xl bg-olive text-base font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </form>
  );
}
