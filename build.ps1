<#
.SYNOPSIS
    Builds mazzaella.com: exports content-org/pages.org to Markdown with
    ox-hugo, then renders the site with Hugo.

.DESCRIPTION
    Runs Emacs in batch mode, so you do not need to open Emacs or load your
    Doom config. It loads only org, tomelr, and ox-hugo from the packages Doom
    already installed, exports every subtree in pages.org to content/posts/,
    then runs Hugo.

    Safe to double-click in Explorer. When launched that way the window stays
    open at the end so you can read the output, whether or not it succeeded.

.PARAMETER Serve
    Start the Hugo dev server with drafts at http://localhost:1313 instead of
    building into public/. The server rebuilds HTML on save, but it does not
    re-run the Org export -- re-run this script after editing pages.org.

.PARAMETER NoExport
    Skip the Org export and only run Hugo.

.PARAMETER Clean
    Delete public/ and resources/_gen/ before building.

.PARAMETER Pause
    Always wait for a keypress before exiting, even when run from a terminal.

.EXAMPLE
    .\build.ps1
    Export the Org file and build the site into public/.

.EXAMPLE
    .\build.ps1 -Serve
    Export the Org file and open a live preview server.
#>

[CmdletBinding()]
param(
    [switch]$Serve,
    [switch]$NoExport,
    [switch]$Clean,
    [switch]$Pause
)

$ErrorActionPreference = 'Stop'

$Root    = $PSScriptRoot
$OrgFile = Join-Path $Root 'content-org\pages.org'

function Write-Step($Message) {
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Assert-Command($Name, $Hint) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "'$Name' was not found on PATH. $Hint"
    }
}

# True when Explorer started this script (double-click), in which case the
# console window disappears the instant the script ends unless we hold it open.
function Test-LaunchedFromExplorer {
    try {
        $parentId   = (Get-CimInstance Win32_Process -Filter "ProcessId=$PID" -ErrorAction Stop).ParentProcessId
        $parentName = (Get-Process -Id $parentId -ErrorAction Stop).ProcessName
        return $parentName -in @('explorer', 'dllhost')
    }
    catch {
        return $false
    }
}

# Native tools here (emacs, hugo) report progress on stderr. Under Windows
# PowerShell 5.1, '2>&1' combined with $ErrorActionPreference = 'Stop' turns
# each of those lines into a terminating error, so relax the preference for the
# duration of the call and judge success by the exit code instead.
function Invoke-Native($Exe, $Arguments, $Indent = '    ') {
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & $Exe @Arguments 2>&1 | ForEach-Object { Write-Host "$Indent$_" }
    }
    finally {
        $ErrorActionPreference = $previous
    }
    return $LASTEXITCODE
}

# ox-hugo needs org, tomelr, and ox-hugo on the Emacs load-path. Doom installs
# these under .local/straight/build-<emacs-version>/, and the version in that
# directory name changes whenever Doom is rebuilt on a new Emacs. Discover the
# directories rather than hard-coding a path, and fall back to .local/elpa/.
function Get-OxHugoLoadPaths {
    $emacsDir = Join-Path $env:USERPROFILE '.emacs.d\.local'
    $packages = @('org', 'tomelr', 'ox-hugo')
    $paths    = @()

    foreach ($pkg in $packages) {
        $candidates = @()

        $straight = Join-Path $emacsDir 'straight'
        if (Test-Path $straight) {
            # Newest build-* directory first, so a rebuilt Doom wins.
            $candidates += Get-ChildItem -Path $straight -Directory -Filter 'build-*' |
                Sort-Object Name -Descending |
                ForEach-Object { Join-Path $_.FullName $pkg } |
                Where-Object { Test-Path $_ }
        }

        $elpa = Join-Path $emacsDir 'elpa'
        if (Test-Path $elpa) {
            $candidates += Get-ChildItem -Path $elpa -Directory |
                Where-Object { $_.Name -eq $pkg -or $_.Name -like "$pkg-*" } |
                Sort-Object Name -Descending |
                ForEach-Object { $_.FullName }
        }

        if (-not $candidates) {
            throw "Could not find the Emacs package '$pkg' under $emacsDir. Open Emacs and run 'doom sync' to install it."
        }

        $paths += $candidates[0]
    }

    return $paths
}

