param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9]{8}-[A-Za-z0-9_-]+$')]
  [string]$Version
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$targets = @(
  (Join-Path $projectRoot 'index.html')
) + @(Get-ChildItem (Join-Path $projectRoot 'js') -File -Filter '*.js' | Select-Object -ExpandProperty FullName)

foreach ($target in $targets) {
  $current = [System.IO.File]::ReadAllText($target)
  $updated = [regex]::Replace($current, '(?<=\?v=)20\d{6}-[A-Za-z0-9_-]+', $Version)

  if ($target.EndsWith('content_loader.js')) {
    $updated = [regex]::Replace(
      $updated,
      'const ASSET_VERSION = "[^"]+";',
      "const ASSET_VERSION = `"$Version`";"
    )
  }

  if ($updated -ne $current) {
    [System.IO.File]::WriteAllText($target, $updated, [System.Text.UTF8Encoding]::new($false))
  }
}

Write-Output "Asset version updated to $Version."
