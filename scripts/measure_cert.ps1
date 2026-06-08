Add-Type -AssemblyName System.Drawing
$path = 'C:\Users\mohit\.cursor\projects\c-Users-mohit-OneDrive-Desktop-computer\assets\c__Users_mohit_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-dbab2dcb-a2c7-41b9-ad42-9ee53da8ef50.png'
$img = [System.Drawing.Image]::FromFile($path)
"$($img.Width)x$($img.Height)"
$img.Dispose()
