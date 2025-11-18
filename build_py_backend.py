import sys
import subprocess
from pathlib import Path


def build_backend():
    """
    Uses the PyInstaller command-line tool via subprocess to build the Python backend.
    This approach is more robust in controlled environments like CI/CD.
    """
    project_root = Path(__file__).parent.resolve()
    api_script = project_root / "api.py"

    if not api_script.exists():
        print(f"[!] Error: Target script {api_script} not found.", file=sys.stderr)
        sys.exit(1)

    # Unify executable name for consistency
    executable_name = "api_server"

    # Define PyInstaller command as a list of arguments
    command = [
        # Use sys.executable to ensure we're using the correct Python interpreter's pyinstaller
        sys.executable,
        "-m",
        "PyInstaller",
        "--onefile",
        "--noconfirm",
        f"--name={executable_name}",
        # Add hidden imports that PyInstaller might miss
        "--hidden-import=uvicorn.logging",
        "--hidden-import=uvicorn.loops.auto",
        "--hidden-import=uvicorn.protocols.http.auto",
        "--hidden-import=uvicorn.protocols.websockets.auto",
        "--hidden-import=uvicorn.lifespan.on",
        str(api_script.name),  # Pass only the script name, as we'll set the CWD
    ]

    print(f"[*] Project Root: {project_root}")
    print(f"[*] Executing command: {' '.join(command)}")

    try:
        # Execute the command with the working directory set to the project root
        process = subprocess.run(
            command,
            cwd=project_root,  # This is the crucial fix
            check=True,  # Raise an exception if the command fails
            capture_output=True,  # Capture stdout/stderr
            text=True,  # Decode stdout/stderr as text
        )
        print("[+] PyInstaller build successful!")
        print(process.stdout)  # Print the output from PyInstaller

        # Verify the executable was created, accounting for .exe on Windows
        dist_path = project_root / "dist"

        # PyInstaller adds .exe on Windows automatically
        if sys.platform == "win32":
            executable_path = dist_path / f"{executable_name}.exe"
        else:
            executable_path = dist_path / executable_name

        if executable_path.exists():
            print(f"[*] Executable created at: {executable_path}")
        else:
            print(
                f"[!] Error: Executable not found at {executable_path} after build.",
                file=sys.stderr,
            )
            # Also list contents of dist/ to help debug
            if dist_path.exists():
                print("[*] Contents of dist/:", file=sys.stderr)
                for item in dist_path.iterdir():
                    print(f"  - {item.name}", file=sys.stderr)
            print(process.stderr, file=sys.stderr)
            sys.exit(1)

    except subprocess.CalledProcessError as e:
        print("[!] PyInstaller build failed.", file=sys.stderr)
        print(f"[*] Return Code: {e.returncode}", file=sys.stderr)
        print(f"[*] STDOUT:\n{e.stdout}", file=sys.stderr)
        print(f"[*] STDERR:\n{e.stderr}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"[!] An unexpected error occurred: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    build_backend()
