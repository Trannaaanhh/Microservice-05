$ErrorActionPreference = "Stop"

Write-Host "Running fault simulation for Saga orchestration..."

$base = "http://localhost:8004/orders/"

Write-Host "Case 1: payment reservation fails"
$r1 = Invoke-RestMethod -Method Post -Uri $base -ContentType "application/json" -Body '{"customer_id":1,"simulate_failure_step":"payment"}'
$r1 | ConvertTo-Json -Depth 4

Write-Host "Case 2: shipping reservation fails (expect compensation)"
$r2 = Invoke-RestMethod -Method Post -Uri $base -ContentType "application/json" -Body '{"customer_id":2,"simulate_failure_step":"shipping"}'
$r2 | ConvertTo-Json -Depth 4

Write-Host "Case 3: success flow"
$r3 = Invoke-RestMethod -Method Post -Uri $base -ContentType "application/json" -Body '{"customer_id":1}'
$r3 | ConvertTo-Json -Depth 4

Write-Host "Fault simulation completed."
