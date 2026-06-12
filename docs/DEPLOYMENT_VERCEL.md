# Deploy the Web War Room to Vercel

This guide deploys only the Next.js frontend. The MCP server remains on Azure Container Apps.

## Prerequisites

- The repository is pushed to GitHub.
- A Vercel account can access the GitHub repository.
- The Azure Container Apps backend is reachable:

```text
https://ca-contrafactico-mcp.niceocean-5f5ede6d.eastus.azurecontainerapps.io
```

- Azure CLI is installed and authenticated if backend CORS must be updated.

## Import the Repository

1. Open the Vercel dashboard.
2. Select **Add New Project**.
3. Import the GitHub repository containing CONTRAFÁCTICO.
4. Set **Root Directory** to `web`.
5. Confirm the detected framework is **Next.js**.
6. Keep the standard install and build commands:

```text
npm install
npm run build
```

## Configure the Backend URL

Add this Vercel environment variable for Production, Preview, and Development:

```text
NEXT_PUBLIC_API_BASE_URL=https://ca-contrafactico-mcp.niceocean-5f5ede6d.eastus.azurecontainerapps.io
```

Redeploy after changing a `NEXT_PUBLIC_*` value because it is embedded during the Next.js build.

## Update Backend CORS

After Vercel assigns the public domain, allow that exact origin on the Azure Container App:

```powershell
az containerapp update `
  --resource-group "<resource-group>" `
  --name "ca-contrafactico-mcp" `
  --set-env-vars "CORS_ALLOWED_ORIGINS=https://<project>.vercel.app"
```

If production and preview domains are both required, provide a comma-separated allowlist:

```powershell
az containerapp update `
  --resource-group "<resource-group>" `
  --name "ca-contrafactico-mcp" `
  --set-env-vars "CORS_ALLOWED_ORIGINS=https://<project>.vercel.app,https://<preview-domain>"
```

Do not use a wildcard origin for a production deployment.

## Verify

1. Open the Vercel URL.
2. Confirm the Enterprise Cockpit loads without an error banner.
3. Confirm the evidence-mode badge reports the expected backend mode.
4. Open **Rewind Demo** and select **Run Rewind**.
5. Confirm the `$80,000` gap, evidence timeline, citation inspector, and Live Fork panel render.
6. Open the browser developer console and confirm there are no CORS errors.

## Troubleshooting

### CORS Error

- Confirm `CORS_ALLOWED_ORIGINS` contains the exact scheme and hostname.
- Do not include a trailing slash.
- Restart or create a new Container Apps revision after changing environment variables.
- Confirm the request is going to the Azure backend, not `localhost`.

### 404 from the Backend

- Confirm `NEXT_PUBLIC_API_BASE_URL` contains only the origin, with no `/demo` suffix.
- Verify `GET /health` and `GET /demo/status` directly on the backend.
- Confirm the Azure Container App has external ingress enabled.

### Vercel Build Failure

- Confirm **Root Directory** is `web`.
- Confirm Vercel is using a current Node.js version supported by the checked-in Next.js release.
- Run `npm install`, `npm run typecheck`, and `npm run build` locally from `web`.

### Environment Variable Appears Ignored

- Confirm the variable name is exactly `NEXT_PUBLIC_API_BASE_URL`.
- Apply it to the environment being tested.
- Trigger a new deployment after saving the variable.
