[CmdletBinding()]
param(
    [string]$ResourceGroup = "rg-contrafactico",

    [string]$Location = "eastus",

    [string]$ContainerAppName = "ca-contrafactico-mcp",

    [string]$ContainerEnvName = "cae-contrafactico",

    [string]$AcrName,

    [string]$ImageName = "contrafactico-mcp-server",

    [string]$ImageTag = "latest"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-AzCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    & az @Arguments 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Azure CLI command failed. Review the Azure CLI error without sharing secret values."
    }
}

function Invoke-AzText {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $output = & az @Arguments 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Azure CLI query failed. Review the Azure CLI error without sharing secret values."
    }
    return ($output -join [Environment]::NewLine).Trim()
}

function Get-EnvironmentValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [string]$DefaultValue
    )

    $value = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrWhiteSpace($value)) {
        return $DefaultValue
    }
    return $value.Trim()
}

function Require-EnvironmentValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $value = Get-EnvironmentValue -Name $Name
    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "Required environment variable '$Name' is missing."
    }
    return $value
}

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    throw "Azure CLI is required."
}

& az account show --only-show-errors --output none 2>$null
if ($LASTEXITCODE -ne 0) {
    throw "Azure CLI login is required. Run az login before this script."
}

Invoke-AzCommand -Arguments @(
    "extension", "add",
    "--name", "containerapp",
    "--upgrade",
    "--only-show-errors"
)

$portText = Get-EnvironmentValue -Name "PORT" -DefaultValue "3000"
$port = 0
if (-not [int]::TryParse($portText, [ref]$port) -or $port -lt 1 -or $port -gt 65535) {
    throw "PORT must be an integer between 1 and 65535."
}

$useLocalCorpus = Get-EnvironmentValue -Name "USE_LOCAL_CORPUS" -DefaultValue "true"
$authMode = Require-EnvironmentValue -Name "AUTH_MODE"
$copilotConnectorAuthMode = Get-EnvironmentValue -Name "COPILOT_CONNECTOR_AUTH_MODE" -DefaultValue "inherit"
$mcpTransportMode = Get-EnvironmentValue -Name "MCP_TRANSPORT_MODE" -DefaultValue "stateful"
$mcpRelaxAcceptHeader = Get-EnvironmentValue -Name "MCP_RELAX_ACCEPT_HEADER" -DefaultValue "true"
$mcpConnectorTestGetOk = Get-EnvironmentValue -Name "MCP_CONNECTOR_TEST_GET_OK" -DefaultValue "false"
$demoEndpointsPublic = Get-EnvironmentValue -Name "DEMO_ENDPOINTS_PUBLIC" -DefaultValue "false"

if ($useLocalCorpus -notin @("true", "false")) {
    throw "USE_LOCAL_CORPUS must be true or false."
}
if ($demoEndpointsPublic -notin @("true", "false")) {
    throw "DEMO_ENDPOINTS_PUBLIC must be true or false."
}
if ($mcpTransportMode -notin @("stateless", "stateful")) {
    throw "MCP_TRANSPORT_MODE must be stateless or stateful."
}
if ($mcpRelaxAcceptHeader -notin @("true", "false")) {
    throw "MCP_RELAX_ACCEPT_HEADER must be true or false."
}
if ($copilotConnectorAuthMode -notin @("inherit", "public")) {
    throw "COPILOT_CONNECTOR_AUTH_MODE must be inherit or public."
}
if ($mcpConnectorTestGetOk -notin @("true", "false")) {
    throw "MCP_CONNECTOR_TEST_GET_OK must be true or false."
}
if ($authMode -notin @("dev-bearer", "entra-jwt")) {
    throw "Production deployment requires AUTH_MODE=dev-bearer or AUTH_MODE=entra-jwt."
}

$maxReplicas = if ($mcpTransportMode -eq "stateful") { 1 } else { 3 }

