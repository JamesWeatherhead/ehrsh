# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ehrsh (EHR as a Shell) is a TypeScript CLI that enables clinicians to interact with FHIR-based EHR systems using natural language commands. Think "AWS CLI for healthcare" - it translates conversational input like `find patient Smith and show their meds` into FHIR API operations.

## Build Commands

```bash
npm install              # Install dependencies
npm run dev              # Run in development mode (ts-node)
npm run build            # Compile TypeScript to dist/
npm link                 # Install globally as 'ehrsh' command
```

## Local FHIR Server

```bash
docker compose up -d     # Start local HAPI FHIR R4 with Synthea data
# Then set: FHIR_BASE_URL=http://localhost:8080/hapi-fhir-jpaserver/fhir
```

Default uses public HAPI server: `https://hapi.fhir.org/baseR4`

## Architecture

### Command Flow
```
User Input → parseCommand() → executeSingleCommand() → FHIRClient → UI render
```

### Core Components

- **`src/index.ts`** - Main REPL loop and command dispatch. Entry point that handles readline input, routes to appropriate handlers, manages compound commands.

- **`src/utils/parser.ts`** - Natural language parser. Converts conversational input to `ParsedCommand` objects using regex patterns. Key interface:
  ```typescript
  interface ParsedCommand {
    action: 'search' | 'show' | 'list' | 'add' | 'update' | 'plot' | 'draft' | 'message' | 'select' | 'help' | 'check' | 'ask' | 'flag' | 'workflow'
    resource: 'patient' | 'schedule' | 'appointment' | 'medication' | 'lab' | 'note' | 'encounter' | 'sms' | 'response' | 'workflow' | 'unknown'
    params: { patientId?, patientName?, labCode?, medicationName?, timeRange?, message?, etc. }
    workflow?: ParsedConditionalWorkflow
  }
  ```

- **`src/fhir/client.ts`** - FHIR API wrapper using `fhir-kit-client`. Provides methods like `searchPatients()`, `getPatientMedications()`, `getPatientLabs()`, `addMedication()`, `createNote()`.

- **`src/fhir/types.ts`** - LOINC codes (`CREATININE: '2160-0'`), RxNorm codes (`METFORMIN: '6809'`), document type codes for clinical notes.

- **`src/workflow.ts`** - Conditional workflow engine for if/then/else patterns. Handles: `"if creatinine > 2.0 then flag for nephrology"`. Supports pending workflows waiting for patient responses.

- **`src/session.ts`** - Singleton `SessionManager` tracking `activePatient`, `lastSearchResults`, `currentEncounter` for contextual commands like "show their meds".

- **`src/messaging.ts`** - SMS integration (mock or Twilio). Used for patient communication workflows.

- **`src/editor.ts`** - Opens nano/vim for clinical note drafting with SOAP, H&P, Progress, Discharge templates.

- **`src/ui/`** - Output formatting: `format.ts` (patient names, dates), `table.ts` (cli-table3 tables), `chart.ts` (asciichart trending).

### Compound Commands

Commands chain with `and`, `then`, `,`, `;`:
```
find patient Smith and show their meds and add albuterol
```
Results pass between commands via `CommandContext`.

### Key Patterns

- ES Modules throughout (imports use `.js` extensions)
- Regex-based intent recognition (not ML/NLP)
- Session state enables implicit patient references ("their", "them")
- Pending workflows stored in memory (lost on restart)

## Configuration

Environment variables (`.env` or `~/.ehrshrc`):
```bash
FHIR_BASE_URL=https://hapi.fhir.org/baseR4
FHIR_BEARER_TOKEN=optional-auth-token
MESSAGING_MODE=mock|twilio
```

## Extending the CLI

- **New command types** → Add patterns to `parseCommand()` in `utils/parser.ts`
- **New FHIR resources** → Add methods to `EHRClient` class in `fhir/client.ts`
- **New output formats** → Add functions in `ui/format.ts` or `ui/table.ts`
- **New workflow conditions/actions** → Extend types in `workflow.ts`
