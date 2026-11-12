# HackyTech Vehicle Intelligence Engine (HVIE)

## Product ownership and non-negotiable direction

HVIE is HackyTech's own photo-to-3D vehicle reconstruction and editing system. The production workflow must not depend on Polycam, Autodesk, or another paid reconstruction API. Vehicle photographs must not be sent to a third-party reconstruction service.

We will own the capture experience, upload and job orchestration, reconstruction worker, vehicle-specific AI, mesh processing, component intelligence, browser editor, project storage, and revision history. We may use established open-source algorithms as internal building blocks; that does not make a paid hosted API a dependency. Before bundling or distributing any dependency, verify its current licence and the licences of its transitive dependencies.

## Technical architecture

1. **Capture and intake (web app):** guided multi-view capture, vehicle metadata, original image upload, resumable upload, private storage, capture-session ownership.
2. **Quality gate:** supported formats, file size, image dimensions, duplicates, blur/exposure checks, coverage guidance, and capture completeness. Image count alone must never be treated as proof of adequate coverage.
3. **Job orchestration:** tenant-scoped job records, queue, idempotency, retry policy, cancellation, progress events, structured logs, and explicit failure reasons.
4. **Reconstruction worker:** isolated Python worker invokes a local COLMAP installation. No hosted reconstruction API or vendor credentials. Initial pipeline is CPU-compatible; GPU acceleration is optional, not assumed.
5. **Mesh and texture processing:** preserve raw SfM/MVS outputs, dense point cloud, surface mesh, and textured mesh. Normalize and optimize derivatives only after preserving source artifacts.
6. **Vehicle intelligence:** detect/classify vehicle body regions and components; map component masks to mesh faces/nodes; report confidence and allow manual correction.
7. **Engineering layer:** split fused surfaces where geometry permits, create stable component IDs, materials, UVs, pivots/hinges, and articulation. Doors, bonnet, boot, wheels, tyres, windows, lights, and interior are targets, not guaranteed outputs from photogrammetry alone.
8. **Browser workspace:** real reconstructed asset in Three.js/React Three Fiber; orbit, zoom, pan, component selection, per-part materials, inspection, and non-destructive revisions.
9. **Storage and tenancy:** private tenant-scoped source photos and artifacts, short-lived signed access, checksums, retention/deletion, audit trail, and server-side authorization.

## Reconstruction foundation

Initial algorithm foundation: **COLMAP**, run locally by our worker. Its documented CLI supports feature extraction, image matching, sparse mapping (SfM), image undistortion, PatchMatch dense stereo (MVS), stereo fusion, meshing, simplification, and texture baking. See the [COLMAP CLI documentation](https://colmap.github.io/cli.html).

The initial worker uses a conventional image-based pipeline: feature extraction and exhaustive matching; incremental sparse reconstruction; image undistortion; dense stereo and fusion; Poisson surface meshing; mesh simplification and texture baking.

COLMAP is not a vehicle-specific model generator. It reconstructs visible scene geometry and texture from overlapping images. Reflective paint, glass, low-texture panels, motion, changing lighting, occlusion, and unphotographed surfaces can reduce quality. The pipeline must report incomplete or failed reconstruction honestly.

OpenMVS and AliceVision/Meshroom may be evaluated as additional self-hosted algorithm components later. They are not required for the first worker milestone. No paid hosted reconstruction API is part of the production design.

## Worker contract

The first worker is a command-line process, not a public unauthenticated HTTP service. It receives a local staged image directory and a private output directory from a future trusted job runner. It writes a machine-readable job report, a complete command log, the COLMAP database and sparse reconstruction, dense workspace and fused point cloud, meshed PLY, and textured OBJ/MTL/texture outputs when texturing succeeds.

A textured OBJ is not automatically a GLB. GLB export/optimization is a separate conversion stage to add and validate before the browser editor consumes it. Never label a PLY/OBJ as GLB or imply that a point cloud is an editable component-separated car.

## Data model proposal (not applied)

- vehicle_captures: tenant, vehicle/job reference, capture status, metadata, timestamps.
- vehicle_capture_files: tenant, capture, private storage key, file type, byte size, checksum, dimensions, upload state.
- vehicle_reconstruction_jobs: tenant, capture, worker version, status, progress, retry count, timestamps, failure details.
- vehicle_models: tenant, capture/job, source artifacts, normalized artifact, format, size, processing state, metadata.
- vehicle_model_parts: tenant, model, stable part key, label, mesh/node references, confidence, editable flag, pivot metadata.
- vehicle_model_revisions: tenant, model, revision number, material/component edits, author and timestamps.

These are proposals only. No database migration is authorized or applied.

## Security and privacy

Vehicle photos can expose number plates, people, locations, and property. Keep uploads private, enforce tenant ownership server-side and with Supabase RLS, validate file type and size, use short-lived signed URLs, and define retention/deletion. Never expose worker filesystem paths, internal job IDs, or secrets to customers. Do not use client-provided tenant IDs as authorization. No customer images leave our controlled infrastructure for reconstruction.

## Delivery milestones

### M0 — self-hosted feasibility
- Build and validate the local COLMAP worker on a non-customer test photo set.
- Record runtime, CPU/RAM/GPU needs, output quality, missing surfaces, and failure modes.
- Verify COLMAP and all bundled dependency licences before distribution.
- No paid compute or hardware purchase without explicit approval.

### M1 — capture intake
- Staff-only guided capture workflow and vehicle metadata.
- Private staged uploads, coverage checks, and capture validation.
- No reconstruction job until the capture is approved.

### M2 — trusted job orchestration
- Tenant-scoped job records and queue.
- Worker dispatch, progress, retries, cancellation, and audit logging.
- Private artifact ingestion and checksum validation.

### M3 — 3D inspection
- Convert validated textured output to optimized GLB/glTF.
- Display the actual reconstructed vehicle in the browser workspace.
- Orbit, zoom, pan, lighting, metadata, and honest quality state.

### M4 — component intelligence and editing
- Vehicle-specific detection/segmentation and mesh mapping.
- Manual correction for fused or misclassified geometry.
- Per-component material edits and saved revisions.
- Rigging and door/bonnet/boot articulation only after geometry separation is validated.

## Acceptance criteria

- A real multi-view photo set can be staged and tied to the correct tenant and vehicle.
- Worker runs locally without a third-party reconstruction API or external reconstruction account.
- The job report accurately identifies each completed/failed stage.
- The output includes inspectable geometry and texture artifacts; missing/failed stages are explicit.
- No stock or generic car is presented as a reconstructed result.
- A completed mesh is not described as component-editable unless parts are independently identified and separated.
- Tenant A cannot access Tenant B's images, jobs, models, revisions, or signed links.
- No paid service, API credit purchase, paid compute, migration, or production deployment occurs without explicit approval.

## Current repository context

The application is TanStack Start/React with Supabase client integration and a Render preview. The existing /paint page is a generic external GLB prototype, not HVIE reconstruction output. It must not be described as photo reconstruction or a real scan. The existing Supabase project is inactive and tenant SQL remains proposal-only. Continue on feature/lavage-platform-foundation; do not alter the original repository or production branch.
