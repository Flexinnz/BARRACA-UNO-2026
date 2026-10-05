Add-Type -AssemblyName System.Drawing
$imgPath = Resolve-Path "public/logo.png"
$bmp = [System.Drawing.Bitmap]::FromFile($imgPath)
$thumb = New-Object System.Drawing.Bitmap($bmp, 256, 256)
$iconHandle = $thumb.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($iconHandle)
$icoPath = Join-Path (Get-Location) "public/app.ico"
$fs = [System.IO.File]::Create($icoPath)
$icon.Save($fs)
$fs.Close()
Write-Host "Icon created successfully at $icoPath"
