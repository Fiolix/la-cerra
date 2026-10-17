param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
  [int]$Quality = 88,
  [switch]$HeaderOnly
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object MimeType -eq 'image/jpeg'

function New-JpegEncoderParameters([int]$JpegQuality) {
  $parameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $parameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality,
    [long]$JpegQuality
  )
  return $parameters
}

function Save-ResizedJpeg(
  [System.Drawing.Image]$Source,
  [string]$Destination,
  [int]$TargetWidth,
  [int]$JpegQuality
) {
  $targetHeight = [int][Math]::Round($Source.Height * ($TargetWidth / $Source.Width))
  $bitmap = New-Object System.Drawing.Bitmap($TargetWidth, $targetHeight)
  $bitmap.SetResolution(72, 72)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

  try {
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Black)
    $graphics.DrawImage(
      $Source,
      (New-Object System.Drawing.Rectangle(0, 0, $TargetWidth, $targetHeight)),
      0,
      0,
      $Source.Width,
      $Source.Height,
      [System.Drawing.GraphicsUnit]::Pixel
    )
    $bitmap.Save($Destination, $jpegCodec, (New-JpegEncoderParameters $JpegQuality))
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

$imageRoot = Join-Path $ProjectRoot 'img'
$headerSourcePath = Join-Path $imageRoot 'header_index.jpg'
$headerSource = [System.Drawing.Image]::FromFile($headerSourcePath)

try {
  Save-ResizedJpeg $headerSource (Join-Path $imageRoot 'header_index-960.jpg') 960 84
  Save-ResizedJpeg $headerSource (Join-Path $imageRoot 'header_index-1600.jpg') 1600 84
} finally {
  $headerSource.Dispose()
}

$optimizedCount = 0
$bytesBefore = 0L
$bytesAfter = 0L

if ($HeaderOnly) {
  Write-Output 'Generated responsive header images.'
  return
}

Get-ChildItem $imageRoot -Recurse -File |
  Where-Object {
    $_.Extension -match '^\.jpe?g$' -and
    $_.Name -notin @('header_index.jpg', 'header_index-960.jpg', 'header_index-1600.jpg')
  } |
  ForEach-Object {
    $sourcePath = $_.FullName
    $temporaryPath = "$sourcePath.optimized"
    $sourceSize = $_.Length
    $image = [System.Drawing.Image]::FromFile($sourcePath)

    try {
      $image.Save($temporaryPath, $jpegCodec, (New-JpegEncoderParameters $Quality))
    } finally {
      $image.Dispose()
    }

    $optimizedSize = (Get-Item $temporaryPath).Length
    $bytesBefore += $sourceSize

    if ($optimizedSize -lt ($sourceSize * 0.98)) {
      Move-Item -LiteralPath $temporaryPath -Destination $sourcePath -Force
      $bytesAfter += $optimizedSize
      $optimizedCount++
    } else {
      Remove-Item -LiteralPath $temporaryPath
      $bytesAfter += $sourceSize
    }
  }

$savedMb = [Math]::Round(($bytesBefore - $bytesAfter) / 1MB, 2)
Write-Output "Optimized $optimizedCount JPEG files; saved $savedMb MB."