$safeEnvironment = [System.Collections.Generic.List[string]]::new()
$safeEnvironment.Add("NODE_ENV=production")
$safeEnvironment.Add("PORT=$port")
$safeEnvironment.Add("USE_LOCAL_CORPUS=$useLocalCorpus")
$safeEnvironment.Add("AUTH_MODE=$authMode")
$safeEnvironment.Add("COPILOT_CONNECTOR_AUTH_MODE=$copilotConnectorAuthMode")
$safeEnvironment.Add("MCP_TRANSPORT_MODE=$mcpTransportMode")
$safeEnvironment.Add("MCP_RELAX_ACCEPT_HEADER=$mcpRelaxAcceptHeader")
$safeEnvironment.Add("MCP_CONNECTOR_TEST_GET_OK=$mcpConnectorTestGetOk")
$safeEnvironment.Add("DEMO_ENDPOINTS_PUBLIC=$demoEndpointsPublic")

foreach ($name in @(
    "CORS_ALLOWED_ORIGINS",
    "SEARCH_ENDPOINT",
    "SEARCH_KB_NAME",
    "SEARCH_API_VERSION",
    "FOUNDRY_DEBUG_SHAPE",
    "ENTRA_TENANT_ID",
    "ENTRA_AUDIENCE",
    "ENTRA_ISSUER",
    "ENTRA_JWKS_URI",
    "AOAI_ENDPOINT",
    "AOAI_DEPLOYMENT",
    "AOAI_API_VERSION"
)) {
    $value = Get-EnvironmentValue -Name $name
    if (-not [string]::IsNullOrWhiteSpace($value)) {
        $safeEnvironment.Add("$name=$value")
    }
}

$secretValues = [System.Collections.Generic.List[string]]::new()
$secretReferences = [System.Collections.Generic.List[string]]::new()

if ($useLocalCorpus -eq "false") {
    $null = Require-EnvironmentValue -Name "SEARCH_ENDPOINT"
    $null = Require-EnvironmentValue -Name "SEARCH_KB_NAME"
    $searchApiKey = Require-EnvironmentValue -Name "SEARCH_API_KEY"
    $secretValues.Add("search-api-key=$searchApiKey")
    $secretReferences.Add("SEARCH_API_KEY=secretref:search-api-key")
}

if ($authMode -eq "dev-bearer") {
    $devBearerToken = Require-EnvironmentValue -Name "DEV_BEARER_TOKEN"
    $secretValues.Add("dev-bearer-token=$devBearerToken")
    $secretReferences.Add("DEV_BEARER_TOKEN=secretref:dev-bearer-token")
}
else {
    $null = Require-EnvironmentValue -Name "ENTRA_TENANT_ID"
    $null = Require-EnvironmentValue -Name "ENTRA_AUDIENCE"
}

$aoaiApiKey = Get-EnvironmentValue -Name "AOAI_API_KEY"
if (-not [string]::IsNullOrWhiteSpace($aoaiApiKey)) {
    $secretValues.Add("aoai-api-key=$aoaiApiKey")
    $secretReferences.Add("AOAI_API_KEY=secretref:aoai-api-key")
}

$groupExists = Invoke-AzText -Arguments @(
    "group", "exists",
    "--name", $ResourceGroup,
    "--only-show-errors"
)
if ($groupExists -ne "true") {
    Invoke-AzCommand -Arguments @(
        "group", "create",
        "--name", $ResourceGroup,
        "--location", $Location,
        "--only-show-errors",
        "--output", "none"
    )
}

& az containerapp env show `
    --name $ContainerEnvName `
    --resource-group $ResourceGroup `
    --only-show-errors `
    --output none 2>$null
if ($LASTEXITCODE -ne 0) {
    Invoke-AzCommand -Arguments @(
        "containerapp", "env", "create",
        "--name", $ContainerEnvName,
        "--resource-group", $ResourceGroup,
        "--location", $Location,
        "--only-show-errors",
        "--output", "none"
    )
}

