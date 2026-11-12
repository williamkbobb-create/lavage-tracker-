import { createFileRoute, Link } from "@tanstack/react-router";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft, DoorOpen, Palette, RotateCcw } from "lucide-react";
import * as THREE from "three";

export const Route = createFileRoute("/paint")({
  head: () => ({ meta: [
    { title: "3D Paint Studio | Lavage International" },
    { name: "description", content: "Explore a 3D sedan, open its doors and customise paint finishes." },
  ] }),
  component: PaintStudioPage,
});

type Part = "body" | "hood" | "roof" | "frontBumper" | "rearBumper" | "wheels" | "glass";
const labels: Record<Part, string> = {
  body: "Body panels", hood: "Bonnet", roof: "Roof", frontBumper: "Front bumper",
  rearBumper: "Rear bumper", wheels: "Rims", glass: "Windows",
};
const initial: Record<Part, string> = {
  body: "#c6a45b", hood: "#c6a45b", roof: "#c6a45b", frontBumper: "#c6a45b",
  rearBumper: "#c6a45b", wheels: "#20242a", glass: "#172b3b",
};
const palette = ["#c6a45b", "#f2f0e9", "#111827", "#bd2634", "#164e83", "#176b50", "#777b83", "#d9782e", "#7d5aa6", "#e6c9a2"];

