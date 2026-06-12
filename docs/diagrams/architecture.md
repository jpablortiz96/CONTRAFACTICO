# CONTRAFÁCTICO Architecture Diagrams

These diagrams describe the current repository and deployment model. Status labels distinguish implemented capabilities from adapter contracts, documented paths, and tenant-specific production work.

## Product Architecture

```mermaid
flowchart LR
    User["Microsoft 365 Copilot / Teams"] --> Agent["Copilot Studio Agent"]
    Agent --> Connector["Power Platform custom connector"]
    Connector --> Facade["/mcp-copilot<br/>5 simplified tools"]
    Facade --> ACA["Azure Container Apps MCP Server"]

    Technical["Technical MCP clients"] --> Full["/mcp<br/>10 protected tools"]
    Full --> ACA

    Web["Next.js Web War Room"] --> Demo["/demo/*<br/>read-only endpoints"]
    Demo --> ACA

    ACA --> IQ["Foundry IQ / Azure AI Search KB"]
    IQ --> Blob["Azure Blob corpus"]

    classDef implemented fill:#0d3b3a,stroke:#42d7b5,color:#effffb;
    classDef interface fill:#102934,stroke:#397080,color:#eff8fa;
    class User,Agent,Connector,Facade,ACA,Full,Demo,IQ,Blob,Web implemented;
    class Technical interface;
```

## Evidence Lifecycle

```mermaid
flowchart LR
    Sources["Evidence sources<br/>M365, Blob, CSV/JSON, systems of work"]
    Contract["Ingestion contract<br/>owners, access, allowlisted fields"]
    Normalize["Artifact normalization<br/>premises, readers, outcomes, cost"]
    Registry["Decision Registry<br/>auditable decision objects"]
    Ground["Foundry IQ grounding<br/>citations and source references"]
    Analyze["Decision analysis<br/>Rewind, Live Fork, Governance, Reliability"]
    Audit["Audit Run<br/>evidence, policy, score, lineage"]
    Board["Human decision board<br/>review and approval"]

    Sources --> Contract --> Normalize --> Registry --> Ground --> Analyze --> Audit --> Board

    classDef evidence fill:#102934,stroke:#397080,color:#eff8fa;
    classDef control fill:#30251b,stroke:#c48a3a,color:#fff8ec;
    classDef human fill:#0d3b3a,stroke:#42d7b5,color:#effffb;
    class Sources,Contract,Normalize,Registry,Ground evidence;
    class Analyze,Audit control;
    class Board human;
```

## Enterprise Trust Stack

```mermaid
flowchart TB
    Runtime["CONTRAFÁCTICO MCP Runtime"]

    subgraph Implemented["Implemented"]
        Entra["Microsoft Entra ID<br/>JWT validation support"]
        Foundry["Foundry IQ<br/>grounded retrieval"]
        MCP["MCP<br/>strict tool contracts"]
    end

    subgraph Contracts["Adapter contracts / documented paths"]
        OPA["OPA-style policy"]
        Lineage["OpenLineage-style lineage"]
        Langfuse["Langfuse-style observability"]
        Evidently["Evidently-style reliability"]
    end

    subgraph Pending["Tenant production pending"]
        KeyVault["Azure Key Vault references"]
        Telemetry["Production telemetry backend"]
        Governance["Customer governance and retention"]
    end

    Entra --> Runtime
    Foundry --> Runtime
    MCP --> Runtime
    Runtime --> OPA
    Runtime --> Lineage
    Runtime --> Langfuse
    Runtime --> Evidently
    Runtime -.-> KeyVault
    Runtime -.-> Telemetry
    Runtime -.-> Governance

    classDef implemented fill:#0d3b3a,stroke:#42d7b5,color:#effffb;
    classDef contract fill:#102934,stroke:#397080,color:#eff8fa;
    classDef pending fill:#302027,stroke:#a35f68,color:#fff4f5;
    class Entra,Foundry,MCP,Runtime implemented;
    class OPA,Lineage,Langfuse,Evidently contract;
    class KeyVault,Telemetry,Governance pending;
```

## Product Channels

```mermaid
flowchart LR
    Core["CONTRAFÁCTICO<br/>Decision Intelligence"]

    M365["M365 Copilot / Teams<br/>Implemented"]
    Studio["Copilot Studio<br/>Implemented"]
    Web["Web War Room<br/>Implemented"]
    API["MCP API<br/>Implemented"]
    Automate["Power Automate<br/>Documented path"]
    Fabric["Power BI / Fabric<br/>Documented path"]
    Future["Jira / ServiceNow / Slack<br/>Adapter path"]

    Core --> M365
    Core --> Studio
    Core --> Web
    Core --> API
    Core -.-> Automate
    Core -.-> Fabric
    Core -.-> Future

    classDef implemented fill:#0d3b3a,stroke:#42d7b5,color:#effffb;
    classDef documented fill:#102934,stroke:#397080,color:#eff8fa;
    class Core,M365,Studio,Web,API implemented;
    class Automate,Fabric,Future documented;
```
