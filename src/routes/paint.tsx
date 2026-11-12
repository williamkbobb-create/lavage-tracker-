import { createFileRoute, Link } from "@tanstack/react-router";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft, RotateCcw, ZoomIn, ZoomOut, Palette, CarFront } from "lucide-react";
import * as THREE from "three";

export const Route = createFileRoute("/paint")({
  head: () => ({
    meta: [
      { title: "3D Paint Studio | Lavage International" },
      { name: "description", content: "Rotate a 3D concept car, select body panels and experiment with paint colours." },
    ],
  }),
  component: PaintStudioPage,
});

type Part = "body" | "hood" | "roof" | "frontBumper" | "rearBumper" | "wheels" | "glass";
const partLabels: Record<Part, string> = {
  body: "Body panels",
  hood: "Bonnet",
  roof: "Roof",
  frontBumper: "Front bumper",
  rearBumper: "Rear bumper",
  wheels: "Rims",
  glass: "Windows",
};
const initialColours: Record<Part, string> = {
  body: "#c6a45b", hood: "#c6a45b", roof: "#c6a45b",
  frontBumper: "#c6a45b", rearBumper: "#c6a45b", wheels: "#20242a", glass: "#172b3b",
};
const swatches = ["#c6a45b", "#f2f0e9", "#111827", "#bd2634", "#164e83", "#176b50", "#777b83", "#d9782e", "#7d5aa6", "#e6c9a2"];

