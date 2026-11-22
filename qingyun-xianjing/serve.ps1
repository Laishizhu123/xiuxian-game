param(
  [int]$Port = 8787
)

$Root = $PSScriptRoot
$Prefix = "http://127.0.0.1:$Port/"
$Listener = [System.Net.HttpListener]::new()
$Listener.Prefixes.Add($Prefix)
$Listener.Start()
Write-Output "Serving $Root at $Prefix"

$MimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png"  = "image/png"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
  ".glb"  = "model/gltf-binary"
  ".vrm"  = "model/gltf-binary"
}

try {
  while ($Listener.IsListening) {
    $Ctx = $Listener.GetContext()
    try {
      $RelPath = $Ctx.Request.Url.AbsolutePath.TrimStart('/')
      if ([string]::IsNullOrEmpty($RelPath)) { $RelPath = "index.html" }
      $FullPath = Join-Path $Root $RelPath
      if ((Test-Path $FullPath) -and -not (Get-Item $FullPath).PSIsContainer) {
        $Ext = [System.IO.Path]::GetExtension($FullPath).ToLowerInvariant()
        $Ctx.Response.ContentType = if ($MimeTypes.ContainsKey($Ext)) { $MimeTypes[$Ext] } else { "application/octet-stream" }
        $Ctx.Response.Headers.Add("Cache-Control", "no-store")
        $Bytes = [System.IO.File]::ReadAllBytes($FullPath)
        $Ctx.Response.ContentLength64 = $Bytes.Length
        $Ctx.Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
      } else {
        $Ctx.Response.StatusCode = 404
      }
    } catch {
      # Ignore aborted client connections (e.g. page refresh mid-fetch)
    } finally {
      try { $Ctx.Response.Close() } catch {}
    }
  }
} finally {
  $Listener.Stop()
}
