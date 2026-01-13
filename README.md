# ehrsh

**EHR as a Shell** - a natural language CLI for Electronic Health Record (EHR) workflows using FHIR. Replace 47 clicks with one command.

Talk to your EHR like you'd talk to a colleague. ehrsh translates plain English into FHIR API calls - the standard protocol that modern health systems use to exchange data.

## Quick Start

```bash
git clone https://github.com/JamesWeatherhead/ehrsh.git
cd ehrsh
npm install
npm run build
export ANTHROPIC_API_KEY=your-key-here
node dist/index.js
```

Get your API key at [console.anthropic.com](https://console.anthropic.com/).

## What Can It Do?

```
ehrsh> find patients named Smith
ehrsh> select 1
ehrsh> show their meds
ehrsh> add albuterol
ehrsh> plot creatinine over past year
ehrsh> show today's schedule
ehrsh> draft a note
ehrsh> ask patient if I can move them to 3pm, if yes then reschedule
```

With Claude API, use natural phrasing:

```
ehrsh> what pills does this guy take
ehrsh> any recent kidney function tests
ehrsh> is their A1C under control
```

See [examples/demo-session.md](examples/demo-session.md) for real output.

## Why?

The AWS Console has 200+ services across dozens of screens. The AWS CLI collapses all of it into commands. Same operations, 100x faster.

EHR software is stuck in 2005: endless clicking through tabs, forms, and confirmation dialogs. ehrsh proves the app layer can disappear. FHIR operations become shell commands. "Show their meds" replaces 15 clicks.

The terminal isn't primitive. It's the fastest interface we have.

## Vision: Agentic Clinical Workflows

ehrsh is a step toward fully agentic healthcare software - where AI handles multi-step clinical workflows end-to-end.

**Today (v0.1.0):**
```
ehrsh> add albuterol to patient Smith
```
Single commands that map to single FHIR operations.

**Tomorrow:**
```
ehrsh> refill all maintenance meds for my diabetic patients who are due
```
Agent queries patient panel -> filters by diagnosis -> checks last refill dates -> generates refill orders -> routes for e-signature.

```
ehrsh> prep me for my 2pm appointment
```
Agent pulls patient chart -> summarizes recent visits -> flags abnormal labs -> drafts HPI -> opens note template with context pre-filled.

```
ehrsh> this patient needs a colonoscopy - make it happen
```
Agent checks insurance eligibility -> finds in-network GI providers -> checks availability -> sends referral -> schedules appointment -> notifies patient.

**The thesis:** The EHR of the future isn't a better GUI. It's no GUI. It's agents that understand clinical context and execute workflows autonomously, with humans approving key decisions.

## Local FHIR Server (Optional)

Want your own sandbox? The public HAPI server works great, but you can run locally:

```bash
docker compose up -d
export FHIR_BASE_URL=http://localhost:8080/hapi-fhir-jpaserver/fhir
```

Uses [smartonfhir/hapi-5](https://hub.docker.com/r/smartonfhir/hapi-5) with Synthea synthetic patients.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | (required) | Your Claude API key |
| `FHIR_BASE_URL` | `https://hapi.fhir.org/baseR4` | FHIR server endpoint |
| `MESSAGING_MODE` | `mock` | `mock` or `twilio` |

See `.env.example` for additional options (Azure Foundry, Twilio, auth tokens, model selection).

## Command Reference

**Patient**: `find patients named Smith` | `select 1` | `show patient 123`

**Meds**: `show their meds` | `add metformin` | `add albuterol to patient 123`

**Labs**: `show their labs` | `plot creatinine over past year` | `show their glucose`

**Schedule**: `show today's schedule` | `show clinic schedule`

**Notes**: `draft a note` | `show their notes`

**Messaging**: `message patient about appointment` | `check responses conv-xxx`

**Compound**: `find patient Smith and show their meds then add albuterol`

**Workflows**: `if creatinine > 2.0 then flag for nephrology`

Type `help` for full command list.

## Contributing

PRs welcome! Ideas:

- **More FHIR resources** - CarePlan, Immunization, Procedure, DiagnosticReport
- **Smarter charting** - beyond ASCII (SVG, web view)
- **Voice input** - "Hey ehrsh, what's my next patient?"
- **SMART on FHIR auth** - connect to real EHRs
- **Agentic workflows** - multi-step autonomous operations

```bash
npm run dev    # Development mode
npm run build  # Compile TypeScript
```

## License

MIT. Do whatever you want with it.

## Acknowledgments

- [Claude](https://anthropic.com/claude) - natural language understanding
- [HAPI FHIR](https://hapifhir.io/) - the FHIR server
- [Synthea](https://synthetichealth.github.io/synthea/) - synthetic patient generator