function CarModel({ colours, selected, onSelect }: {
  colours: Record<Part, string>;
  selected: Part;
  onSelect: (part: Part) => void;
}) {
  const paint = (part: Part) => new THREE.Color(colours[part]);
  const material = (part: Part, metalness = 0.55, roughness = 0.28) => (
    <meshStandardMaterial color={paint(part)} metalness={metalness} roughness={roughness}
      emissive={selected === part ? paint(part) : new THREE.Color("#000000")}
      emissiveIntensity={selected === part ? 0.12 : 0} />
  );
  const wheelPositions: [number, number, number][] = [
    [-1.25, -0.43, 0.86], [1.25, -0.43, 0.86], [-1.25, -0.43, -0.86], [1.25, -0.43, -0.86],
  ];
  return (
    <group position={[0, -0.15, 0]}>
      <mesh castShadow receiveShadow position={[0, 0, 0]} onClick={(e) => { e.stopPropagation(); onSelect("body"); }}>
        <boxGeometry args={[3.45, 0.58, 1.42]} />{material("body")}
      </mesh>
      <mesh castShadow position={[-0.72, 0.37, 0]} onClick={(e) => { e.stopPropagation(); onSelect("hood"); }}>
        <boxGeometry args={[1.18, 0.18, 1.34]} />{material("hood")}
      </mesh>
      <mesh castShadow position={[0.43, 0.56, 0]} onClick={(e) => { e.stopPropagation(); onSelect("roof"); }}>
        <boxGeometry args={[1.48, 0.72, 1.2]} />{material("roof")}
      </mesh>
      <mesh position={[0.43, 0.57, 0.615]}>
        <boxGeometry args={[1.27, 0.49, 0.025]} />
        <meshPhysicalMaterial color={colours.glass} roughness={0.12} metalness={0.2} transparent opacity={0.76} />
      </mesh>
      <mesh position={[0.43, 0.57, -0.615]}>
        <boxGeometry args={[1.27, 0.49, 0.025]} />
        <meshPhysicalMaterial color={colours.glass} roughness={0.12} metalness={0.2} transparent opacity={0.76} />
      </mesh>
      <mesh position={[1.72, -0.02, 0]} onClick={(e) => { e.stopPropagation(); onSelect("frontBumper"); }}>
        <boxGeometry args={[0.18, 0.34, 1.35]} />{material("frontBumper")}
      </mesh>
      <mesh position={[-1.72, -0.02, 0]} onClick={(e) => { e.stopPropagation(); onSelect("rearBumper"); }}>
        <boxGeometry args={[0.18, 0.34, 1.35]} />{material("rearBumper")}
      </mesh>
      {wheelPositions.map((position, index) => (
        <group key={index} position={position} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow onClick={(e) => { e.stopPropagation(); onSelect("wheels"); }}>
            <cylinderGeometry args={[0.43, 0.43, 0.25, 32]} />
            {material("wheels", 0.72, 0.24)}
          </mesh>
          <mesh position={[0, 0.14, 0]} onClick={(e) => { e.stopPropagation(); onSelect("wheels"); }}>
            <cylinderGeometry args={[0.23, 0.23, 0.035, 24]} />
            <meshStandardMaterial color="#b8bec6" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      ))}
      <mesh position={[1.78, 0.14, 0.43]}>
        <boxGeometry args={[0.035, 0.12, 0.22]} /><meshStandardMaterial color="#f8e6b0" emissive="#f8e6b0" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[1.78, 0.14, -0.43]}>
        <boxGeometry args={[0.035, 0.12, 0.22]} /><meshStandardMaterial color="#f8e6b0" emissive="#f8e6b0" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

function PaintStudioPage() {
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<Part>("body");
  const [colours, setColours] = useState(initialColours);
  const [saved, setSaved] = useState(false);
  useEffect(() => setMounted(true), []);
  const selectedColour = useMemo(() => colours[selected], [colours, selected]);
  const updateColour = (colour: string) => {
    setColours((current) => ({ ...current, [selected]: colour }));
    setSaved(false);
  };
  const reset = () => { setColours(initialColours); setSelected("body"); setSaved(false); };

  return (
    <main className="min-h-screen bg-[#090b0d] text-[#f5f2ea]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"><ArrowLeft className="size-4" /> Back to Lavage International</Link>
        <span className="text-xs font-bold tracking-[0.2em] text-[#e5c77a]">3D PAINT STUDIO</span>
      </header>
      <section className="mx-auto max-w-7xl px-5 pb-10 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[10px] uppercase tracking-[0.25em] text-[#d8b96e]">Your car, your finish</p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-5xl">Build your look.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/55">Drag to rotate. Pinch or scroll to zoom. Select a vehicle part, then try a new colour.</p>
          </div>
          <button onClick={reset} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs text-white/75 hover:bg-white/5"><RotateCcw className="size-4" /> Reset design</button>
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(ellipse_at_50%_38%,#343b40_0%,#171c20_48%,#0d1012_100%)]">
            <div className="flex items-center justify-between px-5 pt-5 text-[10px] uppercase tracking-[0.18em] text-white/45"><span>Interactive concept vehicle</span><span>360° view</span></div>
            <div className="h-[360px] touch-none sm:h-[520px]">
              {mounted ? <Canvas camera={{ position: [4.8, 3.1, 5.5], fov: 38 }} shadows dpr={[1, 1.7]}>
                <Suspense fallback={null}>
                  <ambientLight intensity={1.15} />
                  <directionalLight position={[5, 8, 5]} intensity={2.4} castShadow />
                  <pointLight position={[-5, 3, -4]} intensity={1.1} color="#d8b96e" />
                  <CarModel colours={colours} selected={selected} onSelect={setSelected} />
                  <ContactShadows position={[0, -0.62, 0]} opacity={0.45} scale={8} blur={2.5} far={4} />
                  <OrbitControls enableDamping dampingFactor={0.07} minDistance={3.5} maxDistance={10} maxPolarAngle={Math.PI / 2.05} />
                </Suspense>
              </Canvas> : <div className="flex h-full items-center justify-center text-sm text-white/45">Preparing 3D studio…</div>}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-5 border-t border-white/10 px-4 py-4 text-[10px] text-white/45"><span>↔ Drag to rotate</span><span>⌕ Pinch / scroll to zoom</span><span>Tap a panel to select it</span></div>
          </div>
          <aside className="rounded-3xl border border-white/10 bg-[#131719] p-5">
            <div className="flex items-center gap-2 text-[#d8b96e]"><Palette className="size-4" /><span className="text-[10px] font-bold uppercase tracking-[0.2em]">Paint controls</span></div>
            <h2 className="mt-4 text-xl font-semibold">Choose a part</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(Object.keys(partLabels) as Part[]).map((part) => <button key={part} onClick={() => setSelected(part)} className={`rounded-xl border px-3 py-3 text-left text-xs transition ${selected === part ? "border-[#d8b96e] bg-[#d8b96e]/10 text-[#f2d996]" : "border-white/10 bg-white/[0.02] text-white/65 hover:border-white/25"}`}>{partLabels[part]}<span className="mt-2 block size-4 rounded-full border border-white/20" style={{ backgroundColor: colours[part] }} /></button>)}
            </div>
            <div className="mt-7 border-t border-white/10 pt-5"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Colour palette</h3><span className="size-6 rounded-full border border-white/30" style={{ backgroundColor: selectedColour }} /></div>
              <div className="mt-4 grid grid-cols-5 gap-3">{swatches.map((colour) => <button key={colour} aria-label={`Apply ${colour}`} onClick={() => updateColour(colour)} className={`aspect-square rounded-full border-2 transition hover:scale-110 ${selectedColour === colour ? "border-white ring-2 ring-[#d8b96e]" : "border-white/15"}`} style={{ backgroundColor: colour }} />)}</div>
              <label className="mt-5 block text-xs text-white/50">Custom colour<input aria-label="Custom paint colour" type="color" value={selectedColour} onChange={(event) => updateColour(event.target.value)} className="mt-2 h-11 w-full cursor-pointer rounded-lg border border-white/10 bg-transparent p-1" /></label>
            </div>
            <button onClick={() => setSaved(true)} className="mt-7 w-full rounded-full bg-[#d8b96e] px-5 py-4 text-sm font-bold text-[#17140d] hover:bg-[#e8cd8a]">{saved ? "Design saved in this session" : "Save this design"}</button>
            <p className="mt-3 text-center text-[10px] leading-5 text-white/35">Prototype: designs are held in this browser session and are not yet linked to a customer account or real vehicle.</p>
          </aside>
        </div>
      </section>
    </main>
  );
}
