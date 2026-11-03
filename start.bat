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

if not exist ".env" (
    echo Missing .env. Run install.bat first. 1>&2
    exit /b 1
)

echo Starting containers...
%COMPOSE% up -d
if errorlevel 1 exit /b 1

echo Waiting for PostgreSQL and Quarkus backend to become ready...
set "STARTED=0"
for /l %%I in (1,1,60) do (
    if "!STARTED!"=="0" (
        %COMPOSE% logs --no-color app 2>nul | findstr /c:"started in" /c:"Listening on:" >nul 2>&1
        if not errorlevel 1 (
            set "STARTED=1"
        ) else (
            timeout /t 2 /nobreak >nul
        )
    )
)

if "!STARTED!"=="0" (
    echo Quarkus did not report a successful startup in time. 1>&2
    %COMPOSE% logs --tail=50 app
    exit /b 1
)

echo Quarkus backend started successfully.
%COMPOSE% ps
endlocal

