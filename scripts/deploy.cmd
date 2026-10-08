@echo off
rem Deploys RISK AI NAVIGATOR with the Databricks CLI direct engine (no Terraform).
rem Works in cmd and the VS Code terminal. Needs only the Databricks CLI.
rem
rem Usage (from the project folder):   scripts\deploy.cmd [cli-profile]
setlocal
cd /d "%~dp0.."

set "CLI_PROFILE=%~1"
if "%CLI_PROFILE%"=="" set "CLI_PROFILE=%DATABRICKS_CONFIG_PROFILE%"
if "%CLI_PROFILE%"=="" set "CLI_PROFILE=DEFAULT"
rem Also set in databricks.yml
set "DATABRICKS_BUNDLE_ENGINE=direct"

if not exist "app-dist\server\dist\index.mjs" goto notbuilt
if not exist "app-dist\client\dist\index.html" goto notbuilt

echo ==^> Databricks CLI version (needs 0.279.0 or newer)
databricks --version || goto failed

echo ==^> Validating bundle (profile %CLI_PROFILE%)
databricks bundle validate -p %CLI_PROFILE% || goto failed

echo ==^> Deploying bundle
databricks bundle deploy -p %CLI_PROFILE% || goto failed

echo ==^> Starting app
databricks bundle run risk_ai_navigator -p %CLI_PROFILE% || goto failed

databricks bundle summary -p %CLI_PROFILE%
echo ==^> Done.
exit /b 0

:notbuilt
echo ERROR: app-dist is not built. Run "node scripts\build-offline.mjs" on a machine with npm/Nexus access.
exit /b 1

:failed
echo ERROR: the step above failed. Fix the error shown and run this script again.
exit /b 1
