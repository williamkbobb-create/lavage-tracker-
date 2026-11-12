
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StaffSignIn } from "@/components/StaffSignIn";
import { useAuth, signOut } from "@/lib/use-auth";
import {
  SERVICES,
  STATUSES,
  createJob,
  updateNotes,
  updateStatus,
  useStaffJobs,
  type StaffJob,
  type Status,
} from "@/lib/jobs-store";

export const Route = createFileRoute("/staff")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Staff Dashboard | Lavage International" },
      {
        name: "description",
        content:
          "Lavage International staff portal: register new vehicle jobs and update wash and detailing status.",
      },
      { property: "og:title", content: "Staff Dashboard | Lavage International" },
      {
        property: "og:description",
        content:
          "Register vehicle jobs and update their progress at Lavage International.",
      },
    ],
  }),
  component: StaffPage,
});

const emptyForm = {
  customerName: "",
  phone: "",
  vehicle: "",
  plate: "",
  service: SERVICES[0] as string,
  status: STATUSES[0] as Status,
  notes: "",
};

const fieldClass =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none";

function StaffPage() {
  const { session, loading: authLoading } = useAuth();
  const signedIn = Boolean(session);

  if (authLoading) {
    return (
      <AppShell>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Loading…
        </p>
      </AppShell>
    );
  }

  if (!signedIn) {
    return (
      <AppShell>
        <StaffSignIn />
      </AppShell>
    );
  }

  return <StaffDashboard />;
}

function StaffDashboard() {
  const { jobs, loading, error, refresh } = useStaffJobs(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [created, setCreated] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const active = jobs.filter((job) => job.status !== "Completed");

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const job = await createJob(form);

      setForm(emptyForm);
      setShowForm(false);
      setCreated(job.trackingCode);
      setActionError("");

      await refresh();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not create job."
      );
    }
  }

  async function changeStatus(id: string, status: Status) {
    try {
      await updateStatus(id, status);
      setActionError("");
      await refresh();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not update status."
      );
    }
  }

  async function saveNotes(id: string, notes: string) {
    try {
      await updateNotes(id, notes);
      setActionError("");
      await refresh();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not update notes."
      );
    }
  }

  return (
    <AppShell>
      <section className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            setShowForm((value) => !value);
            setCreated(null);
          }}
          className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-4 text-center active:scale-95"
        >
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10">
            <span className="text-xl font-bold text-primary">
              {showForm ? "×" : "+"}
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase text-card-foreground">
            {showForm ? "Close" : "New Job"}
          </span>
        </button>

        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-4 text-center">
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-warning/10">
            <span className="text-sm font-bold text-warning">
              {active.length}
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase text-card-foreground">
            Active
          </span>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => void refresh()}
          className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>

        <button
          type="button"
          onClick={() => void signOut()}
          className="text-[10px] font-bold uppercase tracking-widest text-primary"
        >
          Sign out
        </button>
      </div>

      {(error || actionError) && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive">
          {error || actionError}
        </p>
      )}

      {created && (
        <p className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-success">
          Job created — tracking code {created}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={submit}
          className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-xl"
        >
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            New Vehicle Job
          </h2>

          <input
            required
            className={fieldClass}
            placeholder="Customer name"
            value={form.customerName}
            onChange={(e) =>
              setForm({ ...form, customerName: e.target.value })
            }
          />

          <input
            required
            type="tel"
            className={fieldClass}
            placeholder="Phone number"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />

          <input
            required
            className={fieldClass}
            placeholder="Vehicle make / model"
            value={form.vehicle}
            onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
          />

          <input
            required
            className={fieldClass}
            placeholder="Plate number"
            value={form.plate}
            onChange={(e) => setForm({ ...form, plate: e.target.value })}
          />

          <select
            className={fieldClass}
            value={form.service}
            onChange={(e) => setForm({ ...form, service: e.target.value })}
          >
            {SERVICES.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>

          <select
            className={fieldClass}
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as Status })
            }
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <textarea
            rows={3}
            className={fieldClass}
            placeholder="Staff notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          <button
            type="submit"
            className="w-full rounded-2xl bg-primary py-4 font-bold text-primary-foreground shadow-[var(--shadow-cta)] active:scale-95"
          >
            Add New Vehicle Job
          </button>
        </form>
      )}

      <section className="space-y-3 pb-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          All Jobs
        </p>

        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onStatus={changeStatus}
            onNotes={saveNotes}
          />
        ))}
      </section>
    </AppShell>
  );
}

function JobCard({
  job,
  onStatus,
  onNotes,
}: {
  job: StaffJob;
  onStatus: (id: string, status: Status) => Promise<void>;
  onNotes: (id: string, notes: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState(job.notes);
  const dirty = notes !== job.notes;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-card-foreground">
            {job.vehicle}
          </p>

          <p className="truncate text-[11px] text-muted-foreground">
            {job.customerName} · {job.phone}
          </p>

          <p className="font-mono text-[11px] text-muted-foreground">
            {job.plate} · {job.trackingCode}
          </p>

          <p className="mt-1 text-[11px] text-card-foreground">
            {job.service}
          </p>
        </div>

        <span
          className={`shrink-0 rounded px-2 py-1 text-[10px] font-bold uppercase ${
            job.status === "Completed"
              ? "bg-success/10 text-success"
              : "bg-primary/10 text-primary"
          }`}
        >
          {job.status}
        </span>
      </div>

      <label className="mt-3 block">
        <span className="sr-only">Update status for {job.plate}</span>

        <select
          value={job.status}
          onChange={(e) =>
            void onStatus(job.id, e.target.value as Status)
          }
          className="h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold uppercase tracking-wide text-primary focus:outline-none"
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-3 block">
        <span className="sr-only">Staff notes for {job.plate}</span>

        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Staff notes"
          className={fieldClass}
        />
      </label>

      {dirty && (
        <button
          type="button"
          onClick={() => void onNotes(job.id, notes)}
          className="mt-2 w-full rounded-xl border border-border bg-background py-3 text-[10px] font-bold uppercase tracking-widest text-primary active:bg-secondary"
        >
          Save Notes
        </button>
      )}
    </div>
  );
}
