param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('on', 'off')]
  [string]$Mode
)

$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class AgentsMonitorWindow {
  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool SetWindowPos(
    IntPtr hWnd,
    IntPtr hWndInsertAfter,
    int x,
    int y,
    int width,
    int height,
    uint flags
  );
}
'@

$windowProcess = Get-Process -Name 'chrome' -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -eq 'Agents Monitor' } |
  Select-Object -First 1

if (-not $windowProcess) {
  throw 'Finestra Agents Monitor non trovata.'
}

$handle = [IntPtr]$windowProcess.MainWindowHandle

$insertAfter = if ($Mode -eq 'on') { [IntPtr](-1) } else { [IntPtr](-2) }
$flags = [uint32](0x0001 -bor 0x0002 -bor 0x0010)
$ok = [AgentsMonitorWindow]::SetWindowPos($handle, $insertAfter, 0, 0, 0, 0, $flags)

if (-not $ok) {
  $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
  throw "SetWindowPos non riuscito. Codice Windows: $code"
}

Write-Output "PIN_$($Mode.ToUpperInvariant())_OK"
