@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

where docker >nul 2>&1
if errorlevel 1 (
    echo Docker is not installed. 1>&2
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo Docker daemon is not running. Please start Docker Desktop. 1>&2
    exit /b 1
)

docker compose version >nul 2>&1
if not errorlevel 1 (
    set "COMPOSE=docker compose"
) else (
    where docker-compose >nul 2>&1
    if not errorlevel 1 (
        set "COMPOSE=docker-compose"
    ) else (
        echo Docker Compose is not installed. 1>&2
        exit /b 1
    )
)

echo Preparing .\postgres_data...
if not exist "postgres_data" mkdir "postgres_data"

echo Preparing .\uploads...
if not exist "uploads" mkdir "uploads"

echo Loading Docker images...
set "FOUND=0"
for %%F in (images\*.tar.gz images\*.tar) do (
    if exist "%%F" (
        set "FOUND=1"
        echo   -^> Loading %%F...
        docker load -i "%%F"
        if errorlevel 1 exit /b 1
    )
)
if "!FOUND!"=="0" (
    echo No Docker image archives found in .\images. 1>&2
    exit /b 1
)

if not exist ".env" (
    copy /y ".env.example" ".env" >nul
    echo Created .env from .env.example.
)

%COMPOSE% config -q
if errorlevel 1 exit /b 1

echo Installation complete. Run start.bat to start the application.
endlocal

