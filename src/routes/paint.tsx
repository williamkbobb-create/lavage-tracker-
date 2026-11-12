import { createFileRoute, Link } from "@tanstack/react-router";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls, useAnimations, useGLTF } from "@react-three/drei";
import { Component, Suspense, useEffect, useMemo, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import * as THREE from "three";
import { ArrowLeft, Check, DoorOpen, Palette, RotateCcw, Sparkles, CarFront, Gauge } from "lucide-react";

export const Route = createFileRoute("/paint")({
  head: () => ({ meta: [
    { title: "Studio de peinture 3D | Lavage International" },
    { name: "description", content: "Explorez et personnalisez un véhicule 3D avec portes, capot et coffre animés." },
  ] }),
  component: PaintStudioPage,
});

const MODEL_URL = "https://cdn.3dassets.dev/assets/32493/v1/model.glb";
type Finish = "body" | "wheels" | "glass" | "interior";
const labels: Record<Finish, string> = { body: "Carrosserie", wheels: "Jantes", glass: "Vitrage", interior: "Habitacle" };
const initial: Record<Finish, string> = { body: "#173f69", wheels: "#b8c1ca", glass: "#173044", interior: "#5b2931" };
const palette = ["#173f69", "#f1f0eb", "#171b20", "#b82032", "#1763a4", "#176b50", "#777d86", "#d9782e", "#7656a8", "#b9a17c"];
const patterns: Record<Finish, RegExp> = {
  body: /body|paint|carros|exterior|bonnet|hood|door|bumper|fender|wing|boot|bodywork/i,
  wheels: /wheel|rim|tyre|tire|alloy/i,
  glass: /glass|window|windshield|windscreen|glazing/i,
  interior: /interior|seat|leather|cloth|dashboard|cabin|trim/i,
};

class ModelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("3D model load failed", error, info); }
  render() {
    if (this.state.failed) return <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center"><p className="text-sm font-semibold text-white">Le modèle 3D n’a pas pu être chargé.</p><p className="max-w-sm text-xs leading-5 text-white/50">Vérifiez votre connexion puis rechargez le studio.</p></div>;
    return this.props.children;
  }
}

function Vehicle({ colours, doorsOpen, bonnetOpen, bootOpen, onMaterialCounts }: {
  colours: Record<Finish, string>; doorsOpen: boolean; bonnetOpen: boolean; bootOpen: boolean;
  onMaterialCounts: (counts: Record<Finish, number>) => void;
}) {
  const { scene, animations } = useGLTF(MODEL_URL);
  const model = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true; mesh.receiveShadow = true;
      const cloneMaterial = (material: THREE.Material) => {
        const next = material.clone();
        if (next instanceof THREE.MeshStandardMaterial) {
          next.envMapIntensity = 1.15;
          next.roughness = Math.max(0.16, next.roughness);
        }
        return next;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(cloneMaterial) : cloneMaterial(mesh.material);
    });
    return copy;
  }, [scene]);
  const { actions } = useAnimations(animations, model);

  useEffect(() => {
    const counts: Record<Finish, number> = { body: 0, wheels: 0, glass: 0, interior: 0 };
    model.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((material) => {
        const signature = `${mesh.name} ${material.name}`;
        (Object.keys(patterns) as Finish[]).forEach((finish) => {
          if (!patterns[finish].test(signature)) return;
          counts[finish] += 1;
          const standard = material as THREE.MeshStandardMaterial;
          if (standard.color) standard.color.set(colours[finish]);
          if (finish === "body" && standard instanceof THREE.MeshPhysicalMaterial) {
            standard.clearcoat = 0.85; standard.clearcoatRoughness = 0.18;
          }
          standard.needsUpdate = true;
        });
      });
    });
    onMaterialCounts(counts);
  }, [model, colours, onMaterialCounts]);

  useEffect(() => {
    const action = actions[doorsOpen ? "door-open" : "door-close"];
    if (!action) return;
    action.reset(); action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.play();
  }, [actions, doorsOpen]);

  useEffect(() => {
    const action = actions[bonnetOpen ? "bonnet-open" : "bonnet-close"];
    if (!action) return;
    action.reset(); action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.play();
  }, [actions, bonnetOpen]);

  useEffect(() => {
    const action = actions[bootOpen ? "boot-open" : "boot-close"];
    if (!action) return;
    action.reset(); action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.play();
  }, [actions, bootOpen]);

  return <primitive object={model} />;
}

