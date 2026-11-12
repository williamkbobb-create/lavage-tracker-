
import { Link } from "@tanstack/react-router";
import { CarFront, Circle } from "lucide-react";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0B0B0C] pb-10 text-[#F5F1E8]">
      <header className="sticky top-0 z-50 border-b border-[#C6A45B]/20 bg-[#101011]/95 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#C6A45B]/50 bg-[#C6A45B]/10">
              <CarFront className="size-6 text-[#D7B96D]" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold uppercase tracking-[0.2em] text-[#F5F1E8]">
                Lavage International
              </h1>
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[#C6A45B]">
                Vehicle Care · Staff Operations
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-full border border-[#C6A45B]/20 px-3 py-2">
            <Circle className="size-2 fill-emerald-400 text-emerald-400" />
            <span className="hidden text-[10px] font-semibold uppercase tracking-widest text-[#C7C2B7] sm:inline">
              Operations
            </span>
          </div>
        </div>
      </header>

      <nav
        aria-label="Main navigation"
        className="border-b border-white/[0.06] bg-[#101011] px-4 sm:px-6"
      >
        <div className="mx-auto flex max-w-5xl gap-2 py-3">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="flex-1 rounded-lg border border-transparent px-4 py-3 text-center text-xs font-semibold transition-colors hover:bg-white/[0.04] data-[status=active]:border-[#C6A45B]/40 data-[status=active]:bg-[#C6A45B]/10 data-[status=active]:text-[#E4C779] data-[status=inactive]:text-[#9C9A95]"
          >
            Track Vehicle
          </Link>

          <Link
            to="/staff"
            className="flex-1 rounded-lg border border-transparent px-4 py-3 text-center text-xs font-semibold transition-colors hover:bg-white/[0.04] data-[status=active]:border-[#C6A45B]/40 data-[status=active]:bg-[#C6A45B]/10 data-[status=active]:text-[#E4C779] data-[status=inactive]:text-[#9C9A95]"
          >
            Staff Portal
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl space-y-8 px-4 pt-6 sm:px-6 sm:pt-8">
        {children}
      </main>
    </div>
  );
}
