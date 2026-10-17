# Minimaler statischer Server für Windows ohne Python (Ersatz für server/serve.py).
#   powershell -ExecutionPolicy Bypass -File werkzeug/serve.ps1   ->  http://localhost:8060
# Nur localhost, Cache-Control: no-store wie das Original.
param([string]$Root = (Join-Path $PSScriptRoot "..\web"), [int]$Port = 8060)
$mime = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8';
  '.json'='application/json'; '.webmanifest'='application/manifest+json'; '.png'='image/png'; '.m4a'='audio/mp4';
  '.mp3'='audio/mpeg'; '.svg'='image/svg+xml'; '.ico'='image/x-icon' }
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$Port/")
$l.Start()
Write-Host "Server läuft auf http://localhost:$Port/ ($Root)"
while ($l.IsListening) {
  $ctx = $l.GetContext()
  try {
    $pfad = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($pfad.EndsWith('/')) { $pfad += 'index.html' }
    $datei = [IO.Path]::GetFullPath((Join-Path $Root $pfad.TrimStart('/')))
    if (-not $datei.StartsWith([IO.Path]::GetFullPath($Root)) -or -not (Test-Path $datei -PathType Leaf)) {
      $ctx.Response.StatusCode = 404
    } else {
      $bytes = [IO.File]::ReadAllBytes($datei)
      $ext = [IO.Path]::GetExtension($datei).ToLower()
      $ctx.Response.ContentType = $(if ($mime[$ext]) { $mime[$ext] } else { 'application/octet-stream' })
      $ctx.Response.Headers.Add('Cache-Control', 'no-store')
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    }
  } catch { try { $ctx.Response.StatusCode = 500 } catch {} }
  finally { try { $ctx.Response.Close() } catch {} }
}
