import base64
import json
import os
import random
import sys
import tempfile
import time
from pathlib import Path

SUPPORTED_LANGUAGES = {"en", "hi", "bn"}
SUPPORTED_EXTENSIONS = {"webm", "ogg", "m4a", "mp3", "wav", "flac"}
MAX_AUDIO_BYTES = 10 * 1024 * 1024
MULTILINGUAL_MODELS = {
    "tiny",
    "base",
    "small",
    "medium",
    "large-v1",
    "large-v2",
    "large-v3",
    "large",
    "large-v3-turbo",
    "turbo",
}
MODEL_FILES = [
    "config.json",
    "preprocessor_config.json",
    "model.bin",
    "tokenizer.json",
    "vocabulary.*",
]


def send_message(message):
    sys.stdout.write(json.dumps(message, ensure_ascii=False) + "\n")
    sys.stdout.flush()


class ModelDownloadError(Exception):
    pass


def model_fallbacks(model_size):
    if model_size not in MULTILINGUAL_MODELS:
        raise ValueError(
            f"Unsupported multilingual Whisper model '{model_size}'. "
            f"Choose one of: {', '.join(sorted(MULTILINGUAL_MODELS))}."
        )
    if model_size == "tiny":
        return ["tiny"]
    if model_size == "base":
        return ["base", "tiny"]
    return [model_size, "base", "tiny"]


def is_transient_download_error(error):
    try:
        from huggingface_hub.errors import HfHubHTTPError
    except ImportError:
        HfHubHTTPError = ()

    try:
        import httpx2 as httpx
    except ImportError:
        try:
            import httpx
        except ImportError:
            httpx = None

    if httpx and isinstance(error, httpx.RequestError):
        return True
    if isinstance(error, (ConnectionError, TimeoutError, OSError)):
        return True
    if HfHubHTTPError and isinstance(error, HfHubHTTPError):
        response = getattr(error, "response", None)
        status = getattr(response, "status_code", 0)
        return status in {408, 425, 429} or status >= 500
    return False


def load_model(snapshot_downloader=None, model_factory=None, sleep=time.sleep):
    os.environ["HF_HUB_DISABLE_XET"] = "1"
    os.environ.setdefault("HF_HUB_DOWNLOAD_TIMEOUT", "60")
    os.environ.setdefault("HF_HUB_ETAG_TIMEOUT", "20")

    if snapshot_downloader is None:
        from huggingface_hub import snapshot_download

        snapshot_downloader = snapshot_download
    if model_factory is None:
        from faster_whisper import WhisperModel

        model_factory = WhisperModel

    requested_model = os.environ.get("WHISPER_MODEL", "tiny").strip().lower()
    candidates = model_fallbacks(requested_model)
    download_root = Path(
        os.environ.get(
            "WHISPER_DOWNLOAD_ROOT",
            str(Path.home() / ".cache" / "scamshield" / "whisper"),
        )
    )
    download_root.mkdir(parents=True, exist_ok=True)
    retries = max(1, min(int(os.environ.get("WHISPER_DOWNLOAD_ATTEMPTS", "5")), 5))
    errors = []

    for candidate_index, model_size in enumerate(candidates):
        repo_id = f"Systran/faster-whisper-{model_size}"
        for attempt in range(1, retries + 1):
            try:
                snapshot_path = snapshot_downloader(
                    repo_id=repo_id,
                    cache_dir=str(download_root),
                    allow_patterns=MODEL_FILES,
                    max_workers=1,
                )
                model = model_factory(
                    str(snapshot_path),
                    device=os.environ.get("WHISPER_DEVICE", "cpu"),
                    compute_type=os.environ.get("WHISPER_COMPUTE_TYPE", "int8"),
                    cpu_threads=int(os.environ.get("WHISPER_CPU_THREADS", "4")),
                    num_workers=1,
                )
                return model, {
                    "requested_model": requested_model,
                    "model": model_size,
                    "fallback": model_size != requested_model,
                }
            except Exception as error:
                errors.append(error)
                if is_transient_download_error(error):
                    if attempt < retries:
                        delay = min(2 ** (attempt - 1), 8) + random.random()
                        print(
                            f"Whisper download for {model_size} failed with "
                            f"{type(error).__name__}; retry {attempt + 1}/{retries} "
                            f"in {delay:.1f}s. Cached partial files are retained.",
                            file=sys.stderr,
                            flush=True,
                        )
                        sleep(delay)
                        continue
                    if candidate_index + 1 < len(candidates):
                        print(
                            f"Whisper {model_size} could not be downloaded after "
                            f"{retries} attempts; trying smaller multilingual model "
                            f"{candidates[candidate_index + 1]}.",
                            file=sys.stderr,
                            flush=True,
                        )
                        break
                    raise ModelDownloadError(
                        "The selected and fallback Whisper models could not be "
                        "downloaded. Check access to huggingface.co and retry later."
                    ) from error
                raise

    raise ModelDownloadError(
        "The selected and fallback Whisper models could not be downloaded."
    ) from errors[-1]


