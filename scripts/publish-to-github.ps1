# ============================================================
#  publish-to-github.ps1
#  ------------------------------------------------------------
#  One command to put PFT online at
#      https://<your-username>.github.io/pft/
#
#  What it does:
#    1. Signs you in to GitHub (opens your browser once)
#    2. Creates the repository (or reuses it if it exists)
#    3. Pushes your code
#    4. Enables GitHub Pages so the site goes live
#    5. Prints your public link
#
#  Run it with:
#      powershell -ExecutionPolicy Bypass -File scripts\publish-to-github.ps1
# ============================================================

$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

function Info ($m) { Write-Host "  $m" }
function Step ($m) { Write-Host "`n=== $m ===" -ForegroundColor Cyan }
function Good ($m) { Write-Host "  OK  $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "  !   $m" -ForegroundColor Yellow }
function Die  ($m) { Write-Host "`n  X   $m" -ForegroundColor Red; exit 1 }

Write-Host '============================================================'
Write-Host '  PFT -> GitHub Pages'
Write-Host '============================================================'

# ---------------------------------------------------------------
# 0. Locate the GitHub CLI
# ---------------------------------------------------------------
Step '0/5  Checking tools'

$gh = (Get-Command gh -ErrorAction SilentlyContinue).Source
if (-not $gh) {
  $candidate = 'C:\Program Files\GitHub CLI\gh.exe'
  if (Test-Path $candidate) { $gh = $candidate }
}
if (-not $gh) { Die 'GitHub CLI not found. Install it with:  winget install --id GitHub.cli' }
Good "GitHub CLI: $gh"

$git = (Get-Command git -ErrorAction SilentlyContinue).Source
if (-not $git) { Die 'Git is not installed. Get it from https://git-scm.com/download/win' }
Good 'Git found'

if (-not (Test-Path 'package.json')) { Die 'Run this from inside the PFT project folder.' }

# ---------------------------------------------------------------
# 1. Sign in
# ---------------------------------------------------------------
Step '1/5  GitHub sign-in'

& $gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
  Warn 'You are not signed in. Your browser will open - approve access, then come back here.'
  Write-Host ''
  & $gh auth login --hostname github.com --git-protocol https --web
  if ($LASTEXITCODE -ne 0) { Die 'Sign-in was not completed. Run the script again when ready.' }
}
$account = (& $gh api user --jq '.login' 2>$null | Out-String).Trim()
if (-not $account) { Die 'Could not read your GitHub account. Try: gh auth login' }
Good "Signed in as: $account"

# ---------------------------------------------------------------
# 2. Commit anything outstanding, so nothing is lost
# ---------------------------------------------------------------
Step '2/5  Preparing your code'

$dirty = (git status --porcelain | Out-String).Trim()
if ($dirty) {
  git add -A | Out-Null
  git -c user.email='pft@local' -c user.name='PFT' commit -m 'chore: publish' | Out-Null
  Good 'Committed your latest changes'
} else {
  Good 'Nothing to commit - already up to date'
}

git branch -M main | Out-Null
Good 'Branch: main'

# ---------------------------------------------------------------
# 3. Create the repository and push
# ---------------------------------------------------------------
Step '3/5  Creating the repository'

$hasOrigin = (git remote | Out-String) -match 'origin'
if ($hasOrigin) {
  Good 'Remote "origin" already configured'
} else {
  # --source=. --push creates the repo from this folder and pushes in one go.
  & $gh repo create pft --private --source=. --remote=origin --push
  if ($LASTEXITCODE -ne 0) {
    Warn 'Private repo creation failed - it may already exist. Trying to link it instead...'
    git remote add origin "https://github.com/$account/pft.git"
    git push -u origin main
    if ($LASTEXITCODE -ne 0) { Die "Could not push. Does a repo named 'pft' already exist under $account?" }
  }
  Good "Repository ready: https://github.com/$account/pft"
}

git push -u origin main 2>&1 | Out-Null
Good 'Code pushed'

# ---------------------------------------------------------------
# 4. Turn on GitHub Pages (GitHub Actions source)
# ---------------------------------------------------------------
Step '4/5  Enabling GitHub Pages'

$repoFull = "$account/pft"
'{"build_type":"workflow"}' | & $gh api --method POST "repos/$repoFull/pages" --input - *> $null
if ($LASTEXITCODE -eq 0) {
  Good 'GitHub Pages enabled (GitHub Actions build)'
} else {
  Warn 'Could not auto-enable Pages.'
  Write-Host ''
  Info 'If your site shows a 404 after the workflow finishes, enable it once by hand:'
  Info "  1. Open https://github.com/$repoFull/settings/pages"
  Info '  2. Source -> GitHub Actions'
}

# Kick off the deploy workflow immediately
& $gh workflow run deploy.yml --repo $repoFull *> $null
if ($LASTEXITCODE -eq 0) { Good 'Deployment started' }

# ---------------------------------------------------------------
# 5. Done
# ---------------------------------------------------------------
$siteUrl = "https://$account.github.io/pft/"

Step '5/5  Finished'

Write-Host ''
Write-Host '  Your app will be live at:' -ForegroundColor White
Write-Host ''
Write-Host "      $siteUrl" -ForegroundColor Green
Write-Host ''
Write-Host '  It takes about 1 minute to build. Watch progress here:' -ForegroundColor White
Write-Host ''
Write-Host "      https://github.com/$repoFull/actions" -ForegroundColor White
Write-Host ''

Write-Host '  ------------------------------------------------------------' -ForegroundColor Yellow
Write-Host '  IMPORTANT - ONE LAST STEP (required for Google sign-in)' -ForegroundColor Yellow
Write-Host '  ------------------------------------------------------------' -ForegroundColor Yellow
Write-Host @"
  Firebase only accepts sign-ins from domains you approve, so
  add your new address there or the sign-in button will fail:

    1. Copy this domain:   $account.github.io
    2. Open:  https://console.firebase.google.com/project/pft-t-80b51/authentication/settings
    3. Scroll to 'Authorized domains' -> Add domain -> paste it
    4. Open $siteUrl and sign in
"@ -ForegroundColor Yellow
Write-Host '  ------------------------------------------------------------' -ForegroundColor Yellow
Write-Host ''
