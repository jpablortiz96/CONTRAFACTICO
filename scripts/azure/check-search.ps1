[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$SearchEndpoint,

    [Parameter(Mandatory = $true)]
    [string]$KnowledgeBaseName,

    [string]$ApiVersion = "2026-05-01-preview",

    [Parameter(Mandatory = $true)]
    [string]$ApiKey
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

try {
    $endpointUri = [System.Uri]$SearchEndpoint
}
catch {
    throw "SearchEndpoint must be a valid URL."
}

if ($endpointUri.Scheme -ne "https") {
    throw "SearchEndpoint must use HTTPS."
}

$normalizedEndpoint = $SearchEndpoint.TrimEnd("/")
$encodedName = [System.Uri]::EscapeDataString($KnowledgeBaseName)
$encodedVersion = [System.Uri]::EscapeDataString($ApiVersion)
$primaryUri = "$normalizedEndpoint/knowledgebases/$encodedName/retrieve?api-version=$encodedVersion"
$alternateUri = "$normalizedEndpoint/knowledgebases('$encodedName')/retrieve?api-version=$encodedVersion"
$headers = @{
    "api-key" = $ApiKey
}
$requestBody = @{
    messages = @(
        @{
            role = "user"
            content = @(
                @{
                    type = "text"
                    text = "Find the X-200 supplier delay artifact and cite the evidence that the batch would not arrive before April."
                }
            )
        }
    )
    retrievalReasoningEffort = @{
        kind = "medium"
    }
} | ConvertTo-Json -Depth 10

function Invoke-KnowledgeBaseRetrieve {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Uri
    )

    try {
        $response = Invoke-WebRequest `
            -Uri $Uri `
            -Method Post `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $requestBody `
            -UseBasicParsing

        return [PSCustomObject]@{
            StatusCode = [int]$response.StatusCode
            Content = [string]$response.Content
        }
    }
    catch {
        $statusCode = 0
        $content = ""
        $webResponse = $_.Exception.Response
        if ($null -ne $webResponse) {
            $statusCode = [int]$webResponse.StatusCode
            $stream = $webResponse.GetResponseStream()
            if ($null -ne $stream) {
                $reader = New-Object System.IO.StreamReader($stream)
                try {
                    $content = $reader.ReadToEnd()
                }
                finally {
                    $reader.Dispose()
                }
            }
        }

        return [PSCustomObject]@{
            StatusCode = $statusCode
            Content = $content
        }
    }
}

function Get-CitationCount {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Payload
    )

    $count = 0
    foreach ($propertyName in @("references", "citations", "groundingSources", "retrievedDocuments")) {
        $property = $Payload.PSObject.Properties[$propertyName]
        if ($null -ne $property -and $null -ne $property.Value) {
            $count += @($property.Value).Count
        }
    }

    $activityProperty = $Payload.PSObject.Properties["activity"]
    if ($null -ne $activityProperty -and $null -ne $activityProperty.Value) {
        foreach ($activity in @($activityProperty.Value)) {
            $referencesProperty = $activity.PSObject.Properties["references"]
            if ($null -ne $referencesProperty -and $null -ne $referencesProperty.Value) {
                $count += @($referencesProperty.Value).Count
            }
        }
    }

    return $count
}

$result = Invoke-KnowledgeBaseRetrieve -Uri $primaryUri
$route = "primary"
if ($result.StatusCode -eq 404 -or $result.StatusCode -eq 405) {
    $route = "alternate"
    $result = Invoke-KnowledgeBaseRetrieve -Uri $alternateUri
}

if ($result.StatusCode -lt 200 -or $result.StatusCode -ge 300) {
    throw "Azure AI Search retrieve failed on the $route route with HTTP $($result.StatusCode)."
}

try {
    $payload = $result.Content | ConvertFrom-Json
}
catch {
    throw "Azure AI Search returned a non-JSON response."
}

$citationCount = Get-CitationCount -Payload $payload
Write-Output "Retrieve status: $($result.StatusCode)"
Write-Output "Citation count: $citationCount"
