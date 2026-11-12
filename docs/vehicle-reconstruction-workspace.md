# Vehicle Reconstruction Workspace

## Product direction

Build a real photo-to-3D vehicle reconstruction workflow. This is not a generic 3D car configurator and must not use a stock cartoon vehicle as a substitute for the photographed car.

A user photographs one real vehicle from multiple overlapping viewpoints. The capture set is processed by a photogrammetry/reconstruction provider. The resulting asset is imported into our own browser workspace, where the user can inspect it and progressively gain editable component-level controls.

## Core pipeline

1. **Capture session** — create a vehicle capture record and collect original photos plus vehicle metadata.
2. **Capture validation** — check image count, file type, resolution, duplicates, blur/exposure where feasible, and capture coverage guidance. Do not claim a scan is complete based only on image count.
3. **Provider submission** — send the capture through a server-side provider adapter. Provider credentials must never be exposed to the browser.
4. **Asynchronous processing** — persist provider job identifiers and states; receive signed webhooks or poll provider status.
5. **Artifact ingestion** — download provider outputs through server-side code, validate file type/size, store originals and derivatives in private tenant-scoped storage, and record checksums/metadata.
6. **3D viewer** — load the reconstructed mesh in the browser with orbit, zoom, pan, lighting, and measurement/inspection tools.
7. **Component processing** — identify, segment, label and separate body panels, doors, bonnet, boot, glass, wheels, tyres, lights and interior where geometry permits.
8. **Editing** — apply material/paint changes to identified components; save non-destructive project revisions.
9. **Articulation** — add pivots/hinges and animations only when the reconstructed geometry supports reliable separation and rigging.

## Provider strategy

Use a provider-neutral interface so the product is not coupled to a single vendor.

Initial candidates:
- **Polycam Reconstruction API** — real photo-to-3D photogrammetry; access is limited and workspace approval is required. API use consumes prepaid credits. Current documentation requires at least 20 keyframes for a photo reconstruction request. Verify Enterprise/API commercial terms before activation.
- **Autodesk Reality Capture API** — established photogrammetry API supporting handheld camera imagery and mesh outputs. Verify current developer eligibility, pricing, availability, and supported output formats before selecting it.
- **Future self-hosted option** — evaluate COLMAP/OpenMVS or another suitable open-source photogrammetry pipeline only after assessing GPU, storage, processing time, operational cost, and commercial licensing.

Do not purchase subscriptions, credits, compute, or storage without explicit approval. Do not place API keys in VITE_ variables or client-side code.

## Provider adapter contract (conceptual)

- `createCapture(input)` — register a provider-side capture/job.
- `submitCapture(captureId, files)` — submit the prepared image set.
- `getCaptureStatus(providerJobId)` — retrieve processing state.
- `getArtifacts(providerJobId)` — return available model/texture/point-cloud outputs.
- `cancelCapture(providerJobId)` — cancel if supported.

Normalize provider states into: `draft`, `validating`, `queued`, `processing`, `completed`, `failed`, `cancelled`.

## Data and tenant isolation

Every capture, uploaded image, model, component map, and edit revision must belong to a business tenant. Enforce access on the server and with Supabase Row Level Security. Never rely on hidden UI links or a client-supplied business ID as authorization.

Proposed records:
- `vehicle_captures`: tenant, vehicle/job reference, capture status, provider, provider job ID, photo count, metadata, timestamps, failure details.
- `vehicle_capture_files`: tenant, capture, private storage key, file type, byte size, checksum, dimensions, upload state.
- `vehicle_models`: tenant, capture, source model, normalized model, format, size, processing state, metadata.
- `vehicle_model_parts`: tenant, model, stable part key, label, mesh/node references, classification confidence, editable flag, pivot metadata.
- `vehicle_model_revisions`: tenant, model, revision number, material/component edits, author and timestamps.

These are design proposals only. No database migration is authorized or applied by this document.

## 3D asset requirements

Prefer GLB/glTF for browser delivery where supported. Preserve the raw provider output and create optimized derivatives separately. Keep source geometry immutable. Model-part names and classifications must be traceable to the source asset. A photogrammetry mesh may be one fused surface; editable doors/bonnet/boot and functional hinges require additional segmentation and rigging and must not be promised automatically.

## Privacy and security

Vehicle photos may expose number plates, people, locations, and property. Keep source uploads private, scope access by tenant, use short-lived signed URLs, validate webhook signatures, constrain file sizes/types, and define retention/deletion behavior before public launch. Do not send customer or vehicle data to an AI provider unless the integration's privacy terms and user-facing disclosure are reviewed.

## Delivery milestones

### M0 — feasibility and provider selection
- Confirm provider account/API eligibility, actual pricing, supported capture inputs, outputs, rate limits, and data terms.
- Test a small non-customer vehicle photo set without committing to a paid plan.
- Record whether the output is a mesh, Gaussian splat, or both, and inspect topology/material/texture quality.

### M1 — capture intake
- Staff-only capture workflow with vehicle metadata and multi-photo upload.
- Capture coverage guidance and validation.
- Private storage design and tenant ownership.
- No paid provider submission until explicitly approved.

### M2 — reconstruction integration
- Server-side provider adapter and secret management.
- Job state persistence, webhook verification, retries, and failure handling.
- Artifact download and private storage.

### M3 — 3D inspection workspace
- Real reconstructed asset viewer.
- Orbit, zoom, pan, lighting, model metadata and source download controls.
- No placeholder vehicle presented as a reconstructed result.

### M4 — component intelligence and editing
- Mesh/node inspection and component classification.
- Manual correction tools for misclassified or fused parts.
- Per-component material/paint edits and saved revisions.
- Rigging and door/bonnet/boot articulation as a separate capability after segmentation validation.

## Acceptance criteria

- A real photo set can be uploaded and associated with the correct tenant and vehicle.
- The provider receives the exact approved capture set and its job state is tracked.
- A completed provider model can be ingested, validated, stored privately, and opened in the 3D workspace.
- The viewer displays the actual reconstructed vehicle, not a stock replacement.
- Model failures are explicit; no false success state is shown.
- Tenant A cannot access Tenant B's captures, source images, models, revisions, or signed download links.
- Component editing is enabled only for verified separated components; fused or uncertain geometry is clearly marked as not independently editable.
- No paid service, API credit purchase, migration, or production deployment occurs without explicit approval.

## Current implementation context

The existing repository is a TanStack Start/React application with Supabase client-side integration and a Render preview. The existing `/paint` page is a prototype using a generic external GLB; it is not the photo-reconstruction pipeline and must not be described as one. The existing Supabase project is inactive and the tenant migration remains proposal-only. Build new work on the approved development branch and keep production untouched.
