$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead((Join-Path $PWD 'Lampiran\public_html.zip'))
try {
  foreach ($item in (Get-Content scripts\media-manifest.json -Raw | ConvertFrom-Json)) {
    if ($item.source -notmatch '^public_html/src/img/(upload/)?[^/\\]+\.(png|jpe?g|webp)$' -or $item.target -notmatch '^legacy-\d+\.(png|jpe?g|webp)$') { throw 'Invalid media allowlist entry' }
    $entry = $archive.GetEntry($item.source)
    if (!$entry -or $entry.Length -gt 8MB) { throw 'Missing or oversized approved image' }
    $inputStream = $entry.Open()
    $buffer = New-Object IO.MemoryStream
    try { $inputStream.CopyTo($buffer); $bytes = $buffer.ToArray() } finally { $inputStream.Dispose(); $buffer.Dispose() }
    $png = $bytes.Length -ge 8 -and $bytes[0] -eq 137 -and $bytes[1] -eq 80 -and $bytes[2] -eq 78 -and $bytes[3] -eq 71
    $jpg = $bytes.Length -ge 3 -and $bytes[0] -eq 255 -and $bytes[1] -eq 216 -and $bytes[2] -eq 255
    $webp = $bytes.Length -ge 12 -and [Text.Encoding]::ASCII.GetString($bytes, 0, 4) -eq 'RIFF' -and [Text.Encoding]::ASCII.GetString($bytes, 8, 4) -eq 'WEBP'
    if (!($png -or $jpg -or $webp)) { throw 'Rejected non-raster media' }
    [IO.File]::WriteAllBytes((Join-Path $PWD ('media\' + $item.target)), $bytes)
  }
} finally { $archive.Dispose() }
Write-Output 'Extracted allowlisted public raster images only.'
