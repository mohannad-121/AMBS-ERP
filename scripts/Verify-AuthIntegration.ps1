param([switch]$Browser, [switch]$Production, [switch]$MasterData, [switch]$MasterOnly, [switch]$Inventory, [switch]$InventoryOnly, [switch]$Purchasing, [switch]$PurchasingOnly, [switch]$Sales, [switch]$SalesOnly, [switch]$Routing, [switch]$RoutingOnly)

$ErrorActionPreference = 'Stop'
if ($RoutingOnly) { $Routing = $true; $Browser = $true }
if ($Routing -and !$RoutingOnly) { $Sales = $true }
if ($SalesOnly) { $Sales = $true; $Browser = $true }
if ($Sales -and !$SalesOnly -and !$RoutingOnly) { $Purchasing = $true }
if ($PurchasingOnly) { $Purchasing = $true; $Browser = $true }
if ($Purchasing -and !$PurchasingOnly -and !$SalesOnly -and !$RoutingOnly) { $Inventory = $true }
if ($InventoryOnly) { $Inventory = $true; $Browser = $true }
if ($Inventory -and !$InventoryOnly) { $MasterData = $true }
if ($MasterOnly) { $MasterData = $true }
if ($MasterData) { $Browser = $true }
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $projectRoot
$testSuffix = [guid]::NewGuid().ToString('N')
$testDatabase = "ambs_http_test_$testSuffix"
$apiContainer = "ambs-http-api-$testSuffix"
$webContainer = "ambs-http-web-$testSuffix"
$databaseCreated = $false
$apiStarted = $false
$webStarted = $false

function Invoke-CheckedDocker {
    param([string[]]$DockerArgs)
    & docker @DockerArgs
    if ($LASTEXITCODE -ne 0) { throw "Docker command failed with exit code $LASTEXITCODE" }
}

function Wait-TestService {
    param([string]$Container, [string]$Runtime)
    # Native stderr during startup is expected. Decide from the exit code while
    # keeping the caller's terminating-error preference outside this function.
    $ErrorActionPreference = 'Continue'
    $deadline = (Get-Date).AddSeconds(120)
    do {
        if ($Runtime -eq 'python') {
            & docker exec $Container python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health')" 2>$null
        } else {
            & docker exec $Container node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>$null
        }
        if ($LASTEXITCODE -eq 0) { return }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)
    throw "Test service did not become available within 120 seconds"
}