$appExists = $true
& az containerapp show `
    --name $ContainerAppName `
    --resource-group $ResourceGroup `
    --only-show-errors `
    --output none 2>$null
if ($LASTEXITCODE -ne 0) {
    $appExists = $false
}

$loginServer = $null
if (-not [string]::IsNullOrWhiteSpace($AcrName)) {
    if ($AcrName -notmatch "^[a-zA-Z0-9]{5,50}$") {
        throw "AcrName must contain 5-50 alphanumeric characters."
    }

    & az acr show `
        --name $AcrName `
        --resource-group $ResourceGroup `
        --only-show-errors `
        --output none 2>$null
    if ($LASTEXITCODE -ne 0) {
        Invoke-AzCommand -Arguments @(
            "acr", "create",
            "--name", $AcrName,
            "--resource-group", $ResourceGroup,
            "--location", $Location,
            "--sku", "Basic",
            "--admin-enabled", "false",
            "--only-show-errors",
            "--output", "none"
        )
    }
    Invoke-AzCommand -Arguments @(
        "acr", "config", "authentication-as-arm", "update",
        "--registry", $AcrName,
        "--status", "enabled",
        "--only-show-errors",
        "--output", "none"
    )

    $repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
    Invoke-AzCommand -Arguments @(
        "acr", "build",
        "--registry", $AcrName,
        "--image", "${ImageName}:$ImageTag",
        "--file", (Join-Path $repositoryRoot "contrafactico-mcp-server/Dockerfile"),
        $repositoryRoot,
        "--only-show-errors",
        "--output", "none"
    )
    $loginServer = Invoke-AzText -Arguments @(
        "acr", "show",
        "--name", $AcrName,
        "--query", "loginServer",
        "--output", "tsv",
        "--only-show-errors"
    )
    $imageReference = "$loginServer/${ImageName}:$ImageTag"
}
elseif ($ImageName.Contains("/")) {
    $imageReference = "${ImageName}:$ImageTag"
}
elseif ($appExists) {
    $imageReference = Invoke-AzText -Arguments @(
        "containerapp", "show",
        "--name", $ContainerAppName,
        "--resource-group", $ResourceGroup,
        "--query", "properties.template.containers[0].image",
        "--output", "tsv",
        "--only-show-errors"
    )
}
else {
    throw "AcrName or a fully qualified ImageName is required for the initial deployment."
}

$allEnvironment = [System.Collections.Generic.List[string]]::new()
foreach ($item in $safeEnvironment) {
    $allEnvironment.Add($item)
}
foreach ($item in $secretReferences) {
    $allEnvironment.Add($item)
}

if (-not $appExists) {
    $createImage = if ($null -eq $loginServer) {
        $imageReference
    }
    else {
        "mcr.microsoft.com/k8se/quickstart:latest"
    }
    $createPort = if ($null -eq $loginServer) { $port } else { 80 }
    $createArguments = [System.Collections.Generic.List[string]]::new()
    foreach ($item in @(
        "containerapp", "create",
        "--name", $ContainerAppName,
        "--resource-group", $ResourceGroup,
        "--environment", $ContainerEnvName,
        "--image", $createImage,
        "--ingress", "external",
        "--target-port", "$createPort",
        "--min-replicas", "0",
        "--max-replicas", "$maxReplicas",
        "--only-show-errors",
        "--output", "none"
    )) {
        $createArguments.Add($item)
    }
    if ($secretValues.Count -gt 0) {
        $createArguments.Add("--secrets")
        foreach ($secret in $secretValues) {
            $createArguments.Add($secret)
        }
    }
    $createArguments.Add("--env-vars")
    foreach ($item in $allEnvironment) {
        $createArguments.Add($item)
    }
    Invoke-AzCommand -Arguments $createArguments.ToArray()
}

