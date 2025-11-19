import sys
import subprocess
from pathlib import Path
import re
import shutil


def get_rust_target_triple():
    """
    Executes `rustc -vV` to find the host target triple.
    This is essential for naming the backend executable in a way that Tauri can find it.
    """
    try:
        result = subprocess.run(
            ["rustc", "-vV"],
            check=True,
            capture_output=True,
            text=True,
        )
        # Use regex to find the 'host:' line and extract the triple
        match = re.search(r"host: (.*)", result.stdout)
        if match:
            return match.group(1).strip()
        else:
            print("[!] Error: Could not determine Rust target triple.", file=sys.stderr)
            sys.exit(1)
    except (FileNotFoundError, subprocess.CalledProcessError) as e:
        print(f"[!] Error executing 'rustc': {e}", file=sys.stderr)
        print(
            "[*] Please ensure the Rust toolchain is installed and in the system's PATH."
        )
        sys.exit(1)


def build_backend():
    """
    Builds the Python backend, renames the executable to include the Rust target triple,
    and places it in the directory where the Tauri build expects to find it.
    """
    project_root = Path(__file__).parent.resolve()
    api_script = project_root / "api.py"
    dist_dir = project_root / "dist"
    tauri_dist_dir = project_root / "desktop-ui" / "dist"

    if not api_script.exists():
        print(f"[!] Error: Target script {api_script} not found.", file=sys.stderr)
        sys.exit(1)

    # 1. Define the initial executable name based on OS
    if sys.platform == "win32":
        base_executable_name = "api_server.exe"
    elif sys.platform == "darwin":
        base_executable_name = "api_server_macos"
    else:  # Linux
        base_executable_name = "api_server_linux"

    # 2. Build the executable using PyInstaller
    pyinstaller_command = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--onefile",
        "--noconfirm",
        f"--name={base_executable_name}",
        "--hidden-import=uvicorn.logging",
        "--hidden-import=uvicorn.loops.auto",
        "--hidden-import=uvicorn.protocols.http.auto",
        "--hidden-import=uvicorn.protocols.websockets.auto",
        "--hidden-import=uvicorn.lifespan.on",
        str(api_script.name),
    ]

    print(f"[*] Project Root: {project_root}")
    print(f"[*] Executing PyInstaller: {' '.join(pyinstaller_command)}")

    try:
        subprocess.run(
            pyinstaller_command,
            cwd=project_root,
            check=True,
            capture_output=True,
            text=True,
        )
        print("[+] PyInstaller build successful!")
    except subprocess.CalledProcessError as e:
        print("[!] PyInstaller build failed.", file=sys.stderr)
        print(f"[*] STDERR:\n{e.stderr}", file=sys.stderr)
        sys.exit(1)

    # 3. Determine the final executable name with the Rust target triple
    target_triple = get_rust_target_triple()
    final_executable_name = f"api_server-{target_triple}"
    if sys.platform == "win32":
        final_executable_name += ".exe"

    # 4. Rename and move the executable
    source_path = dist_dir / base_executable_name
    dest_path = tauri_dist_dir / final_executable_name

    if not source_path.exists():
        print(
            f"[!] Error: Built executable not found at {source_path}", file=sys.stderr
        )
        sys.exit(1)

    # Ensure the destination directory exists
    tauri_dist_dir.mkdir(exist_ok=True)

    print(f"[*] Renaming and moving '{source_path}' to '{dest_path}'")
    try:
        shutil.move(str(source_path), str(dest_path))
        print("[+] Executable successfully placed for Tauri build.")
    except Exception as e:
        print(f"[!] Error moving executable: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    build_backend()
