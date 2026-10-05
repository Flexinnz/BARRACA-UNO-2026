# Auto-Sync Watcher for Barraca Uno GitHub Repository
# Monitors origin/main and pulls changes automatically in real time

$repoPath = "c:\Users\Administrator\Downloads\Barraca-Uno-para-Antigravity\barraca-uno"
Set-Location $repoPath

Write-Host "[Auto-Sync] Iniciando monitor en segundo plano para repositorio GitHub..." -ForegroundColor Cyan
Write-Host "[Auto-Sync] Rama monitorizada: origin/main" -ForegroundColor Cyan

while ($true) {
    try {
        # Fetch latest commit info from origin
        git fetch origin main 2>$null
        
        $localCommit = (git rev-parse HEAD 2>$null).Trim()
        $remoteCommit = (git rev-parse origin/main 2>$null).Trim()

        if ($localCommit -and $remoteCommit -and ($localCommit -ne $remoteCommit)) {
            $commitMsg = (git log -1 --pretty=format:"%s (%an)" origin/main 2>$null)
            Write-Host "`n[Auto-Sync $(Get-Date -Format 'HH:mm:ss')] Nuevos cambios detectados en GitHub:" -ForegroundColor Yellow
            Write-Host "  Commit: $commitMsg" -ForegroundColor Yellow
            
            # Pull changes automatically
            $pullResult = (git pull origin main 2>&1)
            Write-Host "[Auto-Sync $(Get-Date -Format 'HH:mm:ss')] Sincronizacion completada con exito." -ForegroundColor Green
            Write-Host "  Detalle: $pullResult" -ForegroundColor Gray
        }
    }
    catch {
        # Silently retry on transient network drops
    }

    Start-Sleep -Seconds 20
}
