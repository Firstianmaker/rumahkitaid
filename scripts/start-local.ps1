param([string]$RuntimeRoot = 'D:\RumahKita-runtime', [switch]$Development)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $projectRoot
New-Item -ItemType Directory -Force (Join-Path $projectRoot '.runtime') | Out-Null
function Test-LocalPort([int]$Port) {
  $client = [System.Net.Sockets.TcpClient]::new()
  try { $task = $client.ConnectAsync('127.0.0.1', $Port); return $task.Wait(700) -and $client.Connected } catch { return $false } finally { $client.Dispose() }
}
if (!(Test-LocalPort 3308)) {
  $mysql = Join-Path $RuntimeRoot 'mysql\mysql-8.4.0-winx64\bin\mysqld.exe'
  if (!(Test-Path -LiteralPath $mysql)) { throw 'MySQL portable tidak ditemukan. Gunakan Docker Compose atau sesuaikan RuntimeRoot.' }
  $base = (Join-Path $RuntimeRoot 'mysql\mysql-8.4.0-winx64').Replace('\','/')
  $data = (Join-Path $RuntimeRoot 'mysql-data').Replace('\','/')
  Start-Process -FilePath $mysql -ArgumentList '--no-defaults',"--basedir=$base","--datadir=$data",'--port=3308','--bind-address=127.0.0.1','--mysqlx=OFF','--console' -WindowStyle Hidden -RedirectStandardOutput (Join-Path $RuntimeRoot 'mysql-out.log') -RedirectStandardError (Join-Path $RuntimeRoot 'mysql-error.log')
}
if (!(Test-LocalPort 4000)) {
  if (!(Test-Path 'apps/api/dist/main.js')) { throw 'Jalankan npm run build -w @rumahkita/api dahulu.' }
  Start-Process -FilePath (Get-Command node).Source -ArgumentList 'apps/api/dist/main.js' -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $projectRoot '.runtime/api-out.log') -RedirectStandardError (Join-Path $projectRoot '.runtime/api-error.log')
}
if (!(Test-LocalPort 3000)) {
  $env:RUMAHKITA_RUNTIME = Join-Path $RuntimeRoot 'dependencies'
  $env:RUMAHKITA_WEB_MODE = if (!$Development -and (Test-Path (Join-Path $env:RUMAHKITA_RUNTIME 'apps/web/.next/BUILD_ID'))) { 'start' } else { 'dev' }
  Start-Process -FilePath (Get-Command node).Source -ArgumentList 'scripts/web-runtime.cjs' -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $projectRoot '.runtime/web-out.log') -RedirectStandardError (Join-Path $projectRoot '.runtime/web-error.log')
}
Write-Output 'Demo lokal sedang dimulai: http://127.0.0.1:3000'
Write-Output 'Dokumentasi API: http://127.0.0.1:4000/api/docs'
