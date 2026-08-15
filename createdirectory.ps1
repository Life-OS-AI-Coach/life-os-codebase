<#
.SYNOPSIS
Creates the LifeOS AI Enterprise Solution Structure

.DESCRIPTION
Creates an enterprise-grade folder structure based on the
logical architecture.

Author : Venkatesh Vellore
Version: 1.0
#>

param(
    [string]$Root = "LifeOS-AI"
)

$folders = @(
# ==========================================================
# ROOT
# ==========================================================

"$Root",

# ==========================================================
# PRESENTATION LAYER
# ==========================================================

"$Root/apps",
"$Root/apps/web",
"$Root/apps/web/nextjs",
"$Root/apps/web/components",
"$Root/apps/web/pages",
"$Root/apps/web/features",
"$Root/apps/web/layouts",
"$Root/apps/web/hooks",
"$Root/apps/web/services",

"$Root/apps/mobile",
"$Root/apps/mobile/react-native",
"$Root/apps/mobile/components",
"$Root/apps/mobile/screens",
"$Root/apps/mobile/navigation",
"$Root/apps/mobile/hooks",

"$Root/apps/watch",
"$Root/apps/watch/apple-watch",
"$Root/apps/watch/wear-os",

"$Root/apps/voice",
"$Root/apps/voice/alexa",
"$Root/apps/voice/google-assistant",
"$Root/apps/voice/siri",

"$Root/apps/desktop",

# ==========================================================
# EXPERIENCE LAYER
# ==========================================================

"$Root/gateway",
"$Root/gateway/api-gateway",
"$Root/gateway/authentication",
"$Root/gateway/authorization",
"$Root/gateway/graphql",
"$Root/gateway/rest",
"$Root/gateway/rate-limiter",
"$Root/gateway/security",

# ==========================================================
# BUSINESS DOMAIN
# ==========================================================

"$Root/services",

"$Root/services/user-management",
"$Root/services/goal-management",
"$Root/services/task-management",
"$Root/services/calendar",
"$Root/services/habits",
"$Root/services/notes",
"$Root/services/journal",
"$Root/services/reminders",
"$Root/services/career",
"$Root/services/health",
"$Root/services/finance",
"$Root/services/learning",

# ==========================================================
# AI DOMAIN
# ==========================================================

"$Root/ai",

"$Root/ai/orchestrator",
"$Root/ai/goal-coach",
"$Root/ai/career-coach",
"$Root/ai/health-coach",
"$Root/ai/finance-coach",

"$Root/ai/motivation-engine",
"$Root/ai/recommendation-engine",
"$Root/ai/recovery-engine",
"$Root/ai/prediction-engine",
"$Root/ai/personalization-engine",

"$Root/ai/prompts",
"$Root/ai/memory",
"$Root/ai/rag",
"$Root/ai/vector-search",
"$Root/ai/mcp",

# ==========================================================
# PLATFORM SERVICES
# ==========================================================

"$Root/platform",

"$Root/platform/notification",
"$Root/platform/analytics",
"$Root/platform/gamification",
"$Root/platform/search",
"$Root/platform/reporting",
"$Root/platform/file-management",
"$Root/platform/audit",
"$Root/platform/logging",
"$Root/platform/configuration",

# ==========================================================
# DATA LAYER
# ==========================================================

"$Root/data",

"$Root/data/postgresql",
"$Root/data/redis",
"$Root/data/vector-db",
"$Root/data/object-storage",
"$Root/data/search-engine",

"$Root/data/migrations",
"$Root/data/seeds",

# ==========================================================
# EXTERNAL INTEGRATIONS
# ==========================================================

"$Root/integrations",

"$Root/integrations/google-calendar",
"$Root/integrations/outlook",
"$Root/integrations/apple-calendar",

"$Root/integrations/openai",
"$Root/integrations/claude",
"$Root/integrations/gemini",

"$Root/integrations/health",
"$Root/integrations/maps",
"$Root/integrations/email",
"$Root/integrations/payment",

# ==========================================================
# SHARED LIBRARIES
# ==========================================================

"$Root/libs",

"$Root/libs/common",
"$Root/libs/core",
"$Root/libs/domain",
"$Root/libs/contracts",
"$Root/libs/events",
"$Root/libs/security",
"$Root/libs/utils",
"$Root/libs/types",

# ==========================================================
# DEVOPS
# ==========================================================

"$Root/devops",

"$Root/devops/docker",
"$Root/devops/kubernetes",
"$Root/devops/openshift",
"$Root/devops/terraform",
"$Root/devops/helm",

"$Root/devops/github-actions",

# ==========================================================
# TESTING
# ==========================================================

"$Root/tests",

"$Root/tests/unit",
"$Root/tests/integration",
"$Root/tests/e2e",
"$Root/tests/performance",
"$Root/tests/security",

# ==========================================================
# DOCUMENTATION
# ==========================================================

"$Root/docs",

"$Root/docs/architecture",
"$Root/docs/business",
"$Root/docs/api",
"$Root/docs/adr",
"$Root/docs/runbooks",
"$Root/docs/operations",

# ==========================================================
# DIAGRAMS
# ==========================================================

"$Root/diagrams",

"$Root/diagrams/conceptual",
"$Root/diagrams/logical",
"$Root/diagrams/c4",
"$Root/diagrams/component",
"$Root/diagrams/deployment",
"$Root/diagrams/network",
"$Root/diagrams/security",
"$Root/diagrams/data",
"$Root/diagrams/sequence",
"$Root/diagrams/mermaid",
"$Root/diagrams/plantuml",
"$Root/diagrams/drawio",

# ==========================================================
# SCRIPTS
# ==========================================================

"$Root/scripts",
"$Root/scripts/setup",
"$Root/scripts/build",
"$Root/scripts/deploy",
"$Root/scripts/database",

# ==========================================================
# CONFIG
# ==========================================================

"$Root/config",
"$Root/config/dev",
"$Root/config/test",
"$Root/config/uat",
"$Root/config/prod"
)

foreach ($folder in $folders)
{
    if (-not (Test-Path $folder))
    {
        New-Item -ItemType Directory -Force -Path $folder | Out-Null
        Write-Host "[CREATED] $folder" -ForegroundColor Green
    }
    else
    {
        Write-Host "[EXISTS ] $folder" -ForegroundColor Yellow
    }
}

# Create common root files
$files = @(
"$Root/README.md",
"$Root/LICENSE",
"$Root/.gitignore",
"$Root/.editorconfig",
"$Root/docker-compose.yml",
"$Root/.env.example"
)

foreach ($file in $files)
{
    if (-not (Test-Path $file))
    {
        New-Item -ItemType File -Path $file | Out-Null
        Write-Host "[FILE] $file" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host " LifeOS AI Repository Structure Created"
Write-Host "==============================================" -ForegroundColor Green