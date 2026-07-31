@echo off
setlocal

cd /d "%~dp0"

set PYTHON_EXE=
for %%P in ("py -3.11" "py -3.12" "py -3.10" "python") do (
  if not defined PYTHON_EXE (
    %%~P --version >nul 2>nul
    if not errorlevel 1 set PYTHON_EXE=%%~P
  )
)

if not defined PYTHON_EXE (
  echo Python 3.11+ is recommended and no usable Python launcher was found.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo Creating local vision virtual environment...
  %PYTHON_EXE% -m venv .venv
  if errorlevel 1 (
    echo Failed to create virtual environment.
    pause
    exit /b 1
  )
)

call ".venv\Scripts\activate.bat"
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

echo.
echo Starting KIM Local Vision Server on http://127.0.0.1:8765
echo Keep this window open while using KIM Vision.
echo.
python server.py

pause

