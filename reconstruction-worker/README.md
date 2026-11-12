# HVIE Reconstruction Worker

Self-hosted reconstruction worker for HackyTech Vehicle Intelligence Engine. It invokes a local COLMAP binary; it does not call Polycam, Autodesk, or any hosted reconstruction API.

## Modes

- **Default CPU mode:** validates input, extracts/matches features, and runs sparse Structure from Motion (SfM). It writes the COLMAP database and sparse model.
- **Optional dense mode:** pass `--dense` only on a machine with a CUDA-enabled COLMAP build and a compatible NVIDIA GPU. This runs dense MVS, fusion, meshing, simplification, and texture baking. Do not assume ordinary Render web-service compute supports this.

The worker deliberately does not start dense processing by default. This avoids pretending a CPU-only machine can complete COLMAP PatchMatch dense stereo.

## Requirements

- Python 3.11+
- COLMAP installed and available on PATH
- Sufficient RAM and disk; requirements scale with image resolution and count

## Run

```bash
python3 reconstruct.py --images /private/capture/images --output /private/job-output
python3 reconstruct.py --images /private/capture/images --output /private/job-output --dense
```

Input accepts JPG, JPEG, and PNG. Twelve images is only a basic intake guard, not a guarantee of coverage or reconstruction success. Capture the same stationary vehicle with overlapping viewpoints, sharp focus, stable lighting, and visible texture. Avoid moving people/vehicles in the background where possible.

## Outputs

- `job-report.json`: machine-readable status and stage results
- `worker.log`: command log
- `database.db` and `sparse/`: SfM outputs
- Dense mode additionally writes `dense/fused.ply`, meshes, and textured OBJ/MTL/texture outputs if each stage succeeds

OBJ is not GLB. The worker does not currently export GLB/glTF, separate body panels, identify part boundaries, or rig moving parts.

## Reproducible checks

The Dockerfile and GitHub Actions workflow use Ubuntu 24.04 packages to install COLMAP and Python, compile the worker, and run unit tests. Ubuntu package repositories can update over time; for bit-for-bit reproducible production images, pin the base image digest and package versions after a successful validated build.

## Security boundary

Do not expose this CLI directly to the public internet. A future trusted job runner must authenticate staff, authorize the tenant, stage files in private storage, create isolated job directories, and invoke the worker with controlled paths. Never accept arbitrary shell commands or user-selected executable paths.
