#!/usr/bin/env python3
"""Self-hosted COLMAP pipeline for HVIE. No hosted reconstruction API is used."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

SUPPORTED = {".jpg", ".jpeg", ".png"}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def discover_images(folder: Path) -> list[Path]:
    if not folder.is_dir():
        raise ValueError(f"Image directory does not exist: {folder}")
    images = sorted(
        path for path in folder.iterdir()
        if path.is_file() and path.suffix.lower() in SUPPORTED
    )
    if len(images) < 12:
        raise ValueError(
            f"At least 12 JPG/JPEG/PNG images are required for this initial "
            f"intake guard; found {len(images)}. This is not a guarantee of coverage."
        )
    too_small = [path.name for path in images if path.stat().st_size < 10_000]
    if too_small:
        raise ValueError(f"Images appear too small or empty (<10 KB): {too_small[:10]}")
    hashes: dict[str, str] = {}
    duplicates: list[str] = []
    for path in images:
        digest = sha256(path)
        if digest in hashes:
            duplicates.append(f"{path.name} duplicates {hashes[digest]}")
        else:
            hashes[digest] = path.name
    if duplicates:
        raise ValueError("Duplicate images detected: " + "; ".join(duplicates[:10]))
    return images


class Pipeline:
    def __init__(self, images: Path, output: Path, colmap: str, run_dense: bool):
        self.images = images.resolve()
        self.output = output.resolve()
        self.colmap = colmap
        self.run_dense = run_dense
        self.log_path = self.output / "worker.log"
        self.report = {
            "engine": "HackyTech Vehicle Intelligence Engine",
            "worker_version": "0.1.0",
            "reconstruction_backend": "local-colmap-cli",
            "external_reconstruction_api": False,
            "started_at": utc_now(),
            "finished_at": None,
            "status": "running",
            "input": {"image_count": 0, "formats": sorted(SUPPORTED)},
            "stages": [],
            "outputs": {},
            "limitations": [
                "Photogrammetry reconstructs visible surfaces only.",
                "Reflective paint, glass, low-texture panels, occlusion, and unphotographed surfaces can reduce quality.",
                "A fused mesh is not automatically separated into doors, bonnet, boot, wheels, or other editable parts.",
                "This worker does not currently export GLB/glTF or rig articulated components."
            ],
            "error": None,
        }

    def log(self, message: str) -> None:
        line = f"[{utc_now()}] {message}"
        print(line, flush=True)
        with self.log_path.open("a", encoding="utf-8") as handle:
            handle.write(line + "\n")

    def run_stage(self, name: str, args: list[str], expected: list[Path] | None = None) -> None:
        started = time.monotonic()
        self.log(f"START {name}: {' '.join(args)}")
        try:
            with self.log_path.open("a", encoding="utf-8") as log_handle:
                result = subprocess.run(
                    args,
                    stdout=log_handle,
                    stderr=subprocess.STDOUT,
                    check=False,
                    text=True,
                )
            if result.returncode != 0:
                raise RuntimeError(f"{name} exited with code {result.returncode}")
            missing = [str(path) for path in (expected or []) if not path.exists()]
            if missing:
                raise RuntimeError(f"{name} completed without expected output(s): {missing}")
            self.report["stages"].append({
                "name": name, "status": "completed",
                "duration_seconds": round(time.monotonic() - started, 2),
            })
            self.log(f"COMPLETE {name}")
        except Exception as exc:
            self.report["stages"].append({
                "name": name, "status": "failed",
                "duration_seconds": round(time.monotonic() - started, 2),
                "error": str(exc),
            })
            raise

    def save_report(self) -> None:
        self.report["finished_at"] = utc_now()
        report_path = self.output / "job-report.json"
        report_path.write_text(json.dumps(self.report, indent=2), encoding="utf-8")

    def execute(self) -> int:
        self.output.mkdir(parents=True, exist_ok=True)
        if shutil.which(self.colmap) is None:
            raise RuntimeError(f"COLMAP executable not found: {self.colmap}")
        images = discover_images(self.images)
        self.report["input"]["image_count"] = len(images)
        self.report["input"]["total_bytes"] = sum(p.stat().st_size for p in images)
        self.log(f"Validated {len(images)} images in {self.images}")

        database = self.output / "database.db"
        sparse = self.output / "sparse"
        dense = self.output / "dense"
        sparse.mkdir(exist_ok=True)
        use_gpu = "1" if os.getenv("HVIE_USE_GPU") == "1" else "0"

        try:
            self.run_stage("feature_extraction", [
                self.colmap, "feature_extractor",
                "--database_path", str(database),
                "--image_path", str(self.images),
                "--FeatureExtraction.use_gpu", use_gpu,
            ], [database])
            self.run_stage("exhaustive_matching", [
                self.colmap, "exhaustive_matcher",
                "--database_path", str(database),
                "--FeatureMatching.use_gpu", use_gpu,
            ])
            self.run_stage("sparse_mapping", [
                self.colmap, "mapper",
                "--database_path", str(database),
                "--image_path", str(self.images),
                "--output_path", str(sparse),
            ], [sparse])
            models = sorted(
                (path for path in sparse.iterdir() if path.is_dir() and path.name.isdigit()),
                key=lambda path: int(path.name),
            )
            if not models:
                raise RuntimeError("COLMAP did not produce a sparse model; check image overlap and texture.")
            model = models[0]
            self.report["outputs"] = {"database": str(database), "sparse_model": str(model)}
            if not self.run_dense:
                self.report["status"] = "sparse_complete"
                self.report["limitations"].append("Dense MVS, meshing, and texturing were not run. Use a CUDA-enabled COLMAP build and compatible NVIDIA GPU, then run with --dense.")
                self.log("Sparse reconstruction completed. Dense stages were not requested.")
                return 0

            dense.mkdir(exist_ok=True)
            self.run_stage("image_undistortion", [
                self.colmap, "image_undistorter",
                "--image_path", str(self.images),
                "--input_path", str(model),
                "--output_path", str(dense),
                "--output_type", "COLMAP",
            ])
            self.run_stage("dense_stereo", [
                self.colmap, "patch_match_stereo",
                "--workspace_path", str(dense),
                "--workspace_format", "COLMAP",
                "--PatchMatchStereo.geom_consistency", "true",
            ])
            fused = dense / "fused.ply"
            self.run_stage("stereo_fusion", [
                self.colmap, "stereo_fusion",
                "--workspace_path", str(dense),
                "--workspace_format", "COLMAP",
                "--input_type", "geometric",
                "--output_path", str(fused),
            ], [fused])
            mesh = dense / "meshed-poisson.ply"
            self.run_stage("poisson_meshing", [
                self.colmap, "poisson_mesher",
                "--input_path", str(fused),
                "--output_path", str(mesh),
            ], [mesh])
            simplified = dense / "meshed-poisson-simplified.ply"
            self.run_stage("mesh_simplification", [
                self.colmap, "mesh_simplifier",
                "--input_path", str(mesh),
                "--output_path", str(simplified),
                "--MeshSimplification.target_face_ratio", "0.25",
            ], [simplified])
            texture_prefix = dense / "textured"
            textured = dense / "textured.obj"
            self.run_stage("mesh_texturing", [
                self.colmap, "mesh_texturer",
                "--workspace_path", str(dense),
                "--input_path", str(simplified),
                "--output_path", str(texture_prefix),
            ], [textured])
            self.report["status"] = "completed"
            self.report["outputs"].update({
                "dense_workspace": str(dense),
                "fused_point_cloud": str(fused),
                "poisson_mesh": str(mesh),
                "simplified_mesh": str(simplified),
                "textured_obj": str(textured),
            })
            self.log("Dense reconstruction and texturing completed. Component segmentation and GLB conversion are not included.")
            return 0
        except Exception as exc:
            self.report["status"] = "failed"
            self.report["error"] = str(exc)
            self.log(f"FAILED: {exc}")
            return 1
        finally:
            self.save_report()


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the local HVIE COLMAP reconstruction pipeline.")
    parser.add_argument("--images", required=True, type=Path, help="Directory containing the staged vehicle images.")
    parser.add_argument("--output", required=True, type=Path, help="Private output directory for this job.")
    parser.add_argument("--colmap", default="colmap", help="COLMAP executable name/path.")
    parser.add_argument("--dense", action="store_true", help="Run CUDA-dependent dense MVS, meshing, and texturing stages.")
    args = parser.parse_args()
    pipeline = Pipeline(args.images, args.output, args.colmap, args.dense)
    try:
        return pipeline.execute()
    except Exception as exc:
        pipeline.report["status"] = "failed"
        pipeline.report["error"] = str(exc)
        pipeline.log(f"FAILED before pipeline start: {exc}")
        pipeline.save_report()
        return 1


if __name__ == "__main__":
    sys.exit(main())
