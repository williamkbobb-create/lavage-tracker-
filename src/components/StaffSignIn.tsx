import { useState } from "react";
import { signIn } from "@/lib/use-auth";

export function StaffSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const fieldClass =
    "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await signIn(email, password);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-xl"
    >
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Staff Sign In
      </h2>
      <p className="text-[11px] text-muted-foreground">
        This portal is restricted to Lavage International staff.
      </p>
      <input
        required
        type="email"
        autoComplete="email"
        className={fieldClass}
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        required
        type="password"
        autoComplete="current-password"
        className={fieldClass}
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-2xl bg-primary py-4 font-bold text-primary-foreground shadow-[var(--shadow-cta)] active:scale-95 disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
