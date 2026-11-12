import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

MODULE_PATH = Path(__file__).parents[1] / "reconstruct.py"
import sys
sys.path.insert(0, str(MODULE_PATH.parent))
SPEC = importlib.util.spec_from_file_location("hvie_reconstruct", MODULE_PATH)
worker = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(worker)


class IntakeTests(unittest.TestCase):
    def test_rejects_missing_directory(self):
        with self.assertRaises(ValueError):
            worker.discover_images(Path("/path/that/does/not/exist"))

    def test_rejects_too_few_images(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            for i in range(11):
                (folder / f"photo-{i}.jpg").write_bytes(b"x" * 12000)
            with self.assertRaisesRegex(ValueError, "At least 12"):
                worker.discover_images(folder)

    def test_rejects_duplicate_images(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            payload = b"same image bytes" * 1000
            for i in range(12):
                content = payload if i < 2 else payload + str(i).encode()
                (folder / f"photo-{i}.jpg").write_bytes(content)
            with self.assertRaisesRegex(ValueError, "Duplicate images"):
                worker.discover_images(folder)


class PipelineTests(unittest.TestCase):
    def test_cpu_mode_stops_after_sparse_reconstruction(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            images = root / "images"
            output = root / "output"
            images.mkdir()
            for i in range(12):
                (images / f"photo-{i}.jpg").write_bytes((f"unique-photo-{i}" * 1200).encode())
            fake_colmap = root / "colmap"
            fake_colmap.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
            fake_colmap.chmod(0o755)
            pipeline = worker.Pipeline(images, output, str(fake_colmap), False)

            def fake_stage(name, args, expected=None):
                if name == "feature_extraction":
                    Path(args[args.index("--database_path") + 1]).touch()
                if name == "sparse_mapping":
                    sparse = Path(args[args.index("--output_path") + 1])
                    (sparse / "0").mkdir(parents=True, exist_ok=True)
                pipeline.report["stages"].append({"name": name, "status": "completed"})

            with patch.object(pipeline, "run_stage", side_effect=fake_stage):
                self.assertEqual(pipeline.execute(), 0)
            self.assertEqual(pipeline.report["status"], "sparse_complete")
            self.assertEqual([x["name"] for x in pipeline.report["stages"]],
                             ["feature_extraction", "exhaustive_matching", "sparse_mapping"])
            self.assertTrue((output / "job-report.json").exists())



    def test_quality_report_reads_dimensions_and_is_advisory(self):
        from PIL import Image
        from worker_quality import analyze_images
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "vehicle.jpg"
            Image.new("RGB", (1024, 768), (120, 120, 120)).save(path)
            report = analyze_images([path])
            self.assertEqual(report["image_count"], 1)
            self.assertEqual(report["images"][0]["width"], 1024)
            self.assertIn("do not assess camera overlap", report["interpretation"])


if __name__ == "__main__":
    unittest.main()
