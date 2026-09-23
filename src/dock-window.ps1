$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class AgentsMonitorDock {
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

$windowProcess = $null
for ($attempt = 0; $attempt -lt 20 -and -not $windowProcess; $attempt++) {
  $windowProcess = Get-Process -Name 'chrome' -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -eq 'Agents Monitor' } |
    Select-Object -First 1
  if (-not $windowProcess) { Start-Sleep -Milliseconds 150 }
}

if (-not $windowProcess) { throw 'Finestra Agents Monitor non trovata.' }

$handle = [IntPtr]$windowProcess.MainWindowHandle
$area = [System.Windows.Forms.Screen]::FromHandle($handle).WorkingArea
$width = [Math]::Min(470, $area.Width)
$x = $area.Right - $width
$flags = [uint32]0x0004 # SWP_NOZORDER
$ok = [AgentsMonitorDock]::SetWindowPos($handle, [IntPtr]::Zero, $x, $area.Top, $width, $area.Height, $flags)

if (-not $ok) {
  $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
  throw "Dock Agents Monitor non riuscito. Codice Windows: $code"
}

Write-Output 'DOCK_RIGHT_OK'
