import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatusTimeline } from "@/components/StatusTimeline";
import { lookupJob, type Job } from "@/lib/jobs-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Track Your Vehicle | Lavage International" },
      {
        name: "description",
        content:
          "Enter your Lavage International tracking code to follow your vehicle's wash and detailing progress in real time.",
      },
      { property: "og:title", content: "Track Your Vehicle | Lavage International" },
      {
        property: "og:description",
        content:
          "Follow your car wash and detailing progress with your Lavage International tracking code.",
      },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  const [code, setCode] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchJob(value: string) {
    if (!value.trim()) return;
    setLoading(true);
    try {
      const found = await lookupJob(value);
      if (found) {
        setJob(found);
        setError("");
      } else {
        setJob(null);
        setError("No vehicle found for that tracking code.");
      }
    } catch (e) {
      setJob(null);
      setError(e instanceof Error ? e.message : "Lookup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    void fetchJob(code);
  }

  return (
    <AppShell>
      <section>
        <form onSubmit={search} className="rounded-2xl border border-border bg-card p-6 shadow-xl">
          <label
            htmlFor="code"
            className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Enter Tracking Code
          </label>
          <div className="flex gap-2">
            <input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="LAV-1001"
              autoCapitalize="characters"
              className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 text-lg font-bold tracking-widest text-card-foreground transition-colors placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="shrink-0 rounded-xl bg-secondary px-5 py-4 font-bold text-primary active:scale-95 disabled:opacity-50"
            >
              {loading ? "…" : "GO"}
            </button>
          </div>
          {error && <p className="mt-3 text-xs font-medium text-destructive">{error}</p>}
          <p className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            Try LAV-1001, LAV-1002 or LAV-1003
          </p>
        </form>
      </section>

      {job && (
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="text-lg font-bold text-card-foreground">Current Status</h2>
            <span className="rounded bg-primary/10 px-2 py-1 text-xs font-bold uppercase text-primary">
              {job.trackingCode}
            </span>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
              <div className="min-w-0">
                <p className="text-2xl font-bold text-card-foreground">{job.vehicle}</p>
                <p className="font-mono text-sm text-muted-foreground">PLATE: {job.plate}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase text-muted-foreground">Service</p>
                <p className="text-sm font-bold text-card-foreground">{job.service}</p>
              </div>
            </div>

            <StatusTimeline job={job} />

            <button
              type="button"
              onClick={() => void fetchJob(job.trackingCode)}
              disabled={loading}
              className="mt-6 w-full rounded-xl border border-border bg-background py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground active:bg-secondary disabled:opacity-50"
            >
              {loading ? "Refreshing…" : "Refresh Progress"}
            </button>
          </div>
        </section>
      )}
    </AppShell>
  );
}
