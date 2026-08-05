[CmdletBinding()]
param(
  [switch]$SkipInstall,
  [switch]$SkipChecks
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectRoot = [System.IO.Path]::GetFullPath($PSScriptRoot)
$LauncherRoot = Join-Path $ProjectRoot 'launcher'
$WebRoot = Join-Path $LauncherRoot 'web'
$DistRoot = Join-Path $ProjectRoot 'dist'
$ReleaseRoot = Join-Path $ProjectRoot 'release'
$StageRoot = Join-Path $ReleaseRoot 'dev-toolbox-windows-amd64'
$ZipPath = Join-Path $ReleaseRoot 'dev-toolbox-windows-amd64.zip'
$GoCache = Join-Path $ProjectRoot '.cache\go-build'

function Assert-ProjectChildPath {
  param([Parameter(Mandatory)][string]$Path)

  $resolved = [System.IO.Path]::GetFullPath($Path)
  $prefix = $ProjectRoot.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
  if (-not $resolved.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to operate outside the project root: $resolved"
  }
  return $resolved
}

function Assert-CommandAvailable {
  param([Parameter(Mandatory)][string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required build command '$Name' is not installed or not on PATH."
  }
}

function Invoke-NativeCommand {
  param(
    [Parameter(Mandatory)][string]$Command,
    [string[]]$Arguments = @(),
    [Parameter(Mandatory)][string]$WorkingDirectory
  )

  Write-Host "> $Command $($Arguments -join ' ')"
  Push-Location $WorkingDirectory
  try {
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "Command failed with exit code $LASTEXITCODE`: $Command $($Arguments -join ' ')"
    }
  }
  finally {
    Pop-Location
  }
}

function Reset-GeneratedDirectory {
  param([Parameter(Mandatory)][string]$Path)

  $safePath = Assert-ProjectChildPath $Path
  if (Test-Path -LiteralPath $safePath) {
    Remove-Item -LiteralPath $safePath -Recurse -Force
  }
  New-Item -ItemType Directory -Path $safePath -Force | Out-Null
}

function Clear-WebStaging {
  $safeWebRoot = Assert-ProjectChildPath $WebRoot
  New-Item -ItemType Directory -Path $safeWebRoot -Force | Out-Null
  foreach ($item in Get-ChildItem -LiteralPath $safeWebRoot -Force) {
    if ($item.Name -eq '.placeholder') {
      continue
    }
    $safeItem = Assert-ProjectChildPath $item.FullName
    Remove-Item -LiteralPath $safeItem -Recurse -Force
  }
}

try {
  Write-Host 'Checking the build environment...'
  foreach ($command in @('node', 'npm', 'go', 'gofmt')) {
    Assert-CommandAvailable $command
  }
  foreach ($requiredPath in @(
    (Join-Path $ProjectRoot 'package.json'),
    (Join-Path $ProjectRoot 'package-lock.json'),
    (Join-Path $LauncherRoot 'go.mod'),
    (Join-Path $ProjectRoot 'public\toolbox.config.json'),
    (Join-Path $ProjectRoot 'packaging\README-PORTABLE.txt')
  )) {
    if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
      throw "Required project file is missing: $requiredPath"
    }
  }

  $nodeVersion = (& node --version).Trim()
  if ($LASTEXITCODE -ne 0 -or $nodeVersion -notmatch '^v(?<major>\d+)') {
    throw "Unable to parse the Node.js version: $nodeVersion"
  }
  if ([int]$Matches.major -lt 20) {
    throw "Node.js 20 or newer is required; found $nodeVersion"
  }

  $goVersion = (& go version).Trim()
  if ($LASTEXITCODE -ne 0 -or $goVersion -notmatch 'go(?<major>\d+)\.(?<minor>\d+)') {
    throw "Unable to parse the Go version: $goVersion"
  }
  if ([int]$Matches.major -lt 1 -or ([int]$Matches.major -eq 1 -and [int]$Matches.minor -lt 22)) {
    throw "Go 1.22 or newer is required; found $goVersion"
  }

  New-Item -ItemType Directory -Path $GoCache -Force | Out-Null
  $previousGoCache = $env:GOCACHE
  $previousGoOS = $env:GOOS
  $previousGoArch = $env:GOARCH
  $previousCgoEnabled = $env:CGO_ENABLED

  try {
    $env:GOCACHE = $GoCache

    if (-not $SkipInstall) {
      Invoke-NativeCommand -Command 'npm' -Arguments @('ci') -WorkingDirectory $ProjectRoot
    }
    if (-not $SkipChecks) {
      Invoke-NativeCommand -Command 'npm' -Arguments @('run', 'lint') -WorkingDirectory $ProjectRoot
      Invoke-NativeCommand -Command 'npm' -Arguments @('run', 'typecheck') -WorkingDirectory $ProjectRoot
      Invoke-NativeCommand -Command 'npm' -Arguments @('test') -WorkingDirectory $ProjectRoot
    }
    Invoke-NativeCommand -Command 'npm' -Arguments @('run', 'build') -WorkingDirectory $ProjectRoot

    if (-not (Test-Path -LiteralPath (Join-Path $DistRoot 'index.html') -PathType Leaf) -or
        -not (Test-Path -LiteralPath (Join-Path $DistRoot 'toolbox.config.json') -PathType Leaf)) {
      throw 'The frontend build did not produce dist/index.html and dist/toolbox.config.json.'
    }

    Write-Host 'Staging frontend assets...'
    Clear-WebStaging
    Copy-Item -Path (Join-Path $DistRoot '*') -Destination $WebRoot -Recurse -Force

    if (-not $SkipChecks) {
      $goFiles = @(Get-ChildItem -LiteralPath $LauncherRoot -Filter '*.go' -File | ForEach-Object { $_.FullName })
      $unformatted = @(& gofmt -l @goFiles)
      if ($LASTEXITCODE -ne 0) {
        throw 'The gofmt check failed to run.'
      }
      if ($unformatted.Count -gt 0) {
        throw "The following Go files are not formatted: $($unformatted -join ', ')"
      }
      Invoke-NativeCommand -Command 'go' -Arguments @('test', './...') -WorkingDirectory $LauncherRoot
      Invoke-NativeCommand -Command 'go' -Arguments @('vet', './...') -WorkingDirectory $LauncherRoot
    }

    Write-Host 'Building the Windows AMD64 launcher...'
    Reset-GeneratedDirectory $ReleaseRoot
    New-Item -ItemType Directory -Path $StageRoot -Force | Out-Null
    $env:GOOS = 'windows'
    $env:GOARCH = 'amd64'
    $env:CGO_ENABLED = '0'
    $ExecutablePath = Join-Path $StageRoot 'dev-toolbox.exe'
    Invoke-NativeCommand -Command 'go' -Arguments @('build', '-trimpath', '-ldflags=-s -w', '-o', $ExecutablePath, '.') -WorkingDirectory $LauncherRoot

    Copy-Item -LiteralPath (Join-Path $ProjectRoot 'public\toolbox.config.json') -Destination (Join-Path $StageRoot 'toolbox.config.json') -Force
    Copy-Item -LiteralPath (Join-Path $ProjectRoot 'packaging\README-PORTABLE.txt') -Destination (Join-Path $StageRoot 'README.txt') -Force

    Write-Host 'Creating the portable release archive...'
    Compress-Archive -Path (Join-Path $StageRoot '*') -DestinationPath $ZipPath -CompressionLevel Optimal -Force
    if (-not (Test-Path -LiteralPath $ZipPath -PathType Leaf)) {
      throw "The release archive was not created: $ZipPath"
    }

    Write-Host "Release created: $ZipPath" -ForegroundColor Green
  }
  finally {
    $env:GOCACHE = $previousGoCache
    $env:GOOS = $previousGoOS
    $env:GOARCH = $previousGoArch
    $env:CGO_ENABLED = $previousCgoEnabled
  }
}
catch {
  Write-Error "Release failed: $($_.Exception.Message)"
  exit 1
}
