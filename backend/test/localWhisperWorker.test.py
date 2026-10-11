import importlib.util
import io
import json
import os
import sys
import tempfile
import unittest
import wave
from pathlib import Path
from unittest.mock import patch


WORKER_PATH = Path(__file__).parents[1] / "src" / "services" / "localWhisperWorker.py"
SPEC = importlib.util.spec_from_file_location("local_whisper_worker", WORKER_PATH)
worker = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(worker)


class LocalWhisperWorkerTests(unittest.TestCase):
    def setUp(self):
        self.cache = tempfile.TemporaryDirectory()
        self.environment = patch.dict(
            os.environ,
            {
                "WHISPER_MODEL": "base",
                "WHISPER_DOWNLOAD_ROOT": self.cache.name,
                "WHISPER_DOWNLOAD_ATTEMPTS": "2",
            },
            clear=False,
        )
        self.environment.start()
        self.addCleanup(self.environment.stop)
        self.addCleanup(self.cache.cleanup)

    def test_transient_download_error_retries_in_the_same_hub_cache(self):
        calls = []

        def download(**kwargs):
            calls.append(kwargs)
            if len(calls) == 1:
                raise ConnectionResetError("connection reset")
            return Path(self.cache.name) / "base-model"

        with patch.object(worker.random, "random", return_value=0):
            model, details = worker.load_model(
                snapshot_downloader=download,
                model_factory=lambda path, **kwargs: (path, kwargs),
                sleep=lambda _delay: None,
            )

        self.assertEqual(len(calls), 2)
        self.assertEqual(calls[0]["cache_dir"], self.cache.name)
        self.assertEqual(calls[0]["repo_id"], "Systran/faster-whisper-base")
        self.assertEqual(model[0], str(Path(self.cache.name) / "base-model"))
        self.assertEqual(details["model"], "base")
        self.assertFalse(details["fallback"])

    def test_repeated_base_download_failure_falls_back_to_multilingual_tiny(self):
        requested_repositories = []

        def download(**kwargs):
            requested_repositories.append(kwargs["repo_id"])
            if kwargs["repo_id"].endswith("-base"):
                raise ConnectionResetError("connection reset")
            return Path(self.cache.name) / "tiny-model"

        with patch.object(worker.random, "random", return_value=0):
            _model, details = worker.load_model(
                snapshot_downloader=download,
                model_factory=lambda path, **kwargs: path,
                sleep=lambda _delay: None,
            )

        self.assertEqual(
            requested_repositories,
            [
                "Systran/faster-whisper-base",
                "Systran/faster-whisper-base",
                "Systran/faster-whisper-tiny",
            ],
        )
        self.assertEqual(details["model"], "tiny")
        self.assertTrue(details["fallback"])

    def test_all_transient_download_failures_are_reported_without_crashing_worker_host(self):
        with patch.object(worker.random, "random", return_value=0):
            with self.assertRaises(worker.ModelDownloadError):
                worker.load_model(
                    snapshot_downloader=lambda **_kwargs: (_ for _ in ()).throw(
                        ConnectionResetError("connection reset")
                    ),
                    model_factory=lambda *_args, **_kwargs: None,
                    sleep=lambda _delay: None,
                )

    def test_english_only_model_is_rejected_for_multilingual_assistant(self):
        with self.assertRaises(ValueError):
            worker.model_fallbacks("base.en")

    def test_invalid_audio_is_rejected_without_calling_model(self):
        class ModelMustNotRun:
            def transcribe(self, *_args, **_kwargs):
                raise AssertionError("Invalid audio must be rejected before inference")

        response = worker.transcribe(
            ModelMustNotRun(),
            {
                "id": 12,
                "language": "en",
                "extension": "wav",
                "audio": "bm90IGFuIGF1ZGlvIGZpbGU=",
            },
        )

        self.assertEqual(response["code"], "STT_INVALID_AUDIO")
        self.assertEqual(response["status"], 422)

    def test_audio_inspection_reports_duration_and_zero_signal_without_audio_content(self):
        silent_audio = Path(self.cache.name) / "silent.wav"
        with wave.open(str(silent_audio), "wb") as recording:
            recording.setnchannels(1)
            recording.setsampwidth(2)
            recording.setframerate(16000)
            recording.writeframes(bytes(16000 * 2))

        details = worker.inspect_audio_file(silent_audio)

        self.assertEqual(details["container"], "wav")
        self.assertAlmostEqual(details["duration_seconds"], 1.0, places=2)
        self.assertEqual(details["rms"], 0.0)
        self.assertEqual(details["peak"], 0.0)

    def test_audio_inspection_detects_non_silent_samples(self):
        audible_audio = Path(self.cache.name) / "audible.wav"
        with wave.open(str(audible_audio), "wb") as recording:
            recording.setnchannels(1)
            recording.setsampwidth(2)
            recording.setframerate(16000)
            recording.writeframes(b"\xff\x3f" * 16000)

        details = worker.inspect_audio_file(audible_audio)

        self.assertAlmostEqual(details["duration_seconds"], 1.0, places=2)
        self.assertGreater(details["rms"], 0.4)
        self.assertGreater(details["peak"], 0.4)

    def test_failed_model_startup_returns_error_to_worker_protocol(self):
        original_stdin, original_stdout, original_argv = sys.stdin, sys.stdout, sys.argv
        output_stream = io.StringIO()
        try:
            sys.stdin = io.StringIO("")
            sys.stdout = output_stream
            sys.argv = ["localWhisperWorker.py"]
            with patch.object(
                worker,
                "load_model",
                side_effect=worker.ModelDownloadError("download unavailable"),
            ):
                self.assertEqual(worker.main(), 1)
        finally:
            sys.stdin, sys.stdout, sys.argv = original_stdin, original_stdout, original_argv

        response = json.loads(output_stream.getvalue())
        self.assertEqual(response["code"], "STT_MODEL_DOWNLOAD_FAILED")

    def test_worker_loads_one_model_for_multiple_requests(self):
        model_token = object()
        transcribed_models = []
        original_stdin, original_stdout, original_argv = sys.stdin, sys.stdout, sys.argv
        output_stream = io.StringIO()
        try:
            sys.stdin = io.StringIO(
                '{"id":1,"language":"en"}\n{"id":2,"language":"bn"}\n'
            )
            sys.stdout = output_stream
            sys.argv = ["localWhisperWorker.py"]
            with patch.object(
                worker,
                "load_model",
                return_value=(model_token, {"model": "base", "requested_model": "base"}),
            ) as load_model:
                with patch.object(
                    worker,
                    "transcribe",
                    side_effect=lambda model, request: (
                        transcribed_models.append(model)
                        or {"id": request["id"], "transcript": "recognized"}
                    ),
                ):
                    self.assertEqual(worker.main(), 0)
            output = [json.loads(line) for line in sys.stdout.getvalue().splitlines()]
        finally:
            sys.stdin, sys.stdout, sys.argv = original_stdin, original_stdout, original_argv

        load_model.assert_called_once()
        self.assertEqual(transcribed_models, [model_token, model_token])
        output = [json.loads(line) for line in output_stream.getvalue().splitlines()]
        self.assertEqual([item["id"] for item in output[1:]], [1, 2])


if __name__ == "__main__":
    unittest.main()
