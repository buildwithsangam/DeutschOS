import "server-only";

import Link from "next/link";

import { createSupabaseServerClient } from "@/shared/infrastructure/supabase/server";
import { SignOutButton } from "@/app/auth/signout-button";

export async function AuthNav() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <nav className="auth-nav">
        <Link className="auth-link" href="/login">
          Sign in
        </Link>
      </nav>
    );
  }

  return (
    <nav className="auth-nav">
      <span className="auth-user">{user.email}</span>
      <SignOutButton />
    </nav>
  );
}
