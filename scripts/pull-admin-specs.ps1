# Pull exact Figma specs for the admin screens and cache them to
# design-reference/admin/specs-<name>.txt. Cache-first: figma-api.py reuses
# design-reference/api-<id>.json with zero network calls once a node is cached,
# so re-running this script is free.
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot        # storefront/
$repo = Split-Path -Parent $root                # project root
$out = Join-Path $repo "design-reference\admin"
New-Item -ItemType Directory -Force -Path $out | Out-Null

$fileKey = "uFyZPtj1mgKqkaBMo8lRA7"
$frames = [ordered]@{
  "login"           = "3805-4435"
  "overview"        = "3814-5507"
  "orders"          = "3835-19533"
  "order-detail"    = "3835-17437"
  "customers"       = "3847-20531"
  "promotions"      = "3814-7183"
  "users"           = "3803-3429"
  "settings"        = "3834-15852"
  "product-edit"    = "3833-13672"
  "product-new"     = "3833-10813"
  "orders-filtered" = "3847-20856"
}

foreach ($name in $frames.Keys) {
  $dest = Join-Path $out "specs-$name.txt"
  if (Test-Path $dest) {
    Write-Output "SKIP  $name (already cached)"
    continue
  }
  Write-Output "PULL  $name  $($frames[$name])"
  Push-Location $root
  python scripts/figma-api.py nodes $fileKey $frames[$name] | Out-File -FilePath $dest -Encoding utf8
  Pop-Location
  $len = (Get-Item $dest).Length
  if ($len -lt 200) {
    Write-Output "      FAILED (${len}b) - likely rate limited; removing stub"
    Remove-Item $dest
    break
  }
  Write-Output "      ok ($len bytes)"
}
