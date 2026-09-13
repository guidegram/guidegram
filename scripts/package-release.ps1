<#
.SYNOPSIS
    Automated Release Packaging and Cryptographic Attestation for Guidegram.
.DESCRIPTION
    Builds the production portable binary, compresses it into a clean portable archive,
    and computes SHA256 and SHA512 checksums for GitHub Releases.
#>

[CmdletBinding()]
param(
    [string]$Version = "1.8.0",
    [switch]$SkipBuild = $false
)

$ErrorActionPreference = "Stop"
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  Guidegram Portable Release Packaging Pipeline     " -ForegroundColor Cyan
Write-Host "  Version: $Version                                " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

$RootDir = Get-Location
$ReleaseDir = Join-Path $RootDir "release"
$UnpackedDir = Join-Path $ReleaseDir "win-unpacked"
$ArchiveName = "Guidegram-v$Version-Windows-x64-Portable.zip"
$ArchivePath = Join-Path $ReleaseDir $ArchiveName

if (-not $SkipBuild) {
    Write-Host "`n[1/4] Running TypeScript validation and Vite build..." -ForegroundColor Yellow
    pnpm exec tsc --noEmit
    if ($LASTEXITCODE -ne 0) {
        Write-Error "TypeScript check failed."
    }
    pnpm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Vite build failed."
    }

    Write-Host "`n[2/4] Packaging portable Windows x64 directory with electron-builder..." -ForegroundColor Yellow
    pnpm exec electron-builder --win dir
    if ($LASTEXITCODE -ne 0) {
        Write-Error "electron-builder packaging failed."
    }
} else {
    Write-Host "`n[SKIP] Skipping compilation step as requested." -ForegroundColor Gray
}

if (-not (Test-Path $UnpackedDir)) {
    Write-Error "Unpacked directory not found at: $UnpackedDir"
}

Write-Host "`n[3/4] Creating standalone ZIP archive: $ArchiveName..." -ForegroundColor Yellow
if (Test-Path $ArchivePath) {
    Remove-Item -Path $ArchivePath -Force
}

Compress-Archive -Path "$UnpackedDir\*" -DestinationPath $ArchivePath -CompressionLevel Optimal
$ArchiveSizeMB = [math]::Round(((Get-Item $ArchivePath).Length / 1MB), 2)
Write-Host "  -> Archive created: $ArchivePath ($ArchiveSizeMB MB)" -ForegroundColor Green

Write-Host "`n[4/4] Generating cryptographic checksums..." -ForegroundColor Yellow
$Sha256 = (Get-FileHash -Algorithm SHA256 -Path $ArchivePath).Hash.ToLower()
$Sha512 = (Get-FileHash -Algorithm SHA512 -Path $ArchivePath).Hash.ToLower()

$Sha256Line = "$Sha256  $ArchiveName"
$Sha512Line = "$Sha512  $ArchiveName"

Set-Content -Path (Join-Path $ReleaseDir "SHA256SUMS.txt") -Value $Sha256Line -Encoding utf8
Set-Content -Path (Join-Path $ReleaseDir "SHA512SUMS.txt") -Value $Sha512Line -Encoding utf8

Write-Host "  -> SHA256: $Sha256" -ForegroundColor Cyan
Write-Host "  -> Checksum files written to release/SHA256SUMS.txt and release/SHA512SUMS.txt" -ForegroundColor Green

Write-Host "`n====================================================" -ForegroundColor Green
Write-Host "  Packaging Complete! Release assets ready for GitHub" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
