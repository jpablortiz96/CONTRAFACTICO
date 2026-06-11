# Azure AI Search Setup Guide

These scripts prepare the Cordillera Components markdown corpus for an existing Azure AI Search knowledge base. They do not create or deploy application infrastructure automatically.

## Prerequisites

- An Azure subscription with permission to create or configure resources.
- Azure CLI installed.
- An Azure AI Search service that supports knowledge bases.
- A Microsoft Foundry resource and model deployment if the knowledge base uses query planning or answer synthesis.

## 1. Sign In

```powershell
az login
az account set --subscription "<subscription-name-or-id>"
```

Prefer Microsoft Entra ID and least-privilege role assignments. API keys are supported by the retrieval check but must remain outside the repository.

## 2. Create a Resource Group

```powershell
az group create `
  --name "<resource-group>" `
  --location "<azure-region>"
```

## 3. Create Storage and a Blob Container

Choose a globally unique storage account name.

```powershell
az storage account create `
  --resource-group "<resource-group>" `
  --name "<storage-account>" `
  --location "<azure-region>" `
  --sku Standard_LRS `
  --allow-blob-public-access false

az storage container create `
  --account-name "<storage-account>" `
  --name corpus `
  --auth-mode login
```

Your signed-in identity needs permission to write blobs, such as **Storage Blob Data Contributor** on the storage account.

## 4. Create or Select Azure AI Search

Create an Azure AI Search service in a supported region and tier, or select an existing service. Record only its endpoint:

```text
https://<search-service>.search.windows.net
```

Do not place keys or account-specific endpoints in tracked files.

## 5. Upload the Corpus

From the repository root:

```powershell
.\scripts\azure\upload-corpus.ps1 `
  -ResourceGroup "<resource-group>" `
  -StorageAccount "<storage-account>" `
  -ContainerName "corpus"
```

The script uploads every `corpus/docs/*.md` file using the current Azure CLI login.

## 6. Configure the Knowledge Source and Knowledge Base

In Azure AI Search:

1. Configure an Azure Blob knowledge source that targets the uploaded container.
2. Confirm the generated or selected search index exposes retrievable source identifiers, titles, and content.
3. Create a knowledge base, for example `contrafactico-kb`, that uses the knowledge source.
4. If using `low` or `medium` reasoning or answer synthesis, configure the supported Foundry model and required managed-identity role assignments.
5. Verify that retrieval returns a `response`, `references`, and optionally `activity`.

The `2026-05-01-preview` API supports the current preview knowledge-base features. Override the version if the configured service uses another compatible contract.

## 7. Test Retrieve

Pass the API key only at invocation time:

```powershell
$key = Read-Host "Azure AI Search API key"
.\scripts\azure\check-search.ps1 `
  -SearchEndpoint "https://<search-service>.search.windows.net" `
  -KnowledgeBaseName "contrafactico-kb" `
  -ApiKey $key
Remove-Variable key
```

The script tries the primary retrieve route and retries the alternate OData-style route only after HTTP 404 or 405. It prints the response status and citation count, never the key.

## 8. Configure the Server Environment

Use `contrafactico-mcp-server/.env.example` as the contract. Supply values through your local process, deployment environment, or an untracked `.env` file.

Required for Foundry IQ mode:

```text
USE_LOCAL_CORPUS=false
SEARCH_ENDPOINT=https://<search-service>.search.windows.net
SEARCH_KB_NAME=contrafactico-kb
SEARCH_API_VERSION=2026-05-01-preview
SEARCH_API_KEY=<key>
```

Then run:

```powershell
Set-Location contrafactico-mcp-server
npm run check:foundry
```

Return to deterministic local mode with `USE_LOCAL_CORPUS=true`.
