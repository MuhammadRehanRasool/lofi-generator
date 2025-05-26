@echo off
REM 1. Find Python executable
where python >nul 2>nul
if %errorlevel%==0 (
    set "PYTHON_CMD=python"
) else (
    where py >nul 2>nul
    if %errorlevel%==0 (
        set "PYTHON_CMD=py"
    ) else (
        echo Python is not installed.
        pause
        exit /b 1
    )
)

REM 2. Create venv if it doesn't exist
if not exist env (
    %PYTHON_CMD% -m venv env
)

REM 3. Activate the venv (batch version)
call env\Scripts\activate.bat

REM 4. Install requirements
pip install --upgrade pip
pip install -r requirements.txt

echo.
echo Setup complete! Virtual‐env is ready in .\env\
pause
