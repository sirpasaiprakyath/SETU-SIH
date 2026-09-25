import os
import sys
import subprocess
import time
import signal

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

def run():
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace', line_buffering=True)
        sys.stderr.reconfigure(encoding='utf-8', errors='replace', line_buffering=True)
    except Exception:
        pass
    print("=" * 60, flush=True)
    print("SETU (सेतु) — SIH26186 Personnel Welfare Monitoring System", flush=True)
    print("Team: Guardian Minds | MHA CAPF Platform", flush=True)
    print("=" * 60, flush=True)
    
    # Start Backend
    print("[1/2] Starting FastAPI Backend on http://localhost:8000...", flush=True)
    backend_proc = subprocess.Popen(
        [sys.executable, "-u", "main.py"],
        cwd=BACKEND_DIR
    )

    # Give backend a moment to boot
    time.sleep(2)
    if backend_proc.poll() is not None:
        print("[ERROR] Backend process terminated immediately! Make sure dependencies are installed (cd backend && pip install -r requirements.txt)", flush=True)

    # Start Frontend
    print("[2/2] Starting Vite Frontend on http://localhost:5173...", flush=True)
    shell_flag = sys.platform == "win32"
    frontend_proc = subprocess.Popen(
        "npm run dev",
        cwd=FRONTEND_DIR,
        shell=shell_flag
    )
    time.sleep(2)
    if frontend_proc.poll() is not None:
        print("[ERROR] Frontend process failed to start! Make sure Node/npm are installed and run 'cd frontend && npm install'", flush=True)

    print("\n" + "=" * 60)
    print("APPLICATION IS RUNNING!")
    print("• Frontend: http://localhost:5173")
    print("• Backend API: http://localhost:8000")
    print("• API Docs (Swagger): http://localhost:8000/docs")
    print("-" * 60)
    print("DEMO CREDENTIALS (Password: Password@123):")
    print("  • Personnel (Flagged): personnel_demo")
    print("  • Personnel (Calm):    personnel_calm")
    print("  • NCO / Section Cdr:  nco_demo")
    print("  • Medical Officer:    doctor_demo")
    print("  • Welfare Officer:    welfare_demo")
    print("  • Sector Command:     command_demo")
    print("  • MHA Admin:          admin_demo")
    print("=" * 60)
    print("Press CTRL+C in this terminal to stop both servers.\n")

    def shutdown(sig, frame):
        print("\nShutting down SETU services...")
        backend_proc.terminate()
        frontend_proc.terminate()
        try:
            backend_proc.wait(timeout=3)
            frontend_proc.wait(timeout=3)
        except Exception:
            backend_proc.kill()
            frontend_proc.kill()
        print("Done.")
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        shutdown(None, None)

if __name__ == "__main__":
    run()
