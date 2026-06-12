[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl,

    [string]$BearerToken
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

try {
    $baseUri = [Uri]$BaseUrl
}
catch {
    throw "BaseUrl must be a valid URL."
}

if (
    $baseUri.Scheme -ne "https" -and
    $baseUri.Host -notin @("localhost", "127.0.0.1")
) {
    throw "BaseUrl must use HTTPS except for localhost."
}

$normalizedBaseUrl = $BaseUrl.TrimEnd("/")

function Invoke-SafeWebRequest {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Uri,

        [string]$Method = "GET",

        [hashtable]$Headers = @{},

        [string]$Body
    )

    try {
        $parameters = @{
            Uri = $Uri
            Method = $Method
            UseBasicParsing = $true
        }
        if ($Headers.Count -gt 0) {
            $parameters.Headers = $Headers
        }
        if (-not [string]::IsNullOrEmpty($Body)) {
            $parameters.ContentType = "application/json"
            $parameters.Body = $Body
        }
        $response = Invoke-WebRequest @parameters
        return [PSCustomObject]@{
            StatusCode = [int]$response.StatusCode
            Content = [string]$response.Content
        }
    }
    catch {
        $statusCode = 0
        $responseProperty = $_.Exception.PSObject.Properties["Response"]
        if (
            $null -ne $responseProperty -and
            $null -ne $responseProperty.Value
        ) {
            $statusCode = [int]$responseProperty.Value.StatusCode
        }
        return [PSCustomObject]@{
            StatusCode = $statusCode
            Content = ""
        }
    }
}

$health = Invoke-SafeWebRequest -Uri "$normalizedBaseUrl/health"
if ($health.StatusCode -ne 200) {
    throw "Health check failed with HTTP $($health.StatusCode)."
}
$healthPayload = $health.Content | ConvertFrom-Json
Write-Output "Health: $($health.StatusCode) service=$($healthPayload.service)"

$status = Invoke-SafeWebRequest -Uri "$normalizedBaseUrl/demo/status"
if ($status.StatusCode -ne 200) {
    throw "Status check failed with HTTP $($status.StatusCode)."
}
$statusPayload = $status.Content | ConvertFrom-Json
Write-Output "Status: $($status.StatusCode) evidence_mode=$($statusPayload.evidence_mode)"

if (-not [string]::IsNullOrWhiteSpace($BearerToken)) {
    $headers = @{
        Authorization = "Bearer $BearerToken"
        Accept = "application/json, text/event-stream"
    }
    $requestBody = @{
        jsonrpc = "2.0"
        id = 1
        method = "initialize"
        params = @{
            protocolVersion = "2025-03-26"
            capabilities = @{}
            clientInfo = @{
                name = "contrafactico-remote-smoke"
                version = "1.0.0"
            }
        }
    } | ConvertTo-Json -Depth 8

    $mcp = Invoke-SafeWebRequest `
        -Uri "$normalizedBaseUrl/mcp" `
        -Method "POST" `
        -Headers $headers `
        -Body $requestBody
    if ($mcp.StatusCode -lt 200 -or $mcp.StatusCode -ge 300) {
        throw "MCP initialize failed with HTTP $($mcp.StatusCode)."
    }
    Write-Output "MCP initialize: $($mcp.StatusCode)"
}
else {
    Write-Output "MCP initialize: skipped because no bearer token was supplied."
}
