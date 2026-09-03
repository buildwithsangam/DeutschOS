"use client";

import { useTransition } from "react";

import { signOut } from "@/app/login/actions";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      className="auth-link"
      disabled={pending}
      onClick={() => startTransition(() => signOut())}
      type="button"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
