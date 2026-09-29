[CmdletBinding()]
param(
    [string]$OutputDirectory = (Join-Path (Get-Location) 'backups'),
    [string]$DbService = 'db',
    [switch]$IncludeApiState
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'docker was not found in PATH.'
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmssZ')
$dumpPath = Join-Path $OutputDirectory "mo-farm-db-$stamp.dump"
$tempPath = "$dumpPath.tmp"

# Refuse a silent empty backup. The database service must be healthy/running.
$runningServices = @(& docker compose ps --status running --services $DbService 2>$null)
if ($LASTEXITCODE -ne 0 -or -not ($runningServices -contains $DbService)) {
    throw "Service '$DbService' is not running. Start it with: docker compose up -d db"
}

Write-Host "Creating PostgreSQL dump: $dumpPath"
# Encode inside the container so Windows PowerShell 5.1 never performs a text
# conversion on the binary custom-format dump while redirecting stdout.
$encodedLines = & docker compose exec -T $DbService sh -c 'set -eu; tmp=$(mktemp); pg_dump -U $POSTGRES_USER -d $POSTGRES_DB --format=custom --no-owner --no-acl --file=$tmp; base64 $tmp; rm -f $tmp'
if ($LASTEXITCODE -ne 0) {
    throw "pg_dump failed with exit code $LASTEXITCODE."
}
$encoded = (($encodedLines -join '') -replace '\s', '')
if ([string]::IsNullOrWhiteSpace($encoded)) {
    throw 'pg_dump returned no data; refusing to overwrite the backup.'
}
try {
    $bytes = [Convert]::FromBase64String($encoded)
    [IO.File]::WriteAllBytes($tempPath, $bytes)
    Move-Item -LiteralPath $tempPath -Destination $dumpPath -Force
} catch {
    if (Test-Path -LiteralPath $tempPath) { Remove-Item -LiteralPath $tempPath -Force }
    throw "Could not decode backup: $($_.Exception.Message)"
}

$hash = (Get-FileHash -LiteralPath $dumpPath -Algorithm SHA256).Hash
$metadata = [ordered]@{
    createdAtUtc = (Get-Date).ToUniversalTime().ToString('o')
    format = 'postgres-custom'
    service = $DbService
    file = (Split-Path -Leaf $dumpPath)
    sha256 = $hash
}
$metadataPath = [IO.Path]::ChangeExtension($dumpPath, '.json')
$metadataJson = $metadata | ConvertTo-Json
[IO.File]::WriteAllText($metadataPath, $metadataJson, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "SHA-256: $hash"

if ($IncludeApiState) {
    $statePath = Join-Path $OutputDirectory "farm-state-$stamp.json"
    Write-Host "Backing up optional state adapter: $statePath"
    & docker compose cp "api:/data/farm-state.json" $statePath
    if ($LASTEXITCODE -ne 0) {
        if (Test-Path -LiteralPath $statePath) { Remove-Item -LiteralPath $statePath -Force }
        Write-Warning 'farm-state.json is absent; the PostgreSQL dump is still valid.'
    } else {
        $stateHash = (Get-FileHash -LiteralPath $statePath -Algorithm SHA256).Hash
        Write-Host "State SHA-256: $stateHash"
    }
}

Write-Host "Backup complete: $dumpPath"