function Invoke-OrgExport {
    Assert-Command 'emacs' 'Install it with: choco install emacs'

    if (-not (Test-Path $OrgFile)) {
        throw "Org source not found at $OrgFile"
    }

    $loadPaths = Get-OxHugoLoadPaths
    Write-Host "    ox-hugo: $($loadPaths[2])" -ForegroundColor DarkGray

    # Pass the file with Emacs' own --visit flag rather than embedding it in a
    # quoted elisp string. Windows PowerShell 5.1 strips double quotes from
    # arguments to native commands, which would turn the quoted path into a
    # bare symbol and fail with "Symbol's value as variable is void".
    $emacsArgs = @('--batch', '-Q')
    foreach ($p in $loadPaths) { $emacsArgs += @('-L', $p.Replace('\', '/')) }
    $emacsArgs += @(
        '-l', 'ox-hugo',
        '--visit', $OrgFile.Replace('\', '/'),
        '--eval', '(org-hugo-export-wim-to-md :all-subtrees)'
    )

    $code = Invoke-Native 'emacs' $emacsArgs
    if ($code -ne 0) {
        throw "Emacs export failed with exit code $code. Check pages.org for syntax errors."
    }
}

function Invoke-Hugo {
    Assert-Command 'hugo' 'Install it with: choco install hugo'
    Assert-Command 'sass' 'Install it with: choco install sass'

    if ($Serve) {
        Write-Step 'Starting Hugo dev server (Ctrl+C to stop)'
        Write-Host '    Preview: http://localhost:1313' -ForegroundColor DarkGray
        & hugo server -D --disableFastRender
    }
    else {
        Write-Step 'Building site into public/'
        $code = Invoke-Native 'hugo' @('--gc', '--minify') ''
        if ($code -ne 0) {
            throw "Hugo build failed with exit code $code."
        }
    }
}

$launchedFromExplorer = Test-LaunchedFromExplorer
$exitCode = 0

Push-Location $Root
try {
    if ($Clean) {
        Write-Step 'Cleaning public/ and resources/_gen/'
        foreach ($dir in @('public', 'resources\_gen')) {
            $full = Join-Path $Root $dir
            if (Test-Path $full) { Remove-Item $full -Recurse -Force }
        }
    }

    if (-not $NoExport) {
        Write-Step 'Exporting pages.org to content/posts/'
        Invoke-OrgExport
    }

    Invoke-Hugo

    if (-not $Serve) {
        Write-Step 'Done'
        Write-Host '    Review changes:  git status' -ForegroundColor DarkGray
        Write-Host '    Publish:         git add -A; git commit -m "..."; git push' -ForegroundColor DarkGray
        Write-Host '    Netlify deploys automatically on push to main.' -ForegroundColor DarkGray
    }
}
catch {
    $exitCode = 1
    Write-Host "`n==> BUILD FAILED" -ForegroundColor Red
    Write-Host "    $($_.Exception.Message)" -ForegroundColor Red
    if ($_.InvocationInfo -and $_.InvocationInfo.ScriptLineNumber) {
        Write-Host "    at build.ps1 line $($_.InvocationInfo.ScriptLineNumber)" -ForegroundColor DarkGray
    }
}
finally {
    Pop-Location
}

# Double-clicking closes the window the moment the script ends, so hold it open
# either way. From a terminal the output stays on screen already, so only wait
# when explicitly asked.
if ($launchedFromExplorer -or $Pause) {
    Write-Host ''
    try { Read-Host 'Press Enter to close' | Out-Null } catch { }
}

exit $exitCode
