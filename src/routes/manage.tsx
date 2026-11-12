import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth, signIn, signOut, signUp } from "@/lib/use-auth";
import { createBusiness, selectWorkspace, useWorkspaces } from "@/lib/business-store";

export const Route = createFileRoute("/manage")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Business Workspace | Lavage Platform" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ManagePage,
});

const fieldClass = "w-full rounded-xl border border-white/15 bg-[#111719] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#D8B96E]";

function ManagePage() {
  const tenantWorkspacesEnabled = import.meta.env.VITE_TENANT_WORKSPACES_ENABLED === "true";
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const { workspaces, loading: workspaceLoading, error: workspaceError, refresh } = useWorkspaces(Boolean(session));
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessSlug, setBusinessSlug] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!tenantWorkspacesEnabled) {
    return (
      <main className="min-h-screen bg-[#090B0D] px-4 py-12 text-[#F5F2EA]">
        <section className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-[#111416] p-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#D8B96E]">Private business area</p>
          <h1 className="mt-4 text-2xl font-semibold">Business onboarding is not enabled yet.</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">This workspace requires the tenant database migration and security tests to be completed first. Existing customer tracking and staff operations remain on the current configuration.</p>
          <a href="/" className="mt-6 inline-flex rounded-xl bg-[#D8B96E] px-5 py-3 text-sm font-bold text-[#17140D]">Return to public website</a>
        </section>
      </main>
    );
  }

  async function submitAuth(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "signin") {
        await signIn(email, password);
        setMessage("Signed in. Loading your business workspaces…");
      } else {
        const result = await signUp(email, password);
        setMessage(result.hasSession
          ? "Account created. You can now register your business."
          : "Account created. Check your email to confirm your address, then return here to sign in.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitBusiness(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const workspace = await createBusiness(businessName, businessSlug);
      await refresh();
      selectWorkspace(workspace.id);
      setMessage("Business workspace created. Opening your operations dashboard…");
      await navigate({ to: "/staff" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the business.");
    } finally {
      setBusy(false);
    }
  }

  async function openWorkspace(id: string) {
    selectWorkspace(id);
    await navigate({ to: "/staff" });
  }

  return (
    <main className="min-h-screen bg-[#090B0D] px-4 py-8 text-[#F5F2EA] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 flex items-center justify-between gap-4">
          <a href="/" className="text-xs font-bold tracking-[0.2em] text-[#D8B96E]">LAVAGE PLATFORM</a>
          {session && <button onClick={() => void signOut()} className="text-xs text-white/55 hover:text-white">Sign out</button>}
        </header>

        <div className="mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#D8B96E]">Private business area</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Your business workspace.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/55">Sign in to manage your car wash, or create an owner account to register a new business. Customers do not use this portal.</p>
        </div>

        {authLoading ? (
          <p className="text-sm text-white/55">Checking your secure session…</p>
        ) : !session ? (
          <section className="max-w-lg rounded-2xl border border-white/10 bg-[#111416] p-5 sm:p-7">
            <div className="mb-5 flex gap-2">
              <button type="button" onClick={() => { setMode("signin"); setError(""); setMessage(""); }} className={`rounded-full px-4 py-2 text-xs font-semibold ${mode === "signin" ? "bg-[#D8B96E] text-[#17140D]" : "bg-white/5 text-white/60"}`}>Sign in</button>
              <button type="button" onClick={() => { setMode("signup"); setError(""); setMessage(""); }} className={`rounded-full px-4 py-2 text-xs font-semibold ${mode === "signup" ? "bg-[#D8B96E] text-[#17140D]" : "bg-white/5 text-white/60"}`}>Create owner account</button>
            </div>
            <form onSubmit={submitAuth} className="space-y-3">
              <label className="block text-xs text-white/60">Email address<input required type="email" autoComplete="email" className={`${fieldClass} mt-2`} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
              <label className="block text-xs text-white/60">Password<input required minLength={8} type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} className={`${fieldClass} mt-2`} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
              {mode === "signup" && <p className="text-[11px] leading-5 text-white/40">Use at least 8 characters. Your email may need confirmation before you can continue.</p>}
              {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-200">{error}</p>}
              {message && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs text-emerald-200">{message}</p>}
              <button disabled={busy} className="w-full rounded-xl bg-[#D8B96E] py-3.5 text-sm font-bold text-[#17140D] disabled:opacity-50">{busy ? "Please wait…" : mode === "signin" ? "Sign in securely" : "Create owner account"}</button>
            </form>
          </section>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
            <section className="rounded-2xl border border-white/10 bg-[#111416] p-5 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Your businesses</h2>
                <button type="button" onClick={() => void refresh()} className="text-xs text-[#D8B96E]">Refresh</button>
              </div>
              {workspaceLoading ? <p className="mt-5 text-sm text-white/45">Loading workspaces…</p> : workspaces.length === 0 ? (
                <p className="mt-5 rounded-xl border border-white/10 p-4 text-sm leading-6 text-white/50">No business workspace is linked to this account yet. Create your first business to continue.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {workspaces.map((workspace) => (
                    <button key={workspace.id} type="button" onClick={() => void openWorkspace(workspace.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-[#D8B96E]/50">
                      <span className="min-w-0"><span className="block truncate text-sm font-semibold">{workspace.name}</span><span className="mt-1 block text-[11px] text-white/40">{workspace.slug} · {workspace.role}</span></span>
                      <span className="text-xs text-[#D8B96E]">Open →</span>
                    </button>
                  ))}
                </div>
              )}
              {workspaceError && <p role="alert" className="mt-4 text-xs text-red-200">{workspaceError}</p>}
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#111416] p-5 sm:p-7">
              <h2 className="text-sm font-semibold">Register a car wash</h2>
              <p className="mt-2 text-xs leading-5 text-white/45">The signed-in account becomes the first owner. You can invite managers and staff later.</p>
              <form onSubmit={submitBusiness} className="mt-5 space-y-3">
                <label className="block text-xs text-white/60">Business name<input required minLength={2} maxLength={100} className={`${fieldClass} mt-2`} placeholder="e.g. Lavage International" value={businessName} onChange={(e) => { setBusinessName(e.target.value); if (!businessSlug) setBusinessSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }} /></label>
                <label className="block text-xs text-white/60">Business URL identifier<input required maxLength={60} pattern="[a-z0-9]+(-[a-z0-9]+)*" className={`${fieldClass} mt-2`} placeholder="lavage-international" value={businessSlug} onChange={(e) => setBusinessSlug(e.target.value.toLowerCase())} /><span className="mt-1 block text-[10px] text-white/35">Lowercase letters, numbers and hyphens only.</span></label>
                {error && <p role="alert" className="text-xs text-red-200">{error}</p>}
                {message && <p role="status" className="text-xs text-emerald-200">{message}</p>}
                <button disabled={busy} className="w-full rounded-xl border border-[#D8B96E]/50 bg-[#D8B96E]/10 py-3.5 text-sm font-semibold text-[#E8CD8A] disabled:opacity-50">{busy ? "Creating…" : "Create business workspace"}</button>
              </form>
            </section>
          </div>
        )}

        <p className="mt-8 text-[10px] leading-5 text-white/30">Workspace access is enforced by authenticated membership and database row-level security. This portal remains separate from the public customer tracking experience.</p>
      </div>
    </main>
  );
}
