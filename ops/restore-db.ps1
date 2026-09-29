[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })]
    [string]$InputFile,
    [string]$DbService = 'db',
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

if (-not $Force) {
    throw 'Restore replaces the existing tables. Re-run with -Force only after checking the dump file.'
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'docker was not found in PATH.'
}

$resolved = (Resolve-Path -LiteralPath $InputFile).Path
$runningServices = @(& docker compose ps --status running --services $DbService 2>$null)
if ($LASTEXITCODE -ne 0 -or -not ($runningServices -contains $DbService)) {
    throw "Service '$DbService' is not running. Start it with: docker compose up -d db"
}

$hash = (Get-FileHash -LiteralPath $resolved -Algorithm SHA256).Hash
Write-Host "Restoring $resolved (SHA-256: $hash)"

# Stream base64 text to the container. This avoids binary corruption through
# Windows PowerShell's native-process stdout handling.
$encoded = [Convert]::ToBase64String([IO.File]::ReadAllBytes($resolved))
$encoded | & docker compose exec -T $DbService sh -c 'set -eu; tmp=$(mktemp); base64 -d > $tmp; pg_restore -U $POSTGRES_USER -d $POSTGRES_DB --format=custom --clean --if-exists --no-owner --exit-on-error $tmp; rm -f $tmp'
if ($LASTEXITCODE -ne 0) {
    throw "pg_restore failed with exit code $LASTEXITCODE."
}
Write-Host 'PostgreSQL restore complete.'
Write-Host 'If the API uses the JSON state adapter, restart it to reload state.'