function Vehicle({ colours, selected, onSelect, doorsOpen }: {
  colours: Record<Part, string>; selected: Part; onSelect: (part: Part) => void; doorsOpen: boolean;
}) {
  const mat = (part: Part, metalness = 0.55, roughness = 0.27) => (
    <meshPhysicalMaterial color={colours[part]} metalness={metalness} roughness={roughness}
      clearcoat={0.85} clearcoatRoughness={0.18}
      emissive={selected === part ? new THREE.Color(colours[part]) : new THREE.Color("#000000")}
      emissiveIntensity={selected === part ? 0.09 : 0} />
  );
  const dark = <meshStandardMaterial color="#171d22" metalness={0.35} roughness={0.48} />;
  const glass = <meshPhysicalMaterial color={colours.glass} metalness={0.25} roughness={0.12} transmission={0.12} transparent opacity={0.82} />;
  const wheels: [number, number, number][] = [
    [-1.13, -0.37, 0.79], [1.13, -0.37, 0.79], [-1.13, -0.37, -0.79], [1.13, -0.37, -0.79],
  ];
  return (
    <group position={[0, -0.12, 0]}>
      {/* Lower body and sculpted bonnet */}
      <mesh castShadow receiveShadow position={[0, 0, 0]} onClick={(e) => { e.stopPropagation(); onSelect("body"); }}>
        <boxGeometry args={[3.35, 0.54, 1.42, 2, 1, 2]} />{mat("body")}
      </mesh>
      <mesh castShadow position={[0.99, 0.31, 0]} rotation={[0, 0, -0.035]} onClick={(e) => { e.stopPropagation(); onSelect("hood"); }}>
        <boxGeometry args={[1.12, 0.14, 1.3, 2, 1, 2]} />{mat("hood")}
      </mesh>
      <mesh castShadow position={[-1.18, 0.25, 0]} rotation={[0, 0, 0.035]} onClick={(e) => { e.stopPropagation(); onSelect("body"); }}>
        <boxGeometry args={[0.7, 0.16, 1.3]} />{mat("body")}
      </mesh>
      {/* Cabin, roof and front/rear glass */}
      <mesh castShadow position={[-0.05, 0.65, 0]} rotation={[0, 0, -0.03]} onClick={(e) => { e.stopPropagation(); onSelect("roof"); }}>
        <boxGeometry args={[1.62, 0.66, 1.12]} />{mat("roof")}
      </mesh>
      <mesh position={[0.77, 0.62, 0]} rotation={[0, 0, -0.42]}>
        <boxGeometry args={[0.66, 0.49, 1.08]} />{glass}
      </mesh>
      <mesh position={[-0.86, 0.62, 0]} rotation={[0, 0, 0.42]}>
        <boxGeometry args={[0.58, 0.48, 1.08]} />{glass}
      </mesh>
      {/* Side windows */}
      {[1, -1].map((side) => (
        <group key={side} position={[0, 0, side * 0.575]}>
          <mesh position={[0.37, 0.64, 0]} rotation={[0, 0, -0.04]}><boxGeometry args={[0.65, 0.43, 0.025]} />{glass}</mesh>
          <mesh position={[-0.48, 0.64, 0]} rotation={[0, 0, 0.04]}><boxGeometry args={[0.72, 0.43, 0.025]} />{glass}</mesh>
          <mesh position={[-0.05, 0.64, 0]}><boxGeometry args={[0.045, 0.49, 0.04]} />{dark}</mesh>
        </group>
      ))}
      {/* Bumpers, grille, lamps and tail lights */}
      <mesh position={[1.72, -0.03, 0]} onClick={(e) => { e.stopPropagation(); onSelect("frontBumper"); }}>
        <boxGeometry args={[0.2, 0.31, 1.34]} />{mat("frontBumper")}
      </mesh>
      <mesh position={[-1.72, -0.03, 0]} onClick={(e) => { e.stopPropagation(); onSelect("rearBumper"); }}>
        <boxGeometry args={[0.2, 0.31, 1.34]} />{mat("rearBumper")}
      </mesh>
      <mesh position={[1.83, -0.01, 0]}><boxGeometry args={[0.025, 0.19, 0.53]} />{dark}</mesh>
      {[-0.48, 0.48].map((z) => <mesh key={z} position={[1.84, 0.13, z]}>
        <boxGeometry args={[0.045, 0.13, 0.27]} />
        <meshPhysicalMaterial color="#fff1c4" emissive="#ffe6a1" emissiveIntensity={1.2} />
      </mesh>)}
      {[-0.48, 0.48].map((z) => <mesh key={z} position={[-1.84, 0.12, z]}>
        <boxGeometry args={[0.04, 0.13, 0.27]} />
        <meshStandardMaterial color="#a9232d" emissive="#5b1017" emissiveIntensity={0.45} />
      </mesh>)}
      {/* Opening side doors with window frames and handles */}
      {[1, -1].map((side) => (
        <group key={side} position={[0.02, 0.12, side * 0.72]} rotation={[0, doorsOpen ? side * -0.78 : 0, 0]}>
          <mesh position={[-0.02, 0.03, side * 0.035]} onClick={(e) => { e.stopPropagation(); onSelect("body"); }}>
            <boxGeometry args={[0.94, 0.39, 0.075]} />{mat("body")}
          </mesh>
          <mesh position={[-0.02, 0.3, side * 0.035]}>
            <boxGeometry args={[0.83, 0.28, 0.035]} />{glass}
          </mesh>
          <mesh position={[0.28, 0.1, side * 0.08]}><boxGeometry args={[0.16, 0.025, 0.018]} />{dark}</mesh>
        </group>
      ))}
      {/* Mirrors */}
      {[1, -1].map((side) => <group key={side} position={[0.48, 0.38, side * 0.76]}>
        <mesh><boxGeometry args={[0.17, 0.1, 0.18]} />{mat("body")}</mesh>
        <mesh position={[0.025, 0, side * 0.09]}><boxGeometry args={[0.12, 0.07, 0.025]} /><meshStandardMaterial color="#8fa5b2" metalness={0.8} roughness={0.16} /></mesh>
      </group>)}
      {/* Seats, dashboard and centre console visible through glass/open doors */}
      {[-0.29, 0.29].map((z) => <group key={z} position={[0.05, 0.22, z]}>
        <mesh position={[0, 0.12, 0]}><boxGeometry args={[0.32, 0.34, 0.28]} /><meshStandardMaterial color="#272c30" roughness={0.9} /></mesh>
        <mesh position={[-0.12, -0.02, 0]}><boxGeometry args={[0.38, 0.12, 0.3]} /><meshStandardMaterial color="#343a3f" roughness={0.9} /></mesh>
      </group>)}
      <mesh position={[0.67, 0.25, 0]}><boxGeometry args={[0.22, 0.1, 0.72]} /><meshStandardMaterial color="#252b30" /></mesh>
      {/* Tyres, alloy faces and spokes */}
      {wheels.map((position, index) => (
        <group key={index} position={position} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow onClick={(e) => { e.stopPropagation(); onSelect("wheels"); }}>
            <cylinderGeometry args={[0.39, 0.39, 0.23, 40]} />
            <meshStandardMaterial color="#111416" roughness={0.86} />
          </mesh>
          <mesh position={[0, 0.125, 0]} onClick={(e) => { e.stopPropagation(); onSelect("wheels"); }}>
            <cylinderGeometry args={[0.27, 0.27, 0.035, 32]} />{mat("wheels", 0.92, 0.18)}
          </mesh>
          {Array.from({ length: 8 }, (_, spoke) => <mesh key={spoke} position={[0, 0.15, 0]} rotation={[0, spoke * Math.PI / 4, 0]}>
            <boxGeometry args={[0.035, 0.018, 0.43]} /><meshStandardMaterial color="#c5cbd0" metalness={0.95} roughness={0.16} />
          </mesh>)}
          <mesh position={[0, 0.15, 0]}><cylinderGeometry args={[0.07, 0.07, 0.045, 20]} /><meshStandardMaterial color="#aeb6bc" metalness={0.9} /></mesh>
        </group>
      ))}
    </group>
  );
}

