@echo off
echo ========================================================
echo Pushing AuraStore Mini Checkout to GitHub
echo Remote: https://github.com/Tamanna154/mini-checkout-test-suite
echo ========================================================
"D:\git\cmd\git.exe" push -u origin main
if %errorlevel% neq 0 (
    echo.
    echo [TIP] If asked for credentials, provide your GitHub Personal Access Token (PAT).
    echo Or run: D:\git\cmd\git.exe push https://YOUR_TOKEN@github.com/Tamanna154/mini-checkout-test-suite.git main
)
echo.
pause
