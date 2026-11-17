param()
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$gh=(Get-Content (Join-Path $projectRoot 'artifacts/github-cli-path.txt') -Raw).Trim()
$statusPath=Join-Path $projectRoot 'artifacts/github-interactive-auth.json'
Write-Host 'AMBS private repository setup: authenticate GitHub CLI as mohannad-121.'
Write-Host 'Complete GitHub browser/device login locally. Never paste a token into chat.'
& $gh auth login --hostname github.com --git-protocol https --web
if ($LASTEXITCODE -eq 0) {
    $login=& $gh api user --jq .login
    if ($LASTEXITCODE -eq 0 -and $login -eq 'mohannad-121') {
        @{status='PASS';login=$login;verified_at=(Get-Date).ToUniversalTime().ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath $statusPath -Encoding UTF8
        Write-Host 'PASS: expected GitHub account verified.' -ForegroundColor Green
    } else {
        @{status='FAIL';reason='Authenticated account did not match requested owner'} | ConvertTo-Json | Set-Content -LiteralPath $statusPath -Encoding UTF8
        Write-Host 'Wrong account or authentication check failed. Repository creation is blocked.' -ForegroundColor Red
    }
} else {
    @{status='FAIL';reason='Interactive login did not complete'} | ConvertTo-Json | Set-Content -LiteralPath $statusPath -Encoding UTF8
}
Read-Host 'Press Enter to close' | Out-Null
