param([Parameter(Mandatory=$true)][string]$BackupDirectory)
$ErrorActionPreference='Stop'
$source='C:\Projects\AMBS-ERP\.env'
$target=Join-Path $BackupDirectory 'private-environment.env.age'
$status=Join-Path $BackupDirectory 'encryption-verification.json'
try {
    if (Test-Path -LiteralPath $target) { throw 'Refusing to overwrite an existing encrypted archive' }
    $age=(Get-Command age -ErrorAction Stop).Source
    Write-Host 'AMBS private configuration backup. Enter a NEW backup passphrase here, never in chat.'
    Write-Host 'Keep it in your password manager separately from this backup. No ERP password is requested.'
    & $age --passphrase --output $target $source
    if ($LASTEXITCODE -ne 0) { throw 'Encryption did not complete' }
    Write-Host 'Now enter the SAME backup passphrase for an in-memory decrypt-and-hash verification.'
    $start=New-Object System.Diagnostics.ProcessStartInfo
    $start.FileName=$age
    $start.Arguments='--decrypt "'+$target+'"'
    $start.UseShellExecute=$false
    $start.RedirectStandardOutput=$true
    $start.RedirectStandardError=$false
    $process=New-Object System.Diagnostics.Process
    $process.StartInfo=$start
    $null=$process.Start()
    $hash=[System.Security.Cryptography.SHA256]::Create()
    $decryptedHash=[BitConverter]::ToString($hash.ComputeHash($process.StandardOutput.BaseStream)).Replace('-','')
    $process.WaitForExit()
    if ($process.ExitCode -ne 0 -or $decryptedHash -ne (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash) { throw 'Decryption integrity check failed' }
    $hash.Dispose();$process.Dispose();$decryptedHash=$null
    @{status='PASS';method='age passphrase encryption';decryption='in-memory SHA256 comparison matched source';verified_at=(Get-Date).ToUniversalTime().ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath $status -Encoding UTF8
    Write-Host 'PASS: encrypted configuration backup and decryption verification completed.' -ForegroundColor Green
} catch {
    @{status='FAIL';message='Local encryption or decryption verification did not complete; no secret values recorded'} | ConvertTo-Json | Set-Content -LiteralPath $status -Encoding UTF8
    Write-Host 'Backup encryption is NOT verified. No Git push will proceed.' -ForegroundColor Red
}
Write-Host 'You can close this window.'
Read-Host 'Press Enter to close' | Out-Null
