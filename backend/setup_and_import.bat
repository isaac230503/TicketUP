@echo off
REM Setup script for TicketUP DB (Postgres 18, port 5433)
REM Usage: run from cmd: setup_and_import.bat [postgres_password]

setlocal

REM Adjust this path if your PostgreSQL is installed in a different folder
set PSQL_EXE="C:\Program Files\PostgreSQL\18\bin\psql.exe"

if not exist %PSQL_EXE% (
  echo ERROR: psql not found at %PSQL_EXE%
  echo Edit this file and set the correct path to psql.exe.
  pause
  exit /b 1
)

echo === TicketUP DB setup helper ===

if "%1"=="" (
  set /p PGPASS=Enter postgres superuser password (input will be visible): 
) else (
  set PGPASS=%1
)

REM Temporarily export password for psql calls
set PGPASSWORD=%PGPASS%

echo Creating role 'ticketup' and database 'ticketup' (if not exists)...
%PSQL_EXE% -U postgres -h localhost -p 5433 -d postgres -c "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ticketup') THEN CREATE ROLE ticketup WITH LOGIN PASSWORD '2305'; END IF; END $$;" 

echo Creating database 'ticketup' (if not exists)...
%PSQL_EXE% -U postgres -h localhost -p 5433 -d postgres -c "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ticketup') THEN CREATE DATABASE ticketup OWNER ticketup; END IF; END $$;"

echo Importing SQL schema and sample data into 'ticketup'...
REM Assumes SQL file is in the repo root one level above this backend folder
set SQL_FILE="%~dp0..\SQL-Ticketup.sql"
if not exist %SQL_FILE% (
  echo ERROR: SQL file not found at %SQL_FILE%
  echo Make sure the file path is correct relative to this script.
  set PGPASSWORD=
  pause
  exit /b 1
)

%PSQL_EXE% -U postgres -h localhost -p 5433 -d ticketup -f %SQL_FILE%

echo Granting privileges to 'ticketup' user...
%PSQL_EXE% -U postgres -h localhost -p 5433 -d ticketup -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ticketup; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ticketup;"

REM Unset the temporary password variable
set PGPASSWORD=

echo === Done. ===
echo Now start the backend (in another terminal):
echo cd "..\backend" && npm install && npm start
pause
