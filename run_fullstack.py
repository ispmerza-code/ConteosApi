"""Run backend and frontend development servers at the same time."""

from __future__ import annotations

import shutil
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT_DIR / "conteos-frontend"
CERTS_DIR = FRONTEND_DIR / "certificates"


def get_lan_ip() -> str:
    """Return the primary LAN IPv4 address, or 'localhost' as fallback."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "localhost"


def ensure_certificates(lan_ip: str) -> None:
    """Regenerate mkcert certificates if they are missing or the IP has changed."""
    mkcert = shutil.which("mkcert")
    if not mkcert:
        print("  [AVISO] mkcert no encontrado. El enlace de red puede no funcionar en otros dispositivos.")
        return

    ip_marker = CERTS_DIR / f".ip_{lan_ip}"
    cert_file = CERTS_DIR / "localhost.pem"

    if cert_file.exists() and ip_marker.exists():
        return  # cert already up to date

    CERTS_DIR.mkdir(parents=True, exist_ok=True)

    # Remove old IP markers
    for old in CERTS_DIR.glob(".ip_*"):
        old.unlink(missing_ok=True)

    print(f"  Generando certificado HTTPS para localhost + {lan_ip} ...")
    subprocess.run(
        [mkcert, "-key-file", "localhost-key.pem", "-cert-file", "localhost.pem",
         "localhost", "127.0.0.1", lan_ip],
        cwd=str(CERTS_DIR),
        check=True,
    )
    ip_marker.touch()
    print(f"  Certificado generado. Expira en 2 años.")


def resolve_python_command() -> list[str]:
    venv_python = ROOT_DIR / ".venv" / "Scripts" / "python.exe"
    if venv_python.exists():
        return [str(venv_python)]
    return [sys.executable]


def resolve_npm_command() -> list[str]:
    npm_path = shutil.which("npm") or shutil.which("npm.cmd")
    if not npm_path:
        raise FileNotFoundError(
            "npm was not found in PATH. Install Node.js or open a terminal where npm is available."
        )
    return [npm_path]


def terminate_process(process: subprocess.Popen, name: str) -> None:
    if process.poll() is not None:
        return

    print(f"\nStopping {name}...")
    process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()


def main() -> int:
    if not FRONTEND_DIR.exists():
        print(f"Frontend folder not found: {FRONTEND_DIR}")
        return 1

    lan_ip = get_lan_ip()
    print(f"IP de red detectada: {lan_ip}")
    ensure_certificates(lan_ip)

    backend_cmd = resolve_python_command() + ["run_dev.py"]
    frontend_cmd = resolve_npm_command() + ["run", "dev"]

    print(f"Starting backend: {' '.join(backend_cmd)}")
    backend_process = subprocess.Popen(backend_cmd, cwd=str(ROOT_DIR))

    print(f"Starting frontend: {' '.join(frontend_cmd)}")
    print()
    print("=" * 60)
    print(f"  Frontend local:   https://localhost:3000")
    print(f"  Frontend red:     https://{lan_ip}:3000")
    print(f"  Backend API:      http://{lan_ip}:8000")
    print()
    print("  Primera vez en un dispositivo nuevo:")
    print("  Instala la CA de mkcert para acceso sin advertencias,")
    print("  o acepta la advertencia del navegador manualmente.")
    print("=" * 60)
    print()
    frontend_process = subprocess.Popen(frontend_cmd, cwd=str(FRONTEND_DIR))

    shutdown_requested = False

    def on_signal(signum: int, _frame: object) -> None:
        nonlocal shutdown_requested
        if not shutdown_requested:
            print(f"\nSignal received ({signum}). Shutting down both servers...")
        shutdown_requested = True

    signal.signal(signal.SIGINT, on_signal)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, on_signal)

    exit_code = 0
    try:
        while not shutdown_requested:
            backend_code = backend_process.poll()
            frontend_code = frontend_process.poll()

            if backend_code is not None or frontend_code is not None:
                if backend_code not in (None, 0):
                    print(f"Backend exited with code {backend_code}.")
                    exit_code = backend_code
                if frontend_code not in (None, 0):
                    print(f"Frontend exited with code {frontend_code}.")
                    exit_code = frontend_code
                break

            time.sleep(1)
    finally:
        terminate_process(backend_process, "backend")
        terminate_process(frontend_process, "frontend")

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
