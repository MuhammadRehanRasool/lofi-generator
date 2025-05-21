@echo off
REM 1. Create venv if it doesn't exist
if not exist env (
    python -m venv env
)

REM 2. Activate the venv (batch version)
call env\Scripts\activate.bat

REM 3. Install requirements
pip install --upgrade pip
pip install -r requirements.txt

echo.
echo Setup complete! Virtual‐env is ready in .\env\
pause
