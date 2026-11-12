import { STATUSES, formatTime, type Job } from "@/lib/jobs-store";

export function StatusTimeline({ job }: { job: Job }) {
  const currentIndex = STATUSES.indexOf(job.status);

  return (
    <div className="relative py-4">
      {/* Timeline line */}
      <div className="absolute bottom-0 left-4 top-0 w-0.5 bg-secondary" />

      <div className="relative space-y-6">
        {STATUSES.map((status, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          const upcoming = i > currentIndex;

          const entry = job.history.find((historyEntry) => historyEntry.status === status);

          return (
            <div key={status} className={`flex items-center gap-4 ${upcoming ? "opacity-40" : ""}`}>
              {/* Status indicator */}
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-full border-4 border-card ${
                  done
                    ? "bg-success"
                    : active
                      ? "bg-primary shadow-[var(--shadow-glow)]"
                      : "bg-secondary"
                }`}
              >
                <div
                  className={`rounded-full ${
                    active
                      ? "size-3 bg-primary-foreground"
                      : done
                        ? "size-2 bg-success-foreground"
                        : "size-2 bg-muted-foreground"
                  }`}
                />
              </div>

              {/* Status information */}
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm ${
                    done || active ? "font-bold text-card-foreground" : "font-medium"
                  }`}
                >
                  {status}
                </p>

                {active ? (
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    In progress
                  </p>
                ) : entry ? (
                  <p className="text-[10px] text-muted-foreground">{formatTime(entry.at)}</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
