# Threadwise Project Structure

This project uses a simple monorepo structure with separate entry points for the API and Cron services, sharing common code.

## Directory Structure

```
threadwise/
├── src/
│   ├── api/                    # API service entry point
│   │   ├── index.ts            # Express server (main entry)
│   │   └── routes/             # API routes
│   │       └── analyzer.ts
│   │
│   ├── cron/                   # Cron orchestrator entry point
│   │   ├── index.ts            # Cron scheduler (main entry)
│   │   └── adapters/           # Execution adapters (in-memory, K8s)
│   │       ├── executionAdapter.ts
│   │       ├── executionAdapterFactory.ts
│   │       ├── inMemoryAdapter.ts
│   │       └── kubernetesAdapter.ts
│   │
│   └── shared/                 # Shared code used by both services
│       ├── clients/            # External API clients (Slack, Jira)
│       ├── constants/          # Constants and enums
│       ├── helpers/            # Utility functions
│       ├── prompts/            # LLM prompts
│       ├── providers/          # LLM provider implementations
│       ├── services/           # Business logic services
│       ├── types/              # TypeScript type definitions
│       └── utils/              # Configuration and utilities
│
├── Dockerfile.api              # Dockerfile for API service
├── Dockerfile.cron             # Dockerfile for Cron service
└── package.json                # Root package.json with scripts
```

## Services

### API Service (`src/api/`)
- **Entry Point**: `src/api/index.ts`
- **Purpose**: REST API server for workspace analysis
- **Port**: 3000 (configurable)
- **Endpoints**:
  - `GET /health` - Health check
  - `POST /api/workspaces/:workspaceId/analyze` - Analyze a workspace

### Cron Service (`src/cron/`)
- **Entry Point**: `src/cron/index.ts`
- **Purpose**: Scheduled job orchestrator
- **Functionality**: 
  - Runs on a cron schedule (default: every 15 minutes)
  - Fetches all workspaces
  - Dispatches analysis jobs via execution adapters
  - Supports in-memory or Kubernetes execution modes
- **Adapters** (`src/cron/adapters/`):
  - **InMemoryAdapter**: Makes direct HTTP calls to the API service
  - **KubernetesAdapter**: Creates K8s Jobs that call the API service
  - **ExecutionAdapterFactory**: Factory to create the appropriate adapter based on config

### Shared Code (`src/shared/`)
All common functionality used by both services:
- **adapters/**: Execution adapters (in-memory HTTP calls, K8s job creation)
- **clients/**: External service clients (Slack, Jira)
- **services/**: Core business logic (WorkspaceAnalyzer)
- **utils/**: Configuration and utilities
- **types/**: TypeScript type definitions
- **providers/**: LLM provider implementations
- **prompts/**: LLM prompt templates
- **helpers/**: Utility functions
- **constants/**: Constants and enums
- **scripts/**: Standalone scripts (e.g., K8s job worker)

## Building

### Build All
```bash
npm run build
```

### Build API Only
```bash
npm run build:api
```

### Build Cron Only
```bash
npm run build:cron
```

## Running

### Development

**API Service:**
```bash
npm run dev
# or
npm run dev:api
```

**Cron Service:**
```bash
npm run dev:cron
```

**Both Services:**
```bash
npm run dev:all
```

### Production

**API Service:**
```bash
npm start
# or
node dist/api/index.js
```

**Cron Service:**
```bash
npm run start:cron
# or
node dist/cron/index.js
```

## Docker

### Build API Image
```bash
docker build -f Dockerfile.api -t threadwise-api:latest .
```

### Build Cron Image
```bash
docker build -f Dockerfile.cron -t threadwise-cron:latest .
```

### Run API Container
```bash
docker run -p 3000:3000 --env-file .env threadwise-api:latest
```

### Run Cron Container
```bash
docker run --env-file .env threadwise-cron:latest
```

## TypeScript Configuration

The `tsconfig.json` uses path aliases:
- `@/*` maps to `src/shared/*` for easy imports from shared code

Example:
```typescript
import { config } from "@/utils/config";
import { WorkspaceAnalyzer } from "@/services/workspaceAnalyzer";
```

## Import Patterns

### From API/Cron to Shared
```typescript
// Relative path
import { config } from "../shared/utils/config";

// Path alias (recommended)
import { config } from "@/utils/config";
```

### Within Shared Code
```typescript
// Relative paths
import { LLMFactory } from "../providers/llmFactory";
import { slackClient } from "../clients/slack";
```

## Deployment

Each service can be deployed independently:
- **API**: Deploy as a Kubernetes Deployment with Service and Ingress
- **Cron**: Deploy as a Kubernetes Deployment or CronJob

Both services share the same configuration and secrets, but run as separate processes/containers.

