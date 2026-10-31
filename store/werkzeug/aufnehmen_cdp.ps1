param([string]$Ziel, [string]$Url, [int]$Breite = 540, [int]$Hoehe = 960, [int]$Warten = 8)
# Headless-Chrome in ECHTER Zeit laufen lassen und dann per DevTools-Protokoll ein Bildschirmfoto holen
# (--virtual-time-budget brachte das Spiel zum Absturz bzw. ließ die Gäste halb durchsichtig).
$profil = Join-Path (Split-Path $Ziel) ("profil_" + [IO.Path]::GetFileNameWithoutExtension($Ziel))
if (Test-Path $profil) { Remove-Item -Recurse -Force $profil }
$p = Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -PassThru -ArgumentList @(
  '--headless=new', '--hide-scrollbars', '--remote-debugging-port=9333', "--user-data-dir=`"$profil`"",
  "--window-size=$Breite,$Hoehe", '--force-device-scale-factor=2', "`"$Url`"")
Start-Sleep -Seconds 2
$seiten = Invoke-RestMethod 'http://127.0.0.1:9333/json'
$ws = ($seiten | Where-Object { $_.type -eq 'page' } | Select-Object -First 1).webSocketDebuggerUrl
$c = New-Object System.Net.WebSockets.ClientWebSocket
$c.ConnectAsync([Uri]$ws, [Threading.CancellationToken]::None).Wait()
$puffer = New-Object byte[] 1048576
function Schicke([int]$id, [string]$methode, [string]$param) {
  $b = [Text.Encoding]::UTF8.GetBytes("{`"id`":$id,`"method`":`"$methode`",`"params`":$param}")
  $c.SendAsync((New-Object ArraySegment[byte] -ArgumentList @(,$b)), 'Text', $true, [Threading.CancellationToken]::None).Wait()
  while ($true) {   # Antwort mit dieser id abwarten, Ereignisse dazwischen überspringen
    $ms = New-Object IO.MemoryStream
    do { $r = $c.ReceiveAsync((New-Object ArraySegment[byte] -ArgumentList @(,$puffer)), [Threading.CancellationToken]::None).Result; $ms.Write($puffer, 0, $r.Count) } while (-not $r.EndOfMessage)
    $t = [Text.Encoding]::UTF8.GetString($ms.ToArray())
    if ($t.StartsWith("{`"id`":$id,")) { return $t }
  }
}
# Genau 540 x 960 CSS-Pixel bei Faktor 2 = 1080 x 1920, dann neu laden und in echter Zeit warten
$null = Schicke 1 'Emulation.setDeviceMetricsOverride' "{`"width`":$Breite,`"height`":$Hoehe,`"deviceScaleFactor`":2,`"mobile`":true}"
$null = Schicke 2 'Page.reload' '{}'
Start-Sleep -Seconds $Warten
$antwort = (Schicke 3 'Page.captureScreenshot' '{"format":"png"}') | ConvertFrom-Json
[IO.File]::WriteAllBytes($Ziel, [Convert]::FromBase64String($antwort.result.data))
$c.Dispose()
Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -match 'profil_' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Milliseconds 800
Remove-Item -Recurse -Force $profil -ErrorAction SilentlyContinue
Get-Item $Ziel | Select-Object Name, Length