function PaintStudioPage() {
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<Part>("body");
  const [colours, setColours] = useState(initial);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => setMounted(true), []);
  const selectedColour = useMemo(() => colours[selected], [colours, selected]);
  const updateColour = (colour: string) => { setColours((current) => ({ ...current, [selected]: colour })); setSaved(false); };
  const reset = () => { setColours(initial); setSelected("body"); setDoorsOpen(false); setSaved(false); };

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
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/55">Drag to rotate. Pinch or scroll to zoom. Open the doors to inspect the cabin. Select a part to customise its finish.</p>
          </div>
          <button onClick={reset} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs text-white/75 hover:bg-white/5"><RotateCcw className="size-4" /> Reset design</button>
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(ellipse_at_50%_38%,#424a50_0%,#171c20_50%,#0d1012_100%)]">
            <div className="flex items-center justify-between px-5 pt-5 text-[10px] uppercase tracking-[0.18em] text-white/45"><span>Detailed concept sedan</span><span>360° interactive view</span></div>
            <div className="h-[360px] touch-none sm:h-[540px]">
              {mounted ? <Canvas camera={{ position: [4.7, 2.7, 5.2], fov: 37 }} shadows dpr={[1, 1.6]}>
                <Suspense fallback={null}>
                  <color attach="background" args={["#14191d"]} />
                  <ambientLight intensity={1.05} />
                  <directionalLight position={[5, 8, 5]} intensity={2.6} castShadow />
                  <directionalLight position={[-4, 4, -5]} intensity={1.1} color="#d5e4ff" />
                  <Vehicle colours={colours} selected={selected} onSelect={setSelected} doorsOpen={doorsOpen} />
                  <ContactShadows position={[0, -0.58, 0]} opacity={0.5} scale={8} blur={2.4} far={4} />
                  <OrbitControls enableDamping dampingFactor={0.075} minDistance={3.2} maxDistance={9} maxPolarAngle={Math.PI / 2.02} />
                </Suspense>
              </Canvas> : <div className="flex h-full items-center justify-center text-sm text-white/45">Preparing 3D studio…</div>}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 border-t border-white/10 px-4 py-4 text-[10px] text-white/45">
              <span>↔ Drag to rotate</span><span>⌕ Pinch / scroll to zoom</span><span>Tap a panel to select</span>
              <button onClick={() => setDoorsOpen((open) => !open)} className="inline-flex items-center gap-1 rounded-full border border-[#d8b96e]/50 px-3 py-2 text-[#f2d996]"><DoorOpen className="size-3" />{doorsOpen ? "Close doors" : "Open doors"}</button>
            </div>
          </div>
          <aside className="rounded-3xl border border-white/10 bg-[#131719] p-5">
            <div className="flex items-center gap-2 text-[#d8b96e]"><Palette className="size-4" /><span className="text-[10px] font-bold uppercase tracking-[0.2em]">Paint controls</span></div>
            <h2 className="mt-4 text-xl font-semibold">Choose a part</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(Object.keys(labels) as Part[]).map((part) => <button key={part} onClick={() => setSelected(part)} className={`rounded-xl border px-3 py-3 text-left text-xs transition ${selected === part ? "border-[#d8b96e] bg-[#d8b96e]/10 text-[#f2d996]" : "border-white/10 bg-white/[0.02] text-white/65 hover:border-white/25"}`}>{labels[part]}<span className="mt-2 block size-4 rounded-full border border-white/20" style={{ backgroundColor: colours[part] }} /></button>)}
            </div>
            <div className="mt-7 border-t border-white/10 pt-5"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Colour palette</h3><span className="size-6 rounded-full border border-white/30" style={{ backgroundColor: selectedColour }} /></div>
              <div className="mt-4 grid grid-cols-5 gap-3">{palette.map((colour) => <button key={colour} aria-label={`Apply ${colour}`} onClick={() => updateColour(colour)} className={`aspect-square rounded-full border-2 transition hover:scale-110 ${selectedColour === colour ? "border-white ring-2 ring-[#d8b96e]" : "border-white/15"}`} style={{ backgroundColor: colour }} />)}</div>
              <label className="mt-5 block text-xs text-white/50">Custom colour<input aria-label="Custom paint colour" type="color" value={selectedColour} onChange={(event) => updateColour(event.target.value)} className="mt-2 h-11 w-full cursor-pointer rounded-lg border border-white/10 bg-transparent p-1" /></label>
            </div>
            <button onClick={() => setSaved(true)} className="mt-7 w-full rounded-full bg-[#d8b96e] px-5 py-4 text-sm font-bold text-[#17140d] hover:bg-[#e8cd8a]">{saved ? "Design saved in this session" : "Save this design"}</button>
            <p className="mt-3 text-center text-[10px] leading-5 text-white/35">Prototype: this is a procedural concept sedan. Designs are session-only and are not yet linked to customer accounts or actual vehicle models.</p>
          </aside>
        </div>
      </section>
    </main>
  );
}
