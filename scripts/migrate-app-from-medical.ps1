param(
    [Parameter(Mandatory = $true)]
    [string]$AppName,
    [Parameter(Mandatory = $true)]
    [string]$PackageName,
    [Parameter(Mandatory = $true)]
    [string]$DisplayName,
    [Parameter(Mandatory = $true)]
    [string]$CatalogRoute,
    [Parameter(Mandatory = $true)]
    [string]$CatalogRouteKey,
    [Parameter(Mandatory = $true)]
    [string]$DetailPath,
    [Parameter(Mandatory = $true)]
    [string]$DetailMethod,
    [Parameter(Mandatory = $true)]
    [string]$WorkflowServiceName,
    [Parameter(Mandatory = $true)]
    [string]$WorkflowModelsName,
    [Parameter(Mandatory = $true)]
    [string]$AppId,
    [string]$DemoUrl = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$medical = Join-Path $root "medical"
$target = Join-Path $root $AppName

if (-not (Test-Path $target)) { throw "Target app not found: $target" }

Write-Host "=== Migrating $AppName from medical ==="

# Backup app-specific home UI
$homeBackup = Join-Path $env:TEMP "cg-home-backup-$AppName"
if (Test-Path $homeBackup) { Remove-Item -Recurse -Force $homeBackup }
Copy-Item -Recurse (Join-Path $target "src\app\modules\home") $homeBackup

function Copy-IfExists($src, $dst) {
    if (Test-Path $src) {
        $parent = Split-Path $dst -Parent
        if ($parent -and -not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        Copy-Item -Recurse -Force $src $dst
    }
}

# Root files
foreach ($f in @('package.json', 'angular.json', 'proxy.conf.json')) {
    Copy-Item -Force (Join-Path $medical $f) (Join-Path $target $f)
}

# src root files
foreach ($f in @('AppPreBootstrap.ts', 'root.component.ts', 'root.module.ts', 'root-routing.module.ts', 'main.ts', 'index.html', 'styles.scss', 'typings.d.ts')) {
    Copy-IfExists (Join-Path $medical "src\$f") (Join-Path $target "src\$f")
}

# App module files
Copy-IfExists (Join-Path $medical "src\app\shared.module.ts") (Join-Path $target "src\app\shared.module.ts")
Copy-IfExists (Join-Path $medical "src\app\app.component.scss") (Join-Path $target "src\app\app.component.scss")

# Shared infrastructure
$sharedDirs = @(
    'src\app\shared\idp-auth',
    'src\app\shared\core',
    'src\app\shared\auth',
    'src\app\shared\common',
    'src\app\shared\session',
    'src\app\shared\components\alert',
    'src\app\shared\helpers',
    'src\shared\service-proxies',
    'src\shared\utils',
    'src\assets',
    'src\environments'
)
foreach ($d in $sharedDirs) {
    Copy-IfExists (Join-Path $medical $d) (Join-Path $target $d)
}

# Layout + auth + workflow-wired pages
Copy-IfExists (Join-Path $medical "src\app\modules\layout") (Join-Path $target "src\app\modules\layout")
Copy-IfExists (Join-Path $medical "src\app\modules\auth") (Join-Path $target "src\app\modules\auth")
foreach ($p in @('favourites', 'explore', 'profile')) {
    Copy-IfExists (Join-Path $medical "src\app\modules\home\$p") (Join-Path $target "src\app\modules\home\$p")
}

# Workflow HTTP (generic)
Copy-IfExists (Join-Path $medical "src\app\shared\workflow\workflow-http.service.ts") (Join-Path $target "src\app\shared\workflow\workflow-http.service.ts")
Copy-IfExists (Join-Path $medical "src\app\shared\workflow\workflow.models.ts") (Join-Path $target "src\app\shared\workflow\workflow.models.ts")

# Restore home UI
Copy-IfExists $homeBackup (Join-Path $target "src\app\modules\home")

# Remove legacy artifacts
$legacyFiles = @(
    'src\shared\service-proxies\service-proxies.ts',
    'src\app\modules\auth\pages\sign-in\login.service.ts',
    'playwright.config.ts',
    'src\environments\environment.k8s.ts'
)
foreach ($lf in $legacyFiles) {
    $p = Join-Path $target $lf
    if (Test-Path $p) { Remove-Item -Force $p }
}
$legacyDirs = @('tests-e2e', 'src\app\modules\dashboard', 'src\app\modules\home\history', 'src\app\modules\home\profile\community', 'src\app\modules\home\pages\gallery', 'src\app\modules\layout\components\sidebar', 'src\app\modules\getInTouch', 'src\app\modules\scan-qrcode')
foreach ($ld in $legacyDirs) {
    $p = Join-Path $target $ld
    if (Test-Path $p) { Remove-Item -Recurse -Force $p }
}

# Wallet: remove doctor route module
if ($AppName -eq 'wallet') {
    $doctorMod = Join-Path $target 'src\app\modules\home\pages\doctor'
    if (Test-Path $doctorMod) { Remove-Item -Recurse -Force $doctorMod }
}

# Rename package / project in package.json and angular.json
(Get-Content (Join-Path $target 'package.json') -Raw) `
    -replace 'cloudgate-medical', $PackageName `
    -replace '"name": "angular-tailwind"', "`"name`": `"$PackageName`"" | Set-Content (Join-Path $target 'package.json') -NoNewline

(Get-Content (Join-Path $target 'angular.json') -Raw) `
    -replace 'cloudgate-medical', $PackageName | Set-Content (Join-Path $target 'angular.json') -NoNewline

# AppConsts
$appConsts = @"
export class AppConsts {
  static readonly tenancyNamePlaceHolderInUrl = '{TENANCY_NAME}';
  static remoteServiceBaseUrl: string = '';
  static remoteServiceBaseUrlFormat: string;
  static appBaseUrl: string = '';
  static appBaseHref: string;
  static appBaseUrlFormat: string;
  static recaptchaSiteKey: string;
  static subscriptionExpireNootifyDayCount: number;
  static pageName: string = 'Home';
  static pageAction: string = 'Menu';
  static localeMappings: any = [];
  static readonly userManagement = { defaultAdminUserName: 'admin' };
  static readonly localization = { defaultLocalizationSourceName: 'Zero' };
  static readonly authorization = { encrptedAuthTokenName: 'enc_auth_token' };
  static readonly grid = { defaultPageSize: 10 };
  static readonly MinimumUpgradePaymentAmount = 1;
  static readonly WebAppGuiVersion = '12.3.0';
  static readonly PreventNotExistingTenantSubdomains = false;
  static idpBaseUrl = '';
  static idpApiUrl = '';
  static idpTenancyName = '';
  static idpReturnUrl = '';
  static workflowGatewayUrl = '';
  static workflowEnvironment = 'sbx';
  static workflowProjectPath = 'api';
  static $CatalogRouteKey = '$CatalogRoute';
}
"@
Set-Content (Join-Path $target 'src\app\shared\AppConsts.ts') $appConsts

# Branding
$brandingDir = Join-Path $target 'src\app\shared\branding'
if (-not (Test-Path $brandingDir)) { New-Item -ItemType Directory -Path $brandingDir -Force | Out-Null }
$branding = @"
export const AppBranding = {
  appName: '$DisplayName',
  appDescription: '$DisplayName — Cloudgate app template',
  logoUrl: './assets/images/logo.png',
  faviconUrl: './favicon.ico',
};
"@
Set-Content (Join-Path $target 'src\app\shared\branding\app-branding.ts') $branding

# Workflow folder
$workflowDir = Join-Path $target 'src\app\shared\workflow'
if (-not (Test-Path $workflowDir)) { New-Item -ItemType Directory -Path $workflowDir -Force | Out-Null }

# Workflow models (copy from medical, rename)
$modelsFile = ($AppName + '-catalog.models.ts')
$emptyConst = "EMPTY_$($WorkflowModelsName.ToUpper())"
$modelsSrc = Get-Content (Join-Path $medical 'src\app\shared\workflow\medical.models.ts') -Raw
$modelsSrc = $modelsSrc `
    -replace 'MedicalDoctor', "${WorkflowModelsName}Item" `
    -replace 'MedicalCatalog', $WorkflowModelsName `
    -replace 'EMPTY_MEDICAL_CATALOG', $emptyConst
Set-Content (Join-Path $target "src\app\shared\workflow\$modelsFile") $modelsSrc

# Workflow service
$svcFile = ($AppName + '-workflow.service.ts')
$svcSrc = Get-Content (Join-Path $medical 'src\app\shared\workflow\medical-workflow.service.ts') -Raw
$svcSrc = $svcSrc `
    -replace 'MedicalWorkflowService', $WorkflowServiceName `
    -replace 'MedicalCatalogLoadState', "${WorkflowModelsName}LoadState" `
    -replace 'MedicalCatalog', $WorkflowModelsName `
    -replace 'MedicalDoctor', "${WorkflowModelsName}Item" `
    -replace 'EMPTY_MEDICAL_CATALOG', $emptyConst `
    -replace 'medicalCatalogRoute', $CatalogRouteKey `
    -replace 'medicalCatalogUrl', "${CatalogRouteKey}Url" `
    -replace 'GET /doctors', "GET /$CatalogRoute" `
    -replace 'medical.models', "$AppName-catalog.models"
Set-Content (Join-Path $target "src\app\shared\workflow\$svcFile") $svcSrc

# workflow.config.ts
$wfConfig = Get-Content (Join-Path $medical 'src\app\shared\workflow\workflow.config.ts') -Raw
$wfConfig = $wfConfig `
    -replace 'medicalCatalogRoute', $CatalogRouteKey `
    -replace 'medicalCatalogUrl', "${CatalogRouteKey}Url"
Set-Content (Join-Path $target 'src\app\shared\workflow\workflow.config.ts') $wfConfig

# app-component-base detail navigation
$basePath = Join-Path $target 'src\app\shared\common\app-component-base.ts'
$base = Get-Content $basePath -Raw
$base = $base -replace 'openDoctorDetail|openPlaceDetail|openBidDetail|openProductDetail|openTransferDetail', $DetailMethod
$base = $base -replace "this\.router\.navigate\(\['/home/[^']+'\], \{ queryParams: [^}]+\}\);", "this.router.navigate(['$DetailPath'], { queryParams: itemId ? { id: itemId } : {} });"
if ($base -notmatch "$DetailMethod\(") {
    $base = $base -replace '(navigate\(path: string\) \{)', @"
  $DetailMethod(itemId?: string) {
    this.router.navigate(['$DetailPath'], { queryParams: itemId ? { id: itemId } : {} });
  }

  navigate(path: string) {
"@
}
Set-Content $basePath $base

# layout-routing.module.ts
$routing = @"
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout.component';
import { AppRouteGuard } from 'src/app/shared/common/auth/auth-route-guard';

const routes: Routes = [
  {
    path: '',
    canActivate: [AppRouteGuard],
    canActivateChild: [AppRouteGuard],
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: '/home', pathMatch: 'full' },
      {
        path: 'home',
        loadChildren: () => import('../home/home.module').then((m) => m.HomeModule),
        canLoad: [AppRouteGuard],
      },
      {
        path: '$DetailPath'.TrimStart('/'),
        loadChildren: () => import('../home/pages/$(
            switch ($AppName) {
                'nft' { 'place-bid/place-bid.module' }
                'store' { 'product/product.module' }
                'wallet' { 'transfer/transfer.module' }
                default { 'doctor/doctor.module' }
            }
        )').then((m) => m.$(
            switch ($AppName) {
                'nft' { 'PlaceBidModule' }
                'store' { 'ProductModule' }
                'wallet' { 'TransferModule' }
                default { 'DoctorModule' }
            }
        )),
      },
      {
        path: 'favourites',
        loadChildren: () => import('../home/favourites/favourites.module').then((m) => m.FavouritesModule),
      },
      {
        path: 'explore',
        loadChildren: () => import('../home/explore/explore.module').then((m) => m.ExploreModule),
      },
      {
        path: 'profile',
        loadChildren: () => import('../home/profile/profile.module').then((m) => m.ProfileModule),
      },
      {
        path: 'profile/edit',
        loadChildren: () => import('../home/profile/profile-edit/profile-edit.module').then((m) => m.ProfileEditModule),
      },
      { path: '**', redirectTo: 'error/404' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LayoutRoutingModule {}
"@
# Fix routing - the above has issues with nested switch. Write explicitly per app.
$detailModule = switch ($AppName) {
    'nft' { @{ path = 'home/bid'; import = '../home/pages/place-bid/place-bid.module'; mod = 'PlaceBidModule' } }
    'store' { @{ path = 'home/product'; import = '../home/pages/product/product.module'; mod = 'ProductModule' } }
    'wallet' { @{ path = 'home/transfer'; import = '../home/pages/transfer/transfer.module'; mod = 'TransferModule' } }
    default { @{ path = 'home/doctor'; import = '../home/pages/doctor/doctor.module'; mod = 'DoctorModule' } }
}
$routing = @"
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout.component';
import { AppRouteGuard } from 'src/app/shared/common/auth/auth-route-guard';

const routes: Routes = [
  {
    path: '',
    canActivate: [AppRouteGuard],
    canActivateChild: [AppRouteGuard],
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: '/home', pathMatch: 'full' },
      { path: 'home', loadChildren: () => import('../home/home.module').then((m) => m.HomeModule), canLoad: [AppRouteGuard] },
      { path: '$($detailModule.path)', loadChildren: () => import('$($detailModule.import)').then((m) => m.$($detailModule.mod)) },
      { path: 'favourites', loadChildren: () => import('../home/favourites/favourites.module').then((m) => m.FavouritesModule) },
      { path: 'explore', loadChildren: () => import('../home/explore/explore.module').then((m) => m.ExploreModule) },
      { path: 'profile', loadChildren: () => import('../home/profile/profile.module').then((m) => m.ProfileModule) },
      { path: 'profile/edit', loadChildren: () => import('../home/profile/profile-edit/profile-edit.module').then((m) => m.ProfileEditModule) },
      { path: '**', redirectTo: 'error/404' },
    ],
  },
];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class LayoutRoutingModule {}
"@
Set-Content (Join-Path $target 'src\app\modules\layout\layout-routing.module.ts') $routing

# layout.component hide bottom nav for detail path
$layoutPath = Join-Path $target 'src\app\modules\layout\layout.component.ts'
$layout = Get-Content $layoutPath -Raw
$layout = $layout -replace "/home/doctor|/home/place|/home/bid|/home/product|/home/transfer", $DetailPath
Set-Content $layoutPath $layout

# capacitor.config.ts
$cap = @"
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: '$AppId',
  appName: '$DisplayName',
  webDir: 'dist',
  server: { androidScheme: 'https', iosScheme: 'https' },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '257440546946-udddj313e9va4r9pk4dqbvqj7ig487la.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    CapacitorCookies: { enabled: true },
  },
};

export default config;
"@
Set-Content (Join-Path $target 'capacitor.config.ts') $cap

# index.html title
$index = Get-Content (Join-Path $target 'src\index.html') -Raw
$index = $index -replace '<title>[^<]+</title>', "<title>$DisplayName</title>"
Set-Content (Join-Path $target 'src\index.html') $index

# template.json
if (-not $DemoUrl) { $DemoUrl = "https://$AppName-demo.cloudweb.dev/" }
$templateJson = @"
{
  "id": "$AppName",
  "name": "$DisplayName",
  "description": "Angular $AppName demo with workflow-backed catalog — import .template/workflow-template.json for GET /$CatalogRoute.",
  "folder": "$AppName",
  "framework": "Angular",
  "devCommand": "npm install && npm run start",
  "devPort": 3000,
  "demoUrl": "$DemoUrl",
  "thumbnail": "https://raw.githubusercontent.com/dev-appworld/cloudgate-app-templates/main/$AppName/banner.png",
  "tags": ["angular", "$AppName", "tailwind", "capacitor"],
  "workflowTemplate": ".template/workflow-template.json",
  "workflowImport": {
    "description": "Creates the GET /$CatalogRoute API the app calls at runtime.",
    "file": ".template/workflow-template.json",
    "projectPath": "api",
    "route": "$CatalogRoute",
    "publishHint": "Publish the catalog endpoint to sandbox, then test GET /sbx/api/$CatalogRoute on your apps gateway."
  },
  "configSetup": {
    "kind": "angular-appconfig",
    "targets": ["src/assets/appconfig.json", "src/assets/appconfig.production.json"]
  }
}
"@
Set-Content (Join-Path $target 'template.json') $templateJson

# workflow-template.json from medical
$templateDir = Join-Path $target '.template'
if (-not (Test-Path $templateDir)) { New-Item -ItemType Directory -Path $templateDir -Force | Out-Null }
Copy-Item -Force (Join-Path $medical '.template\workflow-template.json') (Join-Path $target '.template\workflow-template.json')
$wf = Get-Content (Join-Path $target '.template\workflow-template.json') -Raw
$wf = $wf -replace '"Route": "doctors"', "`"Route`": `"$CatalogRoute`""
$wf = $wf -replace 'Doctor Catalog', "$($AppName.Substring(0,1).ToUpper() + $AppName.Substring(1)) Catalog"
$wf = $wf -replace 'MedicalCatalogFunction', "${WorkflowModelsName}CatalogFunction"
Set-Content (Join-Path $target '.template\workflow-template.json') $wf

# Bulk replace Medical* -> App-specific in favourites/explore/home if copied from medical explore
Get-ChildItem (Join-Path $target 'src') -Recurse -Include '*.ts','*.html' | ForEach-Object {
    $c = Get-Content $_.FullName -Raw
    $orig = $c
    $c = $c -replace 'MedicalWorkflowService', $WorkflowServiceName
    $c = $c -replace 'MedicalCatalog', $WorkflowModelsName
    $c = $c -replace 'MedicalDoctor', "${WorkflowModelsName}Item"
    $c = $c -replace 'medicalWorkflow', ($WorkflowServiceName.Substring(0,1).ToLower() + $WorkflowServiceName.Substring(1))
    $c = $c -replace 'openDoctorDetail', $DetailMethod
    $c = $c -replace 'medicalCatalogRoute', $CatalogRouteKey
    $c = $c -replace 'cloudgate-medical', $PackageName
    $c = $c -replace 'Cloudgate Medical Demo', $DisplayName
    if ($c -ne $orig) { Set-Content $_.FullName $c }
}

# Remove old medical workflow files if present
Remove-Item -Force (Join-Path $target 'src\app\shared\workflow\medical-workflow.service.ts') -ErrorAction SilentlyContinue
Remove-Item -Force (Join-Path $target 'src\app\shared\workflow\medical.models.ts') -ErrorAction SilentlyContinue

Write-Host "=== Done $AppName - run npm install and npm run build ==="
