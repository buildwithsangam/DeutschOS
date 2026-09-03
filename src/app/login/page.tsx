import Link from "next/link";

import { LoginForm } from "@/app/login/login-form";

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <div className="auth-card">
        <h1>Sign in to DeutschOS</h1>
        <p>We&apos;ll email you a secure link. No password needed.</p>
        <LoginForm />
        <Link className="back-link" href="/">← Back to lessons</Link>
      </div>
    </main>
  );
}