function PaintStudioPage() {
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<Finish>("body");
  const [colours, setColours] = useState(initial);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [bonnetOpen, setBonnetOpen] = useState(false);
  const [bootOpen, setBootOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [materialCounts, setMaterialCounts] = useState<Record<Finish, number>>({ body: 0, wheels: 0, glass: 0, interior: 0 });
  useEffect(() => setMounted(true), []);
  const updateColour = (colour: string) => { setColours((current) => ({ ...current, [selected]: colour })); setSaved(false); };
  const reset = () => { setColours(initial); setSelected("body"); setDoorsOpen(false); setBonnetOpen(false); setBootOpen(false); setSaved(false); };
  const countsChanged = setMaterialCounts;
  const selectedColour = colours[selected];

  return <main className="min-h-screen bg-[#080b10] text-[#f5f3ee]">
    <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/65 transition hover:text-white"><ArrowLeft className="size-4" />Retour à Lavage International</Link>
      <span className="text-[10px] font-bold tracking-[0.24em] text-[#d9bd7b] sm:text-xs">LAVAGE INTERNATIONAL · STUDIO 3D</span>
    </header>
    <section className="mx-auto max-w-7xl px-5 pb-12 sm:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-[#d9bd7b]"><Sparkles className="size-3.5" />Atelier de personnalisation</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">Donnez-lui votre signature.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">Véhicule 3D à l’échelle réelle. Faites-le pivoter, zoomez, ouvrez les portes, le capot et le coffre, puis explorez les finitions disponibles.</p></div>
        <button onClick={reset} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-xs text-white/75 transition hover:border-white/30 hover:bg-white/5"><RotateCcw className="size-3.5" />Réinitialiser</button>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[radial-gradient(ellipse_at_50%_40%,#48525b_0%,#202a34_48%,#0b1017_100%)] shadow-2xl shadow-black/30">
          <div className="flex items-center justify-between px-5 pt-5 text-[9px] uppercase tracking-[0.2em] text-white/45 sm:px-6"><span>Berline quatre portes · modèle générique</span><span>Vue interactive 360°</span></div>
          <div className="h-[340px] touch-none sm:h-[540px]">
            {mounted ? <ModelBoundary><Canvas camera={{ position: [6.2, 3.3, 7.1], fov: 34 }} shadows dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping }}>
              <Suspense fallback={null}>
                <color attach="background" args={["#111922"]} />
                <hemisphereLight args={["#e5efff", "#111820", 1.4]} />
                <ambientLight intensity={0.45} />
                <directionalLight position={[5, 8, 6]} intensity={3.1} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
                <directionalLight position={[-5, 4, -4]} intensity={1.8} color="#a9cfff" />
                <spotLight position={[0, 7, 1]} angle={0.68} penumbra={0.75} intensity={85} distance={20} />
                <Vehicle colours={colours} doorsOpen={doorsOpen} bonnetOpen={bonnetOpen} bootOpen={bootOpen} onMaterialCounts={countsChanged} />
                <ContactShadows position={[0, 0.01, 0]} opacity={0.52} scale={9} blur={2.4} far={5} />
                <OrbitControls enableDamping dampingFactor={0.07} minDistance={3.1} maxDistance={12} maxPolarAngle={Math.PI / 2.02} target={[0, 0.72, 0]} />
              </Suspense>
            </Canvas></ModelBoundary> : <div className="flex h-full items-center justify-center text-sm text-white/45">Préparation du modèle 3D…</div>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-4 sm:px-6">
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-white/45"><span>↔ Glisser pour pivoter</span><span>＋ Pincer pour zoomer</span><span>Deux doigts pour déplacer</span></div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setDoorsOpen((v) => !v)} className="rounded-full border border-[#d9bd7b]/50 px-3 py-2 text-[10px] font-semibold text-[#f0d99e] hover:bg-[#d9bd7b]/10">{doorsOpen ? "Fermer portes" : "Ouvrir portes"}</button>
              <button onClick={() => setBonnetOpen((v) => !v)} className="rounded-full border border-white/20 px-3 py-2 text-[10px] text-white/75 hover:bg-white/10">{bonnetOpen ? "Fermer capot" : "Ouvrir capot"}</button>
              <button onClick={() => setBootOpen((v) => !v)} className="rounded-full border border-white/20 px-3 py-2 text-[10px] text-white/75 hover:bg-white/10">{bootOpen ? "Fermer coffre" : "Ouvrir coffre"}</button>
            </div>
          </div>
        </div>
        <aside className="rounded-[26px] border border-white/10 bg-[#121820] p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[#d9bd7b]"><Palette className="size-4" /><span className="text-[10px] font-bold uppercase tracking-[0.2em]">Atelier de finition</span></div>
          <h2 className="mt-4 text-xl font-semibold">Choisir une surface</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">{(Object.keys(labels) as Finish[]).map((finish) => <button key={finish} onClick={() => setSelected(finish)} className={`rounded-xl border px-3 py-3 text-left text-xs transition ${selected === finish ? "border-[#d9bd7b] bg-[#d9bd7b]/10 text-[#f0d99e]" : "border-white/10 bg-white/[0.02] text-white/65 hover:border-white/25"}`}>{labels[finish]}<span className="mt-2 block size-5 rounded-full border border-white/20" style={{ backgroundColor: colours[finish] }} /></button>)}</div>
          <div className="mt-7 border-t border-white/10 pt-5"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Palette de couleurs</h3><span className="size-6 rounded-full border border-white/30" style={{ backgroundColor: selectedColour }} /></div>
            <div className="mt-4 grid grid-cols-5 gap-3">{palette.map((colour) => <button key={colour} aria-label={`Appliquer la couleur ${colour}`} onClick={() => updateColour(colour)} className={`aspect-square rounded-full border-2 transition hover:scale-110 ${selectedColour === colour ? "border-white ring-2 ring-[#d9bd7b]" : "border-white/15"}`} style={{ backgroundColor: colour }} />)}</div>
            <label className="mt-5 block text-xs text-white/50">Couleur personnalisée<input aria-label="Couleur personnalisée" type="color" value={selectedColour} onChange={(event) => updateColour(event.target.value)} className="mt-2 h-11 w-full cursor-pointer rounded-lg border border-white/10 bg-transparent p-1" /></label>
          </div>
          <div className="mt-5 space-y-2 rounded-xl bg-white/[0.035] p-3">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-white/55"><Gauge className="size-3.5" />Correspondance des matériaux</p>
            {(Object.keys(labels) as Finish[]).map((finish) => <div key={finish} className="flex justify-between text-[10px] text-white/50"><span>{labels[finish]}</span><span>{materialCounts[finish] > 0 ? `${materialCounts[finish]} élément(s) reconnu(s)` : "Correspondance à confirmer"}</span></div>)}
          </div>
          <button onClick={() => setSaved(true)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#d9bd7b] px-5 py-4 text-sm font-bold text-[#17140d] transition hover:bg-[#ead39a]">{saved ? <Check className="size-4" /> : <CarFront className="size-4" />}{saved ? "Design gardé pour cette session" : "Enregistrer ce design"}</button>
          <p className="mt-3 text-center text-[10px] leading-5 text-white/35">Prototype : les commandes d’ouverture utilisent les animations du modèle. Les finitions sont appliquées aux matériaux reconnus par leur nom ; leur correspondance complète doit encore être vérifiée. Enregistrement temporaire uniquement.</p>
        </aside>
      </div>
    </section>
  </main>;
}
