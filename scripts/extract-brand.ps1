$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root = Split-Path $PSScriptRoot -Parent
$archive = [IO.Compression.ZipFile]::OpenRead((Join-Path $root 'Lampiran\public_html.zip'))
try {
    $entry = $archive.GetEntry('public_html/src/img/logo.png')
    if (-not $entry) { throw 'Public logo not found in original archive.' }
    $source = $entry.Open()
    $buffer = [IO.MemoryStream]::new()
    try { $source.CopyTo($buffer); $bytes = $buffer.ToArray() }
    finally { $source.Dispose(); $buffer.Dispose() }
    $sha = [Security.Cryptography.SHA256]::Create()
    try { $hash = ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant() }
    finally { $sha.Dispose() }
    if ($hash -ne '9512b05a7b9c1cd8a937251bc2dab8f9a5eb6649fb64d63087677abac7e82d21') {
        throw 'Original logo checksum changed; review the public asset before replacing it.'
    }
    [IO.File]::WriteAllBytes((Join-Path $root 'brand-logo.png'), $bytes)
    Write-Output 'Extracted original public logo only (406 x 74 PNG).'
}
finally { $archive.Dispose() }
