# ehrsh

**EHR as a Shell**: natural language CLI for FHIR workflows. Replace 47 clicks with one command.

## Quick Start

```bash
git clone https://github.com/JamesWeatherhead/ehrsh.git
cd ehrsh
npm install
npm run build
export ANTHROPIC_API_KEY=your-key-here
node dist/index.js
```

Get your API key at [console.anthropic.com](https://console.anthropic.com/) or use [Microsoft Foundry](https://learn.microsoft.com/en-us/azure/ai-foundry/).

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

With Claude API enabled, you can use natural phrasing:

```
ehrsh> what pills does this guy take
ehrsh> any recent kidney function tests
ehrsh> is their A1C under control
```

See [examples/demo-session.md](examples/demo-session.md) for real output including natural language variations, lab charts, and full workflows.

## Why?

The AWS Console has 200+ services across dozens of screens. The AWS CLI collapses all of it into commands. Same operations, 100x faster.

EHR software is stuck in 2005: endless clicking through tabs, forms, and confirmation dialogs. ehrsh proves the app layer can disappear. FHIR operations become shell commands. "Show their meds" replaces 15 clicks.

The terminal isn't primitive. It's the fastest interface we have.

## Local FHIR Server (Optional)

Want your own sandbox? The public HAPI server works great, but you can run locally:

```bash
docker compose up -d
```

Then set:
```bash
export FHIR_BASE_URL=http://localhost:8080/hapi-fhir-jpaserver/fhir
```

Uses [smartonfhir/hapi-5](https://hub.docker.com/r/smartonfhir/hapi-5) with Synthea synthetic patients.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | - | Claude API key (direct Anthropic) |
| `ANTHROPIC_FOUNDRY_BASE_URL` | - | Azure Foundry endpoint (alternative) |
| `ANTHROPIC_FOUNDRY_API_KEY` | - | Azure Foundry API key |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-5` | Model: `claude-opus-4-5`, `claude-sonnet-4-5`, `claude-haiku-4-5` |
| `FHIR_BASE_URL` | `https://hapi.fhir.org/baseR4` | FHIR server endpoint |
| `FHIR_BEARER_TOKEN` | - | Auth token (if required) |
| `MESSAGING_MODE` | `mock` | `mock` or `twilio` |
| `TWILIO_ACCOUNT_SID` | - | For real SMS |
| `TWILIO_AUTH_TOKEN` | - | For real SMS |
| `TWILIO_PHONE_NUMBER` | - | For real SMS |

Create a `.env` file or export variables directly.

## Verify It Works

After adding a medication, check the HAPI web UI:

- **Public**: https://hapi.fhir.org/
- **Local**: http://localhost:8080/hapi-fhir-jpaserver/

Navigate to Resources > MedicationRequest > Search to see your changes.

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

PRs welcome. Some ideas:

- [ ] Additional FHIR resources (CarePlan, Immunization, Procedure)
- [ ] Better charting (beyond ASCII)
- [ ] Voice input
- [ ] More clinical note templates
- [ ] SMART on FHIR authentication
- [ ] Export to PDF/print

```bash
npm run dev    # Run in development mode
npm run build  # Compile TypeScript
```

## License

MIT. Do whatever you want with it.

## Acknowledgments

- [Claude](https://anthropic.com/claude) - natural language understanding
- [HAPI FHIR](https://hapifhir.io/) - the FHIR server
- [smartonfhir/hapi-5](https://hub.docker.com/r/smartonfhir/hapi-5) - Docker images with Synthea data (Boston Children's Hospital)
- [Synthea](https://synthetichealth.github.io/synthea/) - synthetic patient generator
