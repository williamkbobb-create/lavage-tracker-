import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Camera,
  ChartNoAxesCombined,
  CheckCircle2,
  Clock3,
  Palette,
  ShieldCheck,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/for-businesses")({
  head: () => ({
    meta: [
      { title: "For Car-Wash Businesses | Lavage Platform" },
      {
        name: "description",
        content:
          "A connected operating platform for independent car washes: vehicle intake, service progress, customer tracking and business workspaces.",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: ForBusinessesPage,
});

const capabilities = [
  {
    icon: Clock3,
    title: "One clear job workflow",
    status: "Foundation in preview",
    description:
      "Register a vehicle, follow its service stages and keep the customer-facing progress view separate from staff operations.",
  },
  {
    icon: Camera,
    title: "Vehicle photos and QR intake",
    status: "Planned",
    description:
      "Capture vehicle condition at arrival and give each customer a simple QR or tracking-code route to their vehicle status.",
  },
  {
    icon: Users,
    title: "Business and staff workspaces",
    status: "In development",
    description:
      "Give each car wash its own business space, with owner, manager and staff permissions and tenant-level data separation.",
  },
  {
    icon: Palette,
    title: "Interactive vehicle paint studio",
    status: "Planned",
    description:
      "Let customers explore vehicle finishes, save colour combinations and return to their designs outside an active wash.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Operations and business insights",
    status: "Planned",
    description:
      "Build toward service reporting, workload visibility and business-level performance insights as the platform matures.",
  },
  {
    icon: ShieldCheck,
    title: "Customer and staff privacy",
    status: "Security foundation in review",
    description:
      "Customer tracking is designed as a separate experience. Private management access requires authenticated business membership.",
  },
];

function ForBusinessesPage() {
  return (
    <main className="min-h-screen bg-[#090B0D] text-[#F5F2EA]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="text-xs font-bold tracking-[0.2em] text-[#D8B96E]">
          LAVAGE PLATFORM
        </Link>
        <Link
          to="/track"
          className="rounded-full border border-white/15 px-4 py-2.5 text-xs font-semibold text-white/70 transition hover:bg-white/5"
        >
          Customer tracking
        </Link>
      </header>

      <section className="mx-auto max-w-7xl px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#D8B96E]/25 bg-[#D8B96E]/[0.07] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#E7CC8A]">
            A connected workspace for car-care operators
          </p>
          <h1 className="mt-7 text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-6xl">
            Run your car wash.
            <span className="block text-[#D8B96E]">Keep every customer in the loop.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/55">
            Lavage Platform is being built for independent car washes that want a clearer way to
            register vehicles, manage service progress and give customers a better view of their
            visit.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/manage"
              className="inline-flex items-center justify-center rounded-full bg-[#D8B96E] px-6 py-4 text-sm font-bold text-[#17140D] transition hover:bg-[#E8CD8A]"
            >
              Owner workspace preview <ArrowRight className="ml-2 size-4" />
            </Link>
            <Link
              to="/track"
              className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-4 text-sm font-semibold text-white/75 transition hover:bg-white/5"
            >
              View customer tracking
            </Link>
          </div>
          <p className="mt-4 text-xs leading-5 text-white/35">
            This is an active development preview. Business onboarding, live data and some
            capabilities are not enabled yet.
          </p>
        </div>
      </section>

      <section className="border-y border-white/[0.07] bg-white/[0.025] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#D8B96E]">
              Platform roadmap
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Built in stages, with security first.
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/50">
              These are the intended capabilities and their current development state—not a claim
              that every feature is already available.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((item) => {
              const Icon = item.icon;
              const isFoundation = item.status.includes("preview");
              return (
                <article
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-[#111416] p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-11 items-center justify-center rounded-xl border border-[#D8B96E]/20 bg-[#D8B96E]/[0.07]">
                      <Icon className="size-5 text-[#D8B96E]" />
                    </span>
                    {isFoundation ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[9px] font-semibold text-emerald-300">
                        <CheckCircle2 className="size-3" /> {item.status}
                      </span>
                    ) : (
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] font-semibold text-white/45">
                        {item.status}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-5 font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/50">{item.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="flex flex-col justify-between gap-6 rounded-3xl border border-[#D8B96E]/20 bg-gradient-to-br from-[#201D15] to-[#111416] p-7 sm:p-10 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#D8B96E]">
              Development preview
            </p>
            <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
              The owner portal is being prepared.
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/55">
              Tenant database policies and account onboarding must pass isolated security tests
              before business registration is switched on.
            </p>
          </div>
          <Link
            to="/manage"
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-[#D8B96E]/40 px-6 py-4 text-sm font-semibold text-[#E7CC8A] transition hover:bg-[#D8B96E]/10"
          >
            Open owner workspace <ArrowRight className="ml-2 size-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/[0.07] px-5 py-7 text-center text-[10px] tracking-wider text-white/35 sm:px-8">
        Lavage Platform · Built for independent car-care businesses
      </footer>
    </main>
  );
}
