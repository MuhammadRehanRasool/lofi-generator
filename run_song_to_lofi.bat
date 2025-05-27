@echo off
REM Activate the venv
call env\Scripts\activate.bat

REM Run your script
python project.py
if errorlevel 1 (
    echo python failed, trying py...
    py project.py
)

echo.
echo Done!
pause
