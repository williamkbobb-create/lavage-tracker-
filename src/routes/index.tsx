import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CarFront, CheckCircle2, Clock3, Palette, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lavage International | Vehicle Care, Clearly Tracked" },
      { name: "description", content: "Follow your vehicle's wash and detailing progress, explore the paint studio, and discover a more connected car-care experience." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#090B0D] text-[#F5F2EA]">
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="Lavage International home">
          <span className="flex size-11 items-center justify-center rounded-xl border border-[#C6A45B]/40 bg-[#C6A45B]/10 text-[#E5C77A]"><CarFront className="size-6" /></span>
          <span><span className="block text-sm font-bold tracking-[0.16em]">LAVAGE INTERNATIONAL</span><span className="mt-1 block text-[9px] uppercase tracking-[0.28em] text-[#C6A45B]">Car care, connected</span></span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link to="/track" className="hidden rounded-full px-4 py-2 text-sm text-white/70 transition hover:text-white sm:inline-flex">Track a vehicle</Link>
          <Link to="/track" className="rounded-full bg-[#D8B96E] px-4 py-2.5 text-xs font-bold text-[#17140D] transition hover:bg-[#E8CD8A]">Track your car <ArrowRight className="ml-2 size-4" /></Link>
        </nav>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 sm:px-8 sm:pb-28 sm:pt-20 lg:grid-cols-[1.05fr_.95fr]">
        <div className="pointer-events-none absolute -left-48 top-0 size-[34rem] rounded-full bg-[#B48B3C]/10 blur-[120px]" />
        <div className="relative">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#D8B96E]/25 bg-[#D8B96E]/[0.07] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#E7CC8A]"><Sparkles className="size-3.5" /> A more connected car-care experience</div>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.04] tracking-[-0.055em] sm:text-6xl lg:text-7xl">Your car's care.<br /><span className="text-[#D8B96E]">In clear view.</span></h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-white/60 sm:text-lg">From the moment your vehicle arrives to the final quality check, follow its progress with a simple tracking code. No guesswork. Just a better view of the service.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link to="/track" className="inline-flex items-center justify-center rounded-full bg-[#D8B96E] px-6 py-4 text-sm font-bold text-[#17140D] transition hover:-translate-y-0.5 hover:bg-[#E8CD8A]">Track your vehicle <ArrowRight className="ml-2 size-4" /></Link>
            <a href="#experience" className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-4 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/5">Explore the experience</a>
          </div>
          <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 text-xs text-white/45"><span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-[#D8B96E]" /> Customer-safe tracking</span><span className="inline-flex items-center gap-2"><Clock3 className="size-4 text-[#D8B96E]" /> Progress updates</span></div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-8 rounded-[3rem] bg-[#B48B3C]/10 blur-3xl" />
          <div className="relative rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#202326] to-[#101214] p-4 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4"><div><p className="text-[10px] uppercase tracking-[0.24em] text-white/40">Vehicle progress</p><p className="mt-1 text-sm font-semibold">Your service, step by step</p></div><span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold text-emerald-300">Live journey</span></div>
            <div className="my-6 rounded-2xl border border-white/10 bg-[#0A0D0F] p-5">
              <div className="flex items-center justify-between"><span className="text-xs text-white/45">LAV-1001</span><span className="text-[10px] uppercase tracking-widest text-[#D8B96E]">Full detailing</span></div>
              <div className="flex h-36 items-center justify-center"><CarFront className="size-32 stroke-[0.8] text-[#D8B96E]" /></div>
              <p className="text-lg font-semibold">Toyota Land Cruiser</p><p className="mt-1 text-xs text-white/40">A sample of the customer tracking experience</p>
            </div>
            <div className="space-y-4 px-1">
              {["Vehicle received","Inspection complete","Washing in progress","Detailing and quality check"].map((step,i)=><div key={step} className="flex items-center gap-3"><span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${i<2?"bg-[#D8B96E] text-[#17140D]":"border border-white/15 text-white/40"}`}>{i<2?<CheckCircle2 className="size-4"/>:<span className="size-1.5 rounded-full bg-current"/>}</span><span className={`text-xs ${i<2?"text-white/85":"text-white/40"}`}>{step}</span>{i===2&&<span className="ml-auto text-[9px] uppercase tracking-widest text-[#D8B96E]">Current</span>}</div>)}
            </div>
          </div>
        </div>
      </section>

      <section id="experience" className="border-y border-white/[0.07] bg-white/[0.025] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl"><p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#D8B96E]">Designed around your vehicle</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">More than a tracking number.</h2><p className="mt-4 text-sm leading-7 text-white/55">A connected experience that makes every stage of car care easier to understand and enjoy.</p></div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-[#111416] p-6"><Clock3 className="size-6 text-[#D8B96E]"/><h3 className="mt-5 font-semibold">Follow progress</h3><p className="mt-2 text-sm leading-6 text-white/50">See the service stages as your vehicle moves through the wash and detailing process.</p></article>
            <article className="rounded-2xl border border-white/10 bg-[#111416] p-6"><Palette className="size-6 text-[#D8B96E]"/><h3 className="mt-5 font-semibold">Explore the paint studio</h3><p className="mt-2 text-sm leading-6 text-white/50">Discover colour ideas and save designs for a future vehicle customisation experience.</p></article>
            <article className="rounded-2xl border border-white/10 bg-[#111416] p-6"><ShieldCheck className="size-6 text-[#D8B96E]"/><h3 className="mt-5 font-semibold">A clearer experience</h3><p className="mt-2 text-sm leading-6 text-white/50">Customer tracking is kept separate from private business operations and staff tools.</p></article>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20"><div className="flex flex-col justify-between gap-8 rounded-3xl border border-[#D8B96E]/20 bg-gradient-to-br from-[#201D15] to-[#111416] p-7 sm:p-10 lg:flex-row lg:items-center"><div className="max-w-2xl"><p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#D8B96E]">For car-wash businesses</p><h2 className="mt-3 text-2xl font-semibold sm:text-3xl">Give customers a better view of every service.</h2><p className="mt-3 text-sm leading-6 text-white/55">We are building a platform for independent car-care businesses to manage jobs and offer customers a connected vehicle experience.</p></div><a href="mailto:hello@lavageinternational.com?subject=Car%20wash%20platform%20enquiry" className="inline-flex shrink-0 items-center justify-center rounded-full border border-[#D8B96E]/40 px-6 py-4 text-sm font-semibold text-[#E7CC8A] transition hover:bg-[#D8B96E]/10">Business enquiries <ArrowRight className="ml-2 size-4"/></a></div></section>
      <footer className="border-t border-white/[0.07] px-5 py-7 text-center text-[10px] tracking-wider text-white/35 sm:px-8">© {new Date().getFullYear()} Lavage International. All rights reserved.</footer>
    </main>
  );
}