try {
    if ($Browser) {
        Invoke-CheckedDocker -DockerArgs @('build','-f','frontend/tests/browser.Dockerfile','-t','ambs-auth-browser-tools:local','frontend/tests')
    }
    Invoke-CheckedDocker -DockerArgs @('compose','exec','-T','backend','python','-m','tests.live_fixture','create-db',$testDatabase)
    $databaseCreated = $true
    Invoke-CheckedDocker -DockerArgs @('compose','run','--rm','--no-deps','-e',"POSTGRES_DB=$testDatabase",'backend','alembic','upgrade','head')
    $credentialJson = & docker compose run --rm --no-deps -e "POSTGRES_DB=$testDatabase" backend python -m tests.live_fixture seed
    if ($LASTEXITCODE -ne 0) { throw 'Could not seed the isolated HTTP test database' }
    $null = $credentialJson | ConvertFrom-Json
    $apiModule = if ($Routing) { 'tests.routing_server:app' } else { 'app.main:app' }
    $null = Invoke-CheckedDocker -DockerArgs @('compose','run','-d','--rm','--no-deps','--name',$apiContainer,'--volume','/data/item-images','-e',"POSTGRES_DB=$testDatabase",'-e','APP_ENV=test','backend','uvicorn',$apiModule,'--host','0.0.0.0','--port','8000','--no-access-log')
    $apiStarted = $true
    Wait-TestService -Container $apiContainer -Runtime 'python'
    $webArguments = @('compose','run','-d','--rm','--no-deps','--name',$webContainer,'-e',"INTERNAL_API_URL=http://${apiContainer}:8000",'--volume','/app/.next','--volume','/app/node_modules','frontend')
    if ($Production) {
        $webArguments += @('sh','-c','npm run build && npm run start')
    } else {
        $webArguments += @('npm','run','dev','--','--hostname','0.0.0.0')
    }
    $null = Invoke-CheckedDocker -DockerArgs $webArguments
    $webStarted = $true
    Wait-TestService -Container $webContainer -Runtime 'node'
    Invoke-CheckedDocker -DockerArgs @('exec',$webContainer,'npm','run','test:compat')
    if ($Browser) {
        $scriptMount = "type=bind,source=$projectRoot\frontend\scripts,target=/work/tests,readonly"
        Invoke-CheckedDocker -DockerArgs @('run','--rm','--volumes-from',"${webContainer}:ro",'-e','FRONTEND_SOURCE=/app','--mount',$scriptMount,'ambs-auth-browser-tools:local','/work/tests/verify-router-suspense.mjs')
        Invoke-CheckedDocker -DockerArgs @('run','--rm','--volumes-from',"${webContainer}:ro",'-e','FRONTEND_SOURCE=/app','--mount',$scriptMount,'ambs-auth-browser-tools:local','/work/tests/verify-router-suspense.mjs','--esm')
        $browserArguments = @('run','--rm','-i','--network',"container:$webContainer",'--mount',$scriptMount,'ambs-auth-browser-tools:local','/work/tests/verify-login-browser.mjs')
        if ($Production) { $browserArguments += '--production' }
        if (!$MasterOnly -and !$InventoryOnly -and !$PurchasingOnly -and !$SalesOnly -and !$RoutingOnly) {
            $credentialJson | & docker @browserArguments
            if ($LASTEXITCODE -ne 0) { throw 'Browser authentication verification failed' }
        }
    }
    if (!$MasterOnly -and !$InventoryOnly -and !$PurchasingOnly -and !$SalesOnly -and !$RoutingOnly) {
        $credentialJson | & docker exec -i $webContainer node scripts/verify-auth.mjs
        if ($LASTEXITCODE -ne 0) { throw 'Live authentication integration verification failed' }
    }
    if ($MasterData -and !$InventoryOnly) {
        $artifactDirectory = Join-Path $projectRoot 'artifacts\phase3'
        $null = New-Item -ItemType Directory -Force -Path $artifactDirectory
        $artifactMount = "type=bind,source=$artifactDirectory,target=/artifacts"
        $masterArguments = @('run','--rm','-i','--network',"container:$webContainer",'--mount',$scriptMount,'--mount',$artifactMount,'ambs-auth-browser-tools:local','/work/tests/verify-master-browser.mjs')
        $credentialJson | & docker @masterArguments
        if ($LASTEXITCODE -ne 0) { throw 'Master-data browser verification failed' }
        # Restart only this run's scratch services. Their database and image
        # volumes remain attached; real development data is never seeded.
        $null = Invoke-CheckedDocker -DockerArgs @('restart',$apiContainer,$webContainer)
        Wait-TestService -Container $apiContainer -Runtime 'python'
        Wait-TestService -Container $webContainer -Runtime 'node'
        $credentialJson | & docker @masterArguments --persistence
        if ($LASTEXITCODE -ne 0) { throw 'Master-data restart persistence verification failed' }
    }
    if ($Inventory) {
        $artifactDirectory = Join-Path $projectRoot 'artifacts\phase4'
        $null = New-Item -ItemType Directory -Force -Path $artifactDirectory
        $artifactMount = "type=bind,source=$artifactDirectory,target=/artifacts"
        $inventoryArguments = @('run','--rm','-i','--network',"container:$webContainer",'--mount',$scriptMount,'--mount',$artifactMount,'ambs-auth-browser-tools:local','/work/tests/verify-inventory-browser.mjs')
        if ($MasterData -and !$InventoryOnly) { $inventoryArguments += '--after-master' }
        $credentialJson | & docker @inventoryArguments
        if ($LASTEXITCODE -ne 0) { throw 'Inventory browser verification failed' }
        $null = Invoke-CheckedDocker -DockerArgs @('restart',$apiContainer,$webContainer)
        Wait-TestService -Container $apiContainer -Runtime 'python'
        Wait-TestService -Container $webContainer -Runtime 'node'
        $credentialJson | & docker @inventoryArguments --persistence
        if ($LASTEXITCODE -ne 0) { throw 'Inventory restart persistence verification failed' }
    }
    if ($Purchasing) {
        $artifactDirectory = Join-Path $projectRoot 'artifacts\phase5'
        $null = New-Item -ItemType Directory -Force -Path $artifactDirectory
        $artifactMount = "type=bind,source=$artifactDirectory,target=/artifacts"
        $purchasingArguments = @('run','--rm','-i','--network',"container:$webContainer",'--mount',$scriptMount,'--mount',$artifactMount,'ambs-auth-browser-tools:local','/work/tests/verify-purchasing-browser.mjs')
        if ($Inventory) { $purchasingArguments += '--after-inventory' }
        $credentialJson | & docker @purchasingArguments
        if ($LASTEXITCODE -ne 0) { throw 'Purchasing browser verification failed' }
        $null = Invoke-CheckedDocker -DockerArgs @('restart',$apiContainer,$webContainer)
        Wait-TestService -Container $apiContainer -Runtime 'python'
        Wait-TestService -Container $webContainer -Runtime 'node'
        $credentialJson | & docker @purchasingArguments --persistence
        if ($LASTEXITCODE -ne 0) { throw 'Purchasing restart persistence verification failed' }
    }
    if ($Sales) {
        $artifactDirectory = Join-Path $projectRoot 'artifacts\phase6a'
        $null = New-Item -ItemType Directory -Force -Path $artifactDirectory
        $artifactMount = "type=bind,source=$artifactDirectory,target=/artifacts"
        $salesArguments = @('run','--rm','-i','--network',"container:$webContainer",'--mount',$scriptMount,'--mount',$artifactMount,'ambs-auth-browser-tools:local','/work/tests/verify-sales-browser.mjs')
        if ($Purchasing) { $salesArguments += '--after-purchasing' }
        $credentialJson | & docker @salesArguments
        if ($LASTEXITCODE -ne 0) { throw 'Sales and dispatch browser verification failed' }
        $null = Invoke-CheckedDocker -DockerArgs @('restart',$apiContainer,$webContainer)
        Wait-TestService -Container $apiContainer -Runtime 'python'
        Wait-TestService -Container $webContainer -Runtime 'node'
        $credentialJson | & docker @salesArguments --persistence
        if ($LASTEXITCODE -ne 0) { throw 'Sales restart persistence verification failed' }
    }
    if ($Routing) {
        $artifactDirectory = Join-Path $projectRoot 'artifacts\phase6b'
        $null = New-Item -ItemType Directory -Force -Path $artifactDirectory
        $artifactMount = "type=bind,source=$artifactDirectory,target=/artifacts"
        $routingArguments = @('run','--rm','-i','--network',"container:$webContainer",'--mount',$scriptMount,'--mount',$artifactMount,'ambs-auth-browser-tools:local','/work/tests/verify-routing-browser.mjs')
        if ($Sales) { $routingArguments += '--after-sales' }
        $credentialJson | & docker @routingArguments
        if ($LASTEXITCODE -ne 0) { throw 'Routing browser verification failed' }
        $null = Invoke-CheckedDocker -DockerArgs @('restart',$apiContainer,$webContainer)
        Wait-TestService -Container $apiContainer -Runtime 'python'
        Wait-TestService -Container $webContainer -Runtime 'node'
        $credentialJson | & docker @routingArguments --persistence
        if ($LASTEXITCODE -ne 0) { throw 'Routing restart persistence verification failed' }
    }
} finally {
    $credentialJson = $null
    if ($webStarted) { $null = & docker stop $webContainer }
    if ($apiStarted) { $null = & docker stop $apiContainer }
    if ($databaseCreated) {
        Invoke-CheckedDocker -DockerArgs @('compose','exec','-T','backend','python','-m','tests.live_fixture','drop-db',$testDatabase)
    }
    Pop-Location
}
Write-Output 'PASS integration verification and isolated-fixture teardown completed.'
# Windows PowerShell can retain a failed readiness probe as its implicit native
# exit status, even after a later probe succeeds. Every required command above
# checks its own status; reach this explicit success only after safe teardown.
exit 0
