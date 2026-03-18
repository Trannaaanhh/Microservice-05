param(
    [int]$Requests = 100,
    [string]$Target = "http://localhost:8000/health/"
)

$ErrorActionPreference = "Stop"
$durations = @()
$success = 0
$failed = 0

for ($i = 1; $i -le $Requests; $i++) {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $resp = Invoke-WebRequest -Uri $Target -Method Get -UseBasicParsing
        if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300) {
            $success++
        } else {
            $failed++
        }
    } catch {
        $failed++
    } finally {
        $sw.Stop()
        $durations += $sw.ElapsedMilliseconds
    }
}

$avg = [Math]::Round((($durations | Measure-Object -Average).Average), 2)
$max = ($durations | Measure-Object -Maximum).Maximum
$min = ($durations | Measure-Object -Minimum).Minimum

$result = [ordered]@{
    timestamp = (Get-Date).ToString("s")
    target = $Target
    requests = $Requests
    success = $success
    failed = $failed
    avg_ms = $avg
    min_ms = $min
    max_ms = $max
}

$result | ConvertTo-Json | Tee-Object -FilePath ".\scripts\load-test-results.json"
