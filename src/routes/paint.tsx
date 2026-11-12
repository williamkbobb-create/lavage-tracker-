import { createFileRoute, Link } from "@tanstack/react-router";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  OrbitControls,
  useAnimations,
  useGLTF,
} from "@react-three/drei";
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ErrorInfo, ReactNode } from "react";
import * as THREE from "three";
import {
  ArrowLeft,
  Check,
  DoorOpen,
  Palette,
  RotateCcw,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/paint")({
  head: () => ({
    meta: [
      { title: "Studio de peinture 3D | Lavage International" },
      {
        name: "description",
        content:
          "Explorez un véhicule 3D détaillé et personnalisez ses finitions.",
      },
    ],
  }),
  component: PaintStudioPage,
});

const CAR_MODEL_URL =
  "https://raw.githubusercontent.com/JaronKBragg7337/spectral-gt-rs/main/spectral_gt_rs_game_ready.glb";

type Finish = "body" | "wheels" | "glass" | "interior";

const finishLabels: Record<Finish, string> = {
  body: "Carrosserie",
  wheels: "Jantes",
  glass: "Vitrage",
  interior: "Habitacle",
};

const materialGroups: Record<Finish, string[]> = {
  body: ["Spectral Blue — Clearcoat", "Midnight Blue — Shadow Panels"],
  wheels: ["Machined Chrome", "Brushed Aluminum"],
  glass: ["Smoked Smart Glass", "Black Glass Display"],
  interior: ["Burgundy Performance Leather", "Carbon Leather"],
};

const initialColours: Record<Finish, string> = {
  body: "#0c4a91",
  wheels: "#b7c3ce",
  glass: "#10293f",
  interior: "#6f1d31",
};

const palette = [
  "#0c4a91",
  "#f0eee8",
  "#111820",
  "#b82032",
  "#1763a4",
  "#176b50",
  "#777d86",
  "#d9782e",
  "#7656a8",
  "#b9a17c",
];

class ModelErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("3D vehicle failed to load", error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm font-semibold text-white">
            Le véhicule 3D n’a pas pu être chargé.
          </p>
          <p className="max-w-sm text-xs leading-5 text-white/50">
            Vérifiez votre connexion puis rechargez le studio. Le modèle est
            chargé depuis une bibliothèque publique CC0.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

function VehicleModel({
  colours,
  doorsOpen,
}: {
  colours: Record<Finish, string>;
  doorsOpen: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const gltf = useGLTF(CAR_MODEL_URL);
  const model = useMemo(() => {
    const copy = gltf.scene.clone(true);
    copy.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((material) => material.clone());
      } else {
        mesh.material = mesh.material.clone();
      }
    });
    const bounds = new THREE.Box3().setFromObject(copy);
    copy.position.y -= bounds.min.y;
    copy.rotation.y = -Math.PI / 2;
    return copy;
  }, [gltf.scene]);

  const { actions } = useAnimations(gltf.animations, root);
  const doorActions = useMemo(
    () =>
      Object.entries(actions).filter(
        ([name, action]) => name.startsWith("Doors_") && Boolean(action),
      ),
    [actions],
  );
  const previousDoorState = useRef<boolean | null>(null);

  useEffect(() => {
    model.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      materials.forEach((material) => {
        const group = (Object.keys(materialGroups) as Finish[]).find((finish) =>
          materialGroups[finish].includes(material.name),
        );
        const paintMaterial = material as THREE.MeshStandardMaterial;
        if (group && paintMaterial.color) {
          paintMaterial.color.set(colours[group]);
          paintMaterial.needsUpdate = true;
        }
      });
    });
  }, [model, colours]);

  useEffect(() => {
    const previous = previousDoorState.current;
    previousDoorState.current = doorsOpen;
    if (previous === null) return;

    doorActions.forEach(([, action]) => {
      if (!action) return;
      if (doorsOpen) {
        action.reset();
        action.timeScale = 1;
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.play();
      } else {
        action.paused = false;
        action.timeScale = -1;
        action.play();
      }
    });
  }, [doorsOpen, doorActions]);

  useFrame(() => {
    doorActions.forEach(([, action]) => {
      if (!action) return;
      const midpoint = action.getClip().duration * 0.5;
      if (doorsOpen && action.time >= midpoint) {
        action.time = midpoint;
        action.paused = true;
      } else if (!doorsOpen && action.time <= 0.01) {
        action.time = 0;
        action.paused = true;
      }
    });
  });

  return (
    <group ref={root}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload(CAR_MODEL_URL);

function PaintStudioPage() {
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<Finish>("body");
  const [colours, setColours] = useState(initialColours);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => setMounted(true), []);

  const selectedColour = colours[selected];

  const updateColour = (colour: string) => {
    setColours((current) => ({ ...current, [selected]: colour }));
    setSaved(false);
  };

  const reset = () => {
    setColours(initialColours);
    setSelected("body");
    setDoorsOpen(false);
    setSaved(false);
  };

  return (
    <main className="min-h-screen bg-[#080b10] text-[#f5f3ee]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-white/65 transition hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Retour à Lavage International
        </Link>
        <span className="text-[10px] font-bold tracking-[0.24em] text-[#d9bd7b] sm:text-xs">
          LAVAGE INTERNATIONAL · STUDIO 3D
        </span>
      </header>

      <section className="mx-auto max-w-7xl px-5 pb-12 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-[#d9bd7b]">
              <Sparkles className="size-3.5" />
              Votre style, vos finitions
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
              Donnez-lui votre signature.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
              Faites pivoter le véhicule, zoomez et personnalisez la carrosserie,
              les jantes, le vitrage et l’habitacle. Ouvrez les portes pour
              découvrir l’intérieur.
            </p>
          </div>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-xs text-white/75 transition hover:border-white/30 hover:bg-white/5"
          >
            <RotateCcw className="size-3.5" />
            Réinitialiser
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[radial-gradient(ellipse_at_50%_40%,#34414c_0%,#151d26_48%,#0b1017_100%)] shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between px-5 pt-5 text-[9px] uppercase tracking-[0.2em] text-white/45 sm:px-6">
              <span>Concept sportif détaillé</span>
              <span>Vue interactive 360°</span>
            </div>
            <div className="h-[340px] touch-none sm:h-[540px]">
              {mounted ? (
                <ModelErrorBoundary>
                  <Canvas
                    camera={{ position: [5.6, 3.1, 6.1], fov: 36 }}
                    shadows
                    dpr={[1, 1.5]}
                    gl={{ antialias: true, powerPreference: "high-performance" }}
                  >
                    <Suspense fallback={null}>
                      <color attach="background" args={["#111922"]} />
                      <ambientLight intensity={0.72} />
                      <hemisphereLight
                        args={["#dceaff", "#101722", 1.05]}
                      />
                      <directionalLight
                        position={[5, 8, 5]}
                        intensity={2.7}
                        castShadow
                        shadow-mapSize-width={1024}
                        shadow-mapSize-height={1024}
                      />
                      <directionalLight
                        position={[-5, 4, -4]}
                        intensity={1.65}
                        color="#9fc7ff"
                      />
                      <spotLight
                        position={[0, 7, 1]}
                        angle={0.7}
                        penumbra={0.8}
                        intensity={95}
                        distance={18}
                      />
                      <VehicleModel colours={colours} doorsOpen={doorsOpen} />
                      <ContactShadows
                        position={[0, 0.015, 0]}
                        opacity={0.48}
                        scale={9}
                        blur={2.5}
                        far={4.5}
                      />
                      <OrbitControls
                        enableDamping
                        dampingFactor={0.075}
                        minDistance={3.4}
                        maxDistance={11}
                        maxPolarAngle={Math.PI / 2.02}
                        target={[0, 0.85, 0]}
                      />
                    </Suspense>
                  </Canvas>
                </ModelErrorBoundary>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-white/45">
                  Préparation du studio 3D…
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-4 sm:px-6">
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-white/45">
                <span>↔ Glisser pour pivoter</span>
                <span>＋ Pincer pour zoomer</span>
                <span>Faire glisser à deux doigts pour déplacer</span>
              </div>
              <button
                onClick={() => setDoorsOpen((open) => !open)}
                className="inline-flex items-center gap-2 rounded-full border border-[#d9bd7b]/50 px-4 py-2.5 text-[11px] font-semibold text-[#f0d99e] transition hover:bg-[#d9bd7b]/10"
              >
                <DoorOpen className="size-3.5" />
                {doorsOpen ? "Fermer les portes" : "Ouvrir les portes"}
              </button>
            </div>
          </div>

          <aside className="rounded-[26px] border border-white/10 bg-[#121820] p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[#d9bd7b]">
              <Palette className="size-4" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                Atelier de finition
              </span>
            </div>
            <h2 className="mt-4 text-xl font-semibold">Choisir une surface</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(Object.keys(finishLabels) as Finish[]).map((finish) => (
                <button
                  key={finish}
                  onClick={() => setSelected(finish)}
                  className={`rounded-xl border px-3 py-3 text-left text-xs transition ${
                    selected === finish
                      ? "border-[#d9bd7b] bg-[#d9bd7b]/10 text-[#f0d99e]"
                      : "border-white/10 bg-white/[0.02] text-white/65 hover:border-white/25"
                  }`}
                >
                  {finishLabels[finish]}
                  <span
                    className="mt-2 block size-5 rounded-full border border-white/20"
                    style={{ backgroundColor: colours[finish] }}
                  />
                </button>
              ))}
            </div>

            <div className="mt-7 border-t border-white/10 pt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Palette de couleurs</h3>
                <span
                  className="size-6 rounded-full border border-white/30 shadow-lg"
                  style={{ backgroundColor: selectedColour }}
                />
              </div>
              <div className="mt-4 grid grid-cols-5 gap-3">
                {palette.map((colour) => (
                  <button
                    key={colour}
                    aria-label={`Appliquer la couleur ${colour}`}
                    onClick={() => updateColour(colour)}
                    className={`aspect-square rounded-full border-2 transition hover:scale-110 ${
                      selectedColour === colour
                        ? "border-white ring-2 ring-[#d9bd7b]"
                        : "border-white/15"
                    }`}
                    style={{ backgroundColor: colour }}
                  />
                ))}
              </div>
              <label className="mt-5 block text-xs text-white/50">
                Couleur personnalisée
                <input
                  aria-label="Couleur personnalisée"
                  type="color"
                  value={selectedColour}
                  onChange={(event) => updateColour(event.target.value)}
                  className="mt-2 h-11 w-full cursor-pointer rounded-lg border border-white/10 bg-transparent p-1"
                />
              </label>
            </div>

            <button
              onClick={() => setSaved(true)}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-[#d9bd7b] px-5 py-4 text-sm font-bold text-[#17140d] transition hover:bg-[#ead39a]"
            >
              {saved ? <Check className="size-4" /> : <Palette className="size-4" />}
              {saved ? "Design gardé pour cette session" : "Enregistrer ce design"}
            </button>
            <p className="mt-3 text-center text-[10px] leading-5 text-white/35">
              Prototype : véhicule sportif générique de démonstration. Le design
              est conservé uniquement pendant cette session et n’est pas encore
              associé à un compte client ou à un véhicule immatriculé.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
