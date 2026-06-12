[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl,

    [string]$BearerToken
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Net.Http

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
            Headers = $response.Headers
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
            Headers = @{}
        }
    }
}

function Get-ResponseHeaderValue {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Headers,

        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    try {
        $value = $Headers[$Name]
        if ($null -eq $value) {
            return $null
        }
        $firstValue = $value | Select-Object -First 1
        if ($null -eq $firstValue) {
            return $null
        }
        return ([string]$firstValue).Trim()
    }
    catch {
        return $null
    }
}

function Invoke-McpStreamProbe {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Uri,

        [Parameter(Mandatory = $true)]
        [hashtable]$Headers
    )

    $client = [System.Net.Http.HttpClient]::new()
    $request = [System.Net.Http.HttpRequestMessage]::new(
        [System.Net.Http.HttpMethod]::Get,
        $Uri
    )
    $cancellation = [System.Threading.CancellationTokenSource]::new()

    try {
        foreach ($name in $Headers.Keys) {
            $null = $request.Headers.TryAddWithoutValidation(
                [string]$name,
                [string]$Headers[$name]
            )
        }
        $cancellation.CancelAfter([TimeSpan]::FromSeconds(15))
        $response = $client.SendAsync(
            $request,
            [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead,
            $cancellation.Token
        ).GetAwaiter().GetResult()
        try {
            return [int]$response.StatusCode
        }
        finally {
            $response.Dispose()
        }
    }
    catch {
        return 0
    }
    finally {
        $cancellation.Dispose()
        $request.Dispose()
        $client.Dispose()
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

    $mcpStatus = Invoke-SafeWebRequest `
        -Uri "$normalizedBaseUrl/mcp/status" `
        -Headers $headers
    if ($mcpStatus.StatusCode -ne 200) {
        throw "MCP status check failed with HTTP $($mcpStatus.StatusCode)."
    }
    $mcpStatusPayload = $mcpStatus.Content | ConvertFrom-Json
    Write-Output "MCP status: $($mcpStatus.StatusCode) transport_mode=$($mcpStatusPayload.transport_mode) active_sessions=$($mcpStatusPayload.active_sessions)"

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
    $sessionId = Get-ResponseHeaderValue `
        -Headers $mcp.Headers `
        -Name "Mcp-Session-Id"
    Write-Output "MCP initialize: $($mcp.StatusCode) session=$(-not [string]::IsNullOrWhiteSpace($sessionId))"

    $sessionHeaders = @{
        Authorization = "Bearer $BearerToken"
        Accept = "application/json, text/event-stream"
    }
    if (-not [string]::IsNullOrWhiteSpace($sessionId)) {
        $sessionHeaders["Mcp-Session-Id"] = $sessionId
        $streamHeaders = @{
            Authorization = "Bearer $BearerToken"
            Accept = "text/event-stream, application/json"
            "Mcp-Session-Id" = $sessionId
        }
        $getStatus = Invoke-McpStreamProbe `
            -Uri "$normalizedBaseUrl/mcp" `
            -Headers $streamHeaders
        if ($getStatus -lt 200 -or $getStatus -ge 300) {
            throw "MCP stateful GET failed with HTTP $getStatus."
        }
        Write-Output "MCP stateful GET: $getStatus"
    }
    elseif ($mcpStatusPayload.transport_mode -eq "stateful") {
        throw "Stateful MCP initialization did not return Mcp-Session-Id."
    }

    $toolsListBody = @{
        jsonrpc = "2.0"
        id = 2
        method = "tools/list"
        params = @{}
    } | ConvertTo-Json -Depth 8
    $toolsList = Invoke-SafeWebRequest `
        -Uri "$normalizedBaseUrl/mcp" `
        -Method "POST" `
        -Headers $sessionHeaders `
        -Body $toolsListBody
    if ($toolsList.StatusCode -lt 200 -or $toolsList.StatusCode -ge 300) {
        throw "MCP tools/list failed with HTTP $($toolsList.StatusCode)."
    }
    Write-Output "MCP tools/list: $($toolsList.StatusCode)"

    if (-not [string]::IsNullOrWhiteSpace($sessionId)) {
        $deleteResult = Invoke-SafeWebRequest `
            -Uri "$normalizedBaseUrl/mcp" `
            -Method "DELETE" `
            -Headers $sessionHeaders
        if (
            $deleteResult.StatusCode -lt 200 -or
            $deleteResult.StatusCode -ge 300
        ) {
            throw "MCP session DELETE failed with HTTP $($deleteResult.StatusCode)."
        }
        Write-Output "MCP session DELETE: $($deleteResult.StatusCode)"
    }
    else {
        Write-Output "MCP stateful GET and DELETE: skipped because the server is stateless."
    }
}
else {
    Write-Output "MCP initialize: skipped because no bearer token was supplied."
}
