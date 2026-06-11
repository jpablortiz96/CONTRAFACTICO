[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ResourceGroup,

    [Parameter(Mandatory = $true)]
    [string]$StorageAccount,

    [string]$ContainerName = "corpus",

    [string]$CorpusPath = "../../corpus/docs"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    throw "Azure CLI is required. Install Azure CLI and run az login."
}

$candidatePath = if ([System.IO.Path]::IsPathRooted($CorpusPath)) {
    $CorpusPath
}
else {
    Join-Path $PSScriptRoot $CorpusPath
}

if (-not (Test-Path -LiteralPath $candidatePath -PathType Container)) {
    throw "Corpus path does not exist: $candidatePath"
}

$resolvedCorpusPath = (Resolve-Path -LiteralPath $candidatePath).Path
$documents = @(
    Get-ChildItem -LiteralPath $resolvedCorpusPath -File -Filter "*.md"
)
if ($documents.Count -eq 0) {
    throw "No markdown documents were found in: $resolvedCorpusPath"
}

az storage account show `
    --resource-group $ResourceGroup `
    --name $StorageAccount `
    --only-show-errors `
    --output none
if ($LASTEXITCODE -ne 0) {
    throw "The storage account could not be validated."
}

az storage container create `
    --account-name $StorageAccount `
    --name $ContainerName `
    --auth-mode login `
    --only-show-errors `
    --output none
if ($LASTEXITCODE -ne 0) {
    throw "The blob container could not be created or validated."
}

az storage blob upload-batch `
    --account-name $StorageAccount `
    --destination $ContainerName `
    --source $resolvedCorpusPath `
    --pattern "*.md" `
    --auth-mode login `
    --overwrite true `
    --only-show-errors `
    --output none
if ($LASTEXITCODE -ne 0) {
    throw "Corpus upload failed."
}

Write-Output "Uploaded $($documents.Count) markdown documents to container '$ContainerName'."