if ($secretValues.Count -gt 0) {
    $secretArguments = [System.Collections.Generic.List[string]]::new()
    foreach ($item in @(
        "containerapp", "secret", "set",
        "--name", $ContainerAppName,
        "--resource-group", $ResourceGroup,
        "--only-show-errors",
        "--output", "none",
        "--secrets"
    )) {
        $secretArguments.Add($item)
    }
    foreach ($secret in $secretValues) {
        $secretArguments.Add($secret)
    }
    Invoke-AzCommand -Arguments $secretArguments.ToArray()
}

if ($null -ne $loginServer) {
    Invoke-AzCommand -Arguments @(
        "containerapp", "identity", "assign",
        "--name", $ContainerAppName,
        "--resource-group", $ResourceGroup,
        "--system-assigned",
        "--only-show-errors",
        "--output", "none"
    )
    $principalId = Invoke-AzText -Arguments @(
        "containerapp", "identity", "show",
        "--name", $ContainerAppName,
        "--resource-group", $ResourceGroup,
        "--query", "principalId",
        "--output", "tsv",
        "--only-show-errors"
    )
    $registryId = Invoke-AzText -Arguments @(
        "acr", "show",
        "--name", $AcrName,
        "--query", "id",
        "--output", "tsv",
        "--only-show-errors"
    )
    $roleAssignment = Invoke-AzText -Arguments @(
        "role", "assignment", "list",
        "--assignee", $principalId,
        "--scope", $registryId,
        "--role", "AcrPull",
        "--query", "[0].id",
        "--output", "tsv",
        "--only-show-errors"
    )
    if ([string]::IsNullOrWhiteSpace($roleAssignment)) {
        Invoke-AzCommand -Arguments @(
            "role", "assignment", "create",
            "--assignee-object-id", $principalId,
            "--assignee-principal-type", "ServicePrincipal",
            "--scope", $registryId,
            "--role", "AcrPull",
            "--only-show-errors",
            "--output", "none"
        )
    }
    Invoke-AzCommand -Arguments @(
        "containerapp", "registry", "set",
        "--name", $ContainerAppName,
        "--resource-group", $ResourceGroup,
        "--server", $loginServer,
        "--identity", "system",
        "--only-show-errors",
        "--output", "none"
    )
}

$updateArguments = [System.Collections.Generic.List[string]]::new()
foreach ($item in @(
    "containerapp", "update",
    "--name", $ContainerAppName,
    "--resource-group", $ResourceGroup,
    "--image", $imageReference,
    "--min-replicas", "0",
    "--max-replicas", "$maxReplicas",
    "--only-show-errors",
    "--output", "none",
    "--set-env-vars"
)) {
    $updateArguments.Add($item)
}
foreach ($item in $allEnvironment) {
    $updateArguments.Add($item)
}
Invoke-AzCommand -Arguments $updateArguments.ToArray()

Invoke-AzCommand -Arguments @(
    "containerapp", "ingress", "enable",
    "--name", $ContainerAppName,
    "--resource-group", $ResourceGroup,
    "--type", "external",
    "--target-port", "$port",
    "--transport", "auto",
    "--only-show-errors",
    "--output", "none"
)

$fqdn = Invoke-AzText -Arguments @(
    "containerapp", "show",
    "--name", $ContainerAppName,
    "--resource-group", $ResourceGroup,
    "--query", "properties.configuration.ingress.fqdn",
    "--output", "tsv",
    "--only-show-errors"
)

Write-Output "Container App: $ContainerAppName"
Write-Output "Health: https://$fqdn/health"
Write-Output "Status: https://$fqdn/demo/status"
Write-Output "MCP: https://$fqdn/mcp"
Write-Output "Copilot MCP: https://$fqdn/mcp-copilot"
Write-Output "MCP transport mode: $mcpTransportMode"
Write-Output "Copilot connector auth mode: $copilotConnectorAuthMode"
