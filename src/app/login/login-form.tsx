"use client";

import { useActionState } from "react";

import { requestMagicLink, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    requestMagicLink,
    initialState,
  );

  if (state.success) {
    return (
      <div className="login-success">
        <p>Check your email for a sign-in link. The link will return you here after signing in.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="login-form">
      <label htmlFor="email">Email</label>
      <input
        autoComplete="email"
        id="email"
        name="email"
        placeholder="you@example.com"
        required
        type="email"
      />
      <button className="button primary" disabled={pending} type="submit">
        {pending ? "Sending link…" : "Send sign-in link"}
      </button>
      {state.error ? <p className="feedback error">{state.error}</p> : null}
    </form>
  );
}