def transcribe(model, request):
    language = request.get("language")
    if language not in SUPPORTED_LANGUAGES:
        return {
            "id": request.get("id"),
            "error": True,
            "status": 400,
            "code": "STT_INVALID_LANGUAGE",
        }

    extension = request.get("extension")
    if extension not in SUPPORTED_EXTENSIONS:
        return {
            "id": request.get("id"),
            "error": True,
            "status": 415,
            "code": "STT_UNSUPPORTED_AUDIO",
        }

    try:
        encoded_audio = request.get("audio", "")
        if not isinstance(encoded_audio, str) or len(encoded_audio) > MAX_AUDIO_BYTES * 4 // 3 + 8:
            raise ValueError("Audio exceeds the configured upload size.")
        audio = base64.b64decode(encoded_audio, validate=True)
    except (ValueError, TypeError):
        audio = b""
    if not audio:
        return {
            "id": request.get("id"),
            "error": True,
            "status": 400,
            "code": "STT_EMPTY_AUDIO",
        }
    if len(audio) > MAX_AUDIO_BYTES:
        return {
            "id": request.get("id"),
            "error": True,
            "status": 413,
            "code": "STT_AUDIO_TOO_LARGE",
        }

    with tempfile.NamedTemporaryFile(suffix=f".{extension}") as audio_file:
        audio_file.write(audio)
        audio_file.flush()
        try:
            audio_details = inspect_audio_file(audio_file.name)
        except Exception as error:
            print(
                f"Whisper audio decode failed bytes={len(audio)} mime={request.get('mimeType', 'unknown')} error={type(error).__name__}.",
                file=sys.stderr,
                flush=True,
            )
            return {
                "id": request.get("id"),
                "error": True,
                "status": 422,
                "code": "STT_INVALID_AUDIO",
            }
        print(
            "Whisper audio decoded "
            f"bytes={len(audio)} mime={request.get('mimeType', 'unknown')} "
            f"container={audio_details['container']} "
            f"duration_s={audio_details['duration_seconds']:.2f} "
            f"rms={audio_details['rms']:.6f} peak={audio_details['peak']:.6f}.",
            file=sys.stderr,
            flush=True,
        )
        if audio_details["peak"] <= 1e-5:
            return {
                "id": request.get("id"),
                "error": True,
                "status": 422,
                "code": "STT_SILENCE",
            }
        try:
            segments, info = model.transcribe(
                audio_file.name,
                language=language,
                task="transcribe",
                beam_size=3,
                condition_on_previous_text=False,
            )
            transcript = " ".join(segment.text.strip() for segment in segments).strip()
            print(
                f"Whisper transcription completed duration_s={audio_details['duration_seconds']:.2f} "
                f"language={language} transcript_chars={len(transcript)} "
                f"detected_language={info.language}.",
                file=sys.stderr,
                flush=True,
            )
        except Exception as error:
            print(
                f"Whisper inference failed bytes={len(audio)} mime={request.get('mimeType', 'unknown')} "
                f"duration_s={audio_details['duration_seconds']:.2f} "
                f"language={language} error={type(error).__name__}.",
                file=sys.stderr,
                flush=True,
            )
            return {
                "id": request.get("id"),
                "error": True,
                "status": 500,
                "code": "STT_TRANSCRIPTION_FAILED",
            }

    return {
        "id": request.get("id"),
        "transcript": transcript[:1201],
    }


def inspect_audio_file(path):
    import av
    import numpy as np

    with av.open(path) as container:
        audio_stream = next(
            (stream for stream in container.streams if stream.type == "audio"),
            None,
        )
        if audio_stream is None:
            raise ValueError("The recording does not contain an audio stream.")

        duration_seconds = (
            container.duration / av.time_base if container.duration is not None else 0.0
        )
        peak = 0.0
        square_sum = 0.0
        sample_count = 0
        decoded_sample_count = 0
        sample_rate = audio_stream.rate or 0
        for frame in container.decode(audio=audio_stream.index):
            values = frame.to_ndarray()
            if np.issubdtype(values.dtype, np.integer):
                limits = np.iinfo(values.dtype)
                values = values.astype(np.float32) / max(abs(limits.min), limits.max)
            else:
                values = values.astype(np.float32, copy=False)
            absolute_values = np.abs(values)
            if absolute_values.size:
                peak = max(peak, float(np.max(absolute_values)))
                square_sum += float(np.sum(np.square(values, dtype=np.float64)))
                sample_count += int(values.size)
                decoded_sample_count += frame.samples
                sample_rate = frame.sample_rate or sample_rate

        if duration_seconds <= 0 and sample_rate > 0:
            duration_seconds = decoded_sample_count / sample_rate
        rms = (square_sum / sample_count) ** 0.5 if sample_count else 0.0
        return {
            "container": container.format.name if container.format else "unknown",
            "duration_seconds": duration_seconds,
            "rms": rms,
            "peak": peak,
            "samples": decoded_sample_count,
        }


def main():
    if sys.argv[1:] == ["--download-only"]:
        try:
            _, model_details = load_model()
        except ModelDownloadError as error:
            print(str(error), file=sys.stderr, flush=True)
            return 1
        except Exception as error:
            print(
                f"Whisper model initialization failed ({type(error).__name__}).",
                file=sys.stderr,
                flush=True,
            )
            return 1
        print(
            f"Whisper model {model_details['model']} is downloaded and ready.",
            flush=True,
        )
        return 0

    try:
        model, model_details = load_model()
    except ModelDownloadError as error:
        print(str(error), file=sys.stderr, flush=True)
        send_message({"type": "startup_error", "code": "STT_MODEL_DOWNLOAD_FAILED"})
        return 1
    except Exception as error:
        print(
            f"Whisper model initialization failed ({type(error).__name__}).",
            file=sys.stderr,
            flush=True,
        )
        send_message({"type": "startup_error", "code": "STT_MODEL_INIT"})
        return 1

    send_message({"type": "ready", **model_details})
    for line in sys.stdin:
        try:
            request = json.loads(line)
            response = transcribe(model, request)
        except Exception as error:
            print(
                f"Whisper transcription failed ({type(error).__name__}).",
                file=sys.stderr,
                flush=True,
            )
            response = {
                "id": None,
                "error": True,
                "status": 500,
                "code": "STT_TRANSCRIPTION_FAILED",
            }
        send_message(response)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
