$WshShell = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop "Barraca Uno.lnk"
$shortcut = $WshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "c:\Users\Administrator\Downloads\Barraca-Uno-para-Antigravity\dist-desktop\BarracaUno.exe"
$shortcut.WorkingDirectory = "c:\Users\Administrator\Downloads\Barraca-Uno-para-Antigravity\dist-desktop"
$shortcut.IconLocation = "c:\Users\Administrator\Downloads\Barraca-Uno-para-Antigravity\dist-desktop\app.ico"
$shortcut.Description = "Barraca Uno - Sistema de Gestión"
$shortcut.Save()
Write-Host "Acceso directo creado con exito en: $shortcutPath"
