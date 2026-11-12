# HVIE Reconstruction Worker

This directory contains the first self-hosted reconstruction worker for the HackyTech Vehicle Intelligence Engine.

## Current scope

- Runs locally against a staged image directory.
- Invokes a local COLMAP executable; it does not call a hosted reconstruction API.
- Produces sparse/dense reconstruction artifacts, a surface mesh, and (when successful) a textured OBJ.
- Writes a JSON stage report and a command log.
- Defaults to CPU feature extraction/matching for broad compatibility. Set HVIE_USE_GPU=1 only on a machine with a correctly configured COLMAP CUDA build and compatible GPU.

## Requirements

- Python 3.11+
- COLMAP installed and available as colmap on PATH
- Adequate RAM and free disk space; dense reconstruction is compute- and memory-intensive

This worker is intentionally not wired to Render's web service. Ordinary web-service instances are not assumed to have a GPU or enough resources for dense photogrammetry. A separate worker host must be selected after measuring actual resource requirements and cost.

## Run

    python reconstruct.py --images /path/to/capture/images --output /path/to/private/job-output

Accepted input formats: JPG, JPEG, PNG. The worker requires at least 12 images as a basic intake guard, but this is not a guarantee of sufficient coverage or successful reconstruction. Images should show the same stationary vehicle from overlapping viewpoints, with consistent lighting and sharp focus.

## Output

- job-report.json — status and output paths for each stage
- worker.log — exact commands and output
- database.db, sparse/, dense/
- dense/fused.ply
- dense/meshed-poisson.ply
- dense/textured.obj and associated material/texture files, if texturing succeeds

The worker does not currently create GLB/glTF, separate body panels, identify component boundaries, or rig moving parts. Those are later milestones.

## Security boundary

Do not expose this CLI directly to the public internet. A future trusted job runner must authenticate the requesting staff member, authorize the tenant, stage files in private storage, generate isolated job directories, and invoke this worker with controlled paths. Do not accept arbitrary shell commands or user-selected executable paths.
