#!/usr/bin/env python3
"""Generate and verify the customer-facing workshop user manual.

The default mode captures the configured online routes, renders the Markdown
from the checked-in template, runs content/image gates, performs the small
failed-route reverse check, and writes a SHA-256 manifest. ``--check-only``
does not access the network or modify files; it verifies the current outputs
against the template, config, and manifest.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import struct
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

try:
    import tomllib
except ModuleNotFoundError as exc:  # pragma: no cover - Python 3.11+ is required.
    raise SystemExit("Python 3.11+ is required for TOML configuration parsing") from exc


ROOT = Path(__file__).resolve().parents[1]
IMAGE_RE = re.compile(r"!\[[^\]]*\]\(([^)\s]+)")
BASE_TOKEN = "{{BASE_URL}}"


class ManualError(RuntimeError):
    """A user-actionable generation or verification failure."""


def resolve_root_path(value: str | Path) -> Path:
    path = Path(value)
    return path if path.is_absolute() else ROOT / path


def relative_to_root(path: Path) -> str:
    return path.resolve().relative_to(ROOT.resolve()).as_posix()


def load_config(config_arg: str) -> tuple[Path, dict]:
    config_path = resolve_root_path(config_arg).resolve()
    if not config_path.is_file():
        raise ManualError(f"config not found: {config_path}")
    with config_path.open("rb") as handle:
        config = tomllib.load(handle)
    return config_path, config


def validate_base_url(config: dict) -> str:
    base_url = str(config.get("base_url", "")).rstrip("/")
    parsed = urlparse(base_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ManualError(f"base_url must be an absolute http(s) URL: {base_url!r}")
    if not config.get("allow_local_url", False) and parsed.hostname in {
        "localhost",
        "127.0.0.1",
        "::1",
    }:
        raise ManualError("local URLs are disabled; use the deployed site in this config")
    return base_url


def render_template(template_path: Path, base_url: str) -> str:
    if not template_path.is_file():
        raise ManualError(f"manual template not found: {template_path}")
    rendered = template_path.read_text(encoding="utf-8").replace(BASE_TOKEN, base_url)
    if BASE_TOKEN in rendered or "{{" in rendered or "}}" in rendered:
        raise ManualError(f"unresolved template token in {template_path}")
    return rendered


def write_if_changed(path: Path, content: str) -> bool:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_file() and path.read_text(encoding="utf-8") == content:
        return False
    path.write_text(content, encoding="utf-8")
    return True


def run_command(command: list[str]) -> None:
    print(f"$ {' '.join(command)}")
    try:
        result = subprocess.run(
            command,
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
    except FileNotFoundError as exc:
        raise ManualError(f"command not found: {command[0]}") from exc
    if result.returncode != 0:
        details = (result.stderr or result.stdout).strip()
        message = f"command failed with exit code {result.returncode}: {command[0]}"
        if details:
            message += f"\n{details[-2000:]}"
        raise ManualError(message)


def _sips_value(path: Path, field: str) -> int | None:
    try:
        result = subprocess.run(
            ["sips", "-g", field, str(path)],
            capture_output=True,
            text=True,
            check=False,
        )
    except FileNotFoundError:
        return None
    if result.returncode != 0:
        return None
    match = re.search(rf"{field}:\s*(\d+)", result.stdout)
    return int(match.group(1)) if match else None


def png_dimensions(path: Path) -> tuple[int, int]:
    width = _sips_value(path, "pixelWidth")
    height = _sips_value(path, "pixelHeight")
    if width is not None and height is not None:
        return width, height

    # Keep the checker usable on non-macOS CI while macOS still uses sips.
    header = path.read_bytes()[:24]
    if header[:8] != b"\x89PNG\r\n\x1a\n" or len(header) < 24:
        raise ManualError(f"not a readable PNG: {path}")
    return struct.unpack(">II", header[16:24])


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def capture_command(config: dict, output: Path, url: str) -> list[str]:
    capture = config["capture"]
    chrome = str(capture["chrome"])
    if not Path(chrome).is_file():
        raise ManualError(f"Chrome binary not found: {chrome}")
    command = [
        chrome,
        "--headless=new",
        "--window-size=%d,%d" % (int(capture["width"]), int(capture["height"])),
        f"--screenshot={output}",
        url,
    ]
    if capture.get("disable_gpu", True):
        command.insert(2, "--disable-gpu")
    if capture.get("hide_scrollbars", True):
        command.insert(3, "--hide-scrollbars")
    return command


def capture_routes(config: dict, base_url: str) -> None:
    for route in config.get("routes", []):
        output = resolve_root_path(route["output"]).resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        url = f"{base_url}{route['path']}"
        print(f"capture {route['name']}: {url}")
        run_command(capture_command(config, output, url))
        print(f"captured: {output.stat().st_size} bytes -> {relative_to_root(output)}")


def reverse_check(config: dict, base_url: str) -> int | None:
    check = config.get("reverse_check", {})
    if not check.get("enabled", True):
        return None
    output = resolve_root_path(str(check["output"])).resolve()
    docs_root = (ROOT / "docs").resolve()
    if output == docs_root or docs_root in output.parents:
        raise ManualError("reverse-check output must not be inside docs/")
    if output.exists():
        output.unlink()
    url = str(check["url"])
    try:
        run_command(capture_command(config, output, url))
        if not output.is_file():
            raise ManualError(f"reverse-check did not produce {output}")
        size = output.stat().st_size
        max_bytes = int(check.get("max_bytes", config.get("min_bytes", 100000)))
        if size >= max_bytes:
            raise ManualError(
                f"reverse-check image is unexpectedly large: {size} >= {max_bytes} bytes"
            )
        print(f"reverse-check: {size} bytes (< {max_bytes})")
        return size
    finally:
        if output.exists():
            output.unlink()


def inspect_image(path: Path, min_bytes: int, capture_config: dict) -> dict:
    if not path.is_file():
        raise ManualError(f"screenshot missing: {path}")
    width, height = png_dimensions(path)
    size = path.stat().st_size
    expected_width = int(capture_config["width"])
    expected_height = int(capture_config["height"])
    if width != expected_width or height != expected_height:
        raise ManualError(
            f"{path}: expected {expected_width}x{expected_height}, got {width}x{height}"
        )
    if size <= min_bytes:
        raise ManualError(f"{path}: {size} bytes is not greater than {min_bytes}")
    return {
        "path": relative_to_root(path),
        "width": width,
        "height": height,
        "bytes": size,
        "sha256": sha256(path),
    }


def referenced_images(manual_path: Path, manual_text: str, config: dict) -> list[str]:
    refs = IMAGE_RE.findall(manual_text)
    if len(refs) < int(config.get("min_image_refs", 8)):
        raise ManualError(
            f"manual has {len(refs)} image references; minimum is {config.get('min_image_refs', 8)}"
        )
    for ref in refs:
        if ref.startswith(("/", "http://", "https://", "file:")) or ".." in Path(ref).parts:
            raise ManualError(f"image reference must be relative: {ref}")
        if not ref.startswith(str(config.get("screenshot_prefix", "screenshots/"))):
            raise ManualError(f"image reference is outside screenshot directory: {ref}")
        target = (manual_path.parent / ref).resolve()
        try:
            target.relative_to(ROOT.resolve())
        except ValueError as exc:
            raise ManualError(f"image reference escapes repository: {ref}") from exc
        if not target.is_file():
            raise ManualError(f"image reference does not exist: {ref}")
    return refs


def content_gate_results(manual_text: str, config: dict) -> dict[str, int]:
    results: dict[str, int] = {}
    flags = re.MULTILINE
    for gate in config.get("content_gates", []):
        pattern = str(gate["pattern"])
        if pattern == BASE_TOKEN:
            pattern = re.escape(validate_base_url(config))
        try:
            count = len(re.findall(pattern, manual_text, flags))
        except re.error as exc:
            raise ManualError(f"invalid content gate regex {pattern!r}: {exc}") from exc
        minimum = int(gate["min"])
        results[str(gate["name"])] = count
        if count < minimum:
            raise ManualError(f"content gate {gate['name']}: {count} < {minimum}")
    lowered = manual_text.lower()
    for term in config.get("forbidden_terms", []):
        if str(term).lower() in lowered:
            raise ManualError(f"forbidden/internal term in manual: {term}")
    return results


def validate_outputs(
    config: dict, base_url: str, manual_path: Path, capture_config: dict
) -> tuple[dict, list[dict], dict[str, int]]:
    if not manual_path.is_file():
        raise ManualError(f"manual not found: {manual_path}")
    manual_text = manual_path.read_text(encoding="utf-8")
    refs = referenced_images(manual_path, manual_text, config)
    gates = content_gate_results(manual_text, config)

    route_infos: list[dict] = []
    for route in config.get("routes", []):
        image = inspect_image(
            resolve_root_path(route["output"]).resolve(),
            int(config["min_bytes"]),
            capture_config,
        )
        image.update({"name": route["name"], "url": f"{base_url}{route['path']}"})
        expected_ref = Path(route["output"]).resolve().relative_to(manual_path.parent.resolve()).as_posix()
        if expected_ref not in refs:
            raise ManualError(f"configured screenshot is not referenced by manual: {expected_ref}")
        route_infos.append(image)

    manual_info = {
        "path": relative_to_root(manual_path),
        "bytes": manual_path.stat().st_size,
        "sha256": sha256(manual_path),
    }
    return manual_info, route_infos, gates


def build_manifest(
    config_path: Path,
    template_path: Path,
    config: dict,
    base_url: str,
    manual: dict,
    images: list[dict],
    gates: dict,
    reverse_bytes: int | None,
) -> dict:
    capture = config["capture"]
    return {
        "schema_version": 1,
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "config": relative_to_root(config_path),
        "base_url": base_url,
        "viewport": {"width": int(capture["width"]), "height": int(capture["height"])},
        "inputs": {
            "config": {
                "path": relative_to_root(config_path),
                "bytes": config_path.stat().st_size,
                "sha256": sha256(config_path),
            },
            "template": {
                "path": relative_to_root(template_path),
                "bytes": template_path.stat().st_size,
                "sha256": sha256(template_path),
            },
        },
        "manual": manual,
        "screenshots": images,
        "checks": {
            "content_gates": gates,
            "reverse_check_bytes": reverse_bytes,
            "visual_review": "required_after_capture",
        },
    }


def verify_manifest(manifest_path: Path, expected: dict) -> None:
    if not manifest_path.is_file():
        raise ManualError(f"manifest missing: {manifest_path}; run capture mode first")
    try:
        actual = json.loads(manifest_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ManualError(f"invalid manifest JSON: {manifest_path}") from exc
    for key in (
        "schema_version",
        "config",
        "base_url",
        "viewport",
        "inputs",
        "manual",
        "screenshots",
    ):
        if actual.get(key) != expected.get(key):
            raise ManualError(f"manifest mismatch at {key}; rerun capture mode")
    print(f"manifest verified: {manifest_path}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", default="configs/user_manual.toml")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check-only", action="store_true", help="verify outputs without network or writes")
    mode.add_argument("--capture", action="store_true", help="capture online routes (the default)")
    args = parser.parse_args()

    try:
        config_path, config = load_config(args.config)
        base_url = validate_base_url(config)
        capture_config = config["capture"]
        manual_path = resolve_root_path(config["manual"]).resolve()
        template_path = resolve_root_path(config["template"]).resolve()
        manifest_path = resolve_root_path(config["manifest"]).resolve()
        expected_manual = render_template(template_path, base_url)

        if args.check_only:
            if not manual_path.is_file() or manual_path.read_text(encoding="utf-8") != expected_manual:
                raise ManualError("manual differs from the configured template; regenerate it first")
        else:
            changed = write_if_changed(manual_path, expected_manual)
            print(f"manual: {'updated' if changed else 'unchanged'} {relative_to_root(manual_path)}")
            capture_routes(config, base_url)

        manual_info, image_infos, gates = validate_outputs(
            config, base_url, manual_path, capture_config
        )
        reverse_bytes = None
        if not args.check_only:
            reverse_bytes = reverse_check(config, base_url)
            manifest = build_manifest(
                config_path,
                template_path,
                config,
                base_url,
                manual_info,
                image_infos,
                gates,
                reverse_bytes,
            )
            manifest_path.parent.mkdir(parents=True, exist_ok=True)
            manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"manifest: wrote {relative_to_root(manifest_path)}")
        else:
            expected_manifest = build_manifest(
                config_path,
                template_path,
                config,
                base_url,
                manual_info,
                image_infos,
                gates,
                None,
            )
            verify_manifest(manifest_path, expected_manifest)

        print(
            f"PASS: manual={manual_info['path']} images={len(image_infos)} "
            f"refs={sum(1 for _ in IMAGE_RE.finditer(expected_manual))} "
            f"viewport={config['capture']['width']}x{config['capture']['height']}"
        )
        return 0
    except ManualError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
