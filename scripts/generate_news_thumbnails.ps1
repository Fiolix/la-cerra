param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
  [int]$Width = 800,
  [int]$Quality = 82
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object MimeType -eq 'image/jpeg'
$encoderParameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
  [System.Drawing.Imaging.Encoder]::Quality,
  [long]$Quality
)

$newsPath = Join-Path $ProjectRoot 'data/news.json'
$outputDirectory = Join-Path $ProjectRoot 'img/news'
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
$items = Get-Content -LiteralPath $newsPath -Raw | ConvertFrom-Json

foreach ($item in $items) {
  if (-not $item.image -or -not $item.thumbnail) { continue }

  $sourceRelative = $item.image -replace '^/la-cerra/', ''
  $thumbnailRelative = $item.thumbnail -replace '^/la-cerra/', ''
  $sourcePath = Join-Path $ProjectRoot ($sourceRelative -replace '/', [IO.Path]::DirectorySeparatorChar)
  $destinationPath = Join-Path $ProjectRoot ($thumbnailRelative -replace '/', [IO.Path]::DirectorySeparatorChar)
  if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "News image not found: $sourceRelative"
  }

  $source = [System.Drawing.Image]::FromFile($sourcePath)
  try {
    $targetWidth = [Math]::Min($Width, $source.Width)
    $targetHeight = [int][Math]::Round($source.Height * ($targetWidth / $source.Width))
    $bitmap = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
    $bitmap.SetResolution(72, 72)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.DrawImage($source, 0, 0, $targetWidth, $targetHeight)
      $bitmap.Save($destinationPath, $jpegCodec, $encoderParameters)
    } finally {
      $graphics.Dispose()
      $bitmap.Dispose()
    }
  } finally {
    $source.Dispose()
  }
}

$encoderParameters.Dispose()
Write-Output "Generated $($items.Count) news thumbnails in img/news."
