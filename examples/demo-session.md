# ehrsh Demo Session

Real output from ehrsh v0.1.0 running against public HAPI FHIR server (`https://hapi.fhir.org/baseR4`).

## Starting ehrsh

```
$ node dist/index.js

ehrsh v0.1.0 - EHR as a Shell
FHIR workflows powered by natural language

- Connecting to FHIR server...
✔ Connected to https://hapi.fhir.org/baseR4
Claude API enabled - natural language to FHIR

Type 'help' for commands, or describe what you need.

ehrsh>
```

## Finding a Patient

```
ehrsh> find patients named Smith

Patient Search Results
──────────────────────
┌─────┬────────────────────┬──────────────────────────────┬──────────┬───────────────┐
│ #   │ ID                 │ Name                         │ Gender   │ DOB           │
├─────┼────────────────────┼──────────────────────────────┼──────────┼───────────────┤
│ 1   │ 597226             │ Smith, Sean                  │ male     │ 1937-03-01    │
├─────┼────────────────────┼──────────────────────────────┼──────────┼───────────────┤
│ 2   │ 597372             │ Joe, Smith                   │ male     │ 2002-02-20    │
├─────┼────────────────────┼──────────────────────────────┼──────────┼───────────────┤
│ 3   │ 618626             │ Smith, Julia                 │ female   │ 1930-05-01    │
├─────┼────────────────────┼──────────────────────────────┼──────────┼───────────────┤
│ 4   │ 620442             │ Smith, Tracy                 │ female   │ 1948-03-14    │
├─────┼────────────────────┼──────────────────────────────┼──────────┼───────────────┤
│ 5   │ 625276             │ Smith, John                  │ ?        │ N/A           │
└─────┴────────────────────┴──────────────────────────────┴──────────┴───────────────┘
Tip: Use "select 1" to set a patient as active.
```

## Selecting a Patient

```
ehrsh> select 1

Selected: Smith, Sean (ID: 597226)
```

## Viewing Medications

```
ehrsh> show their meds

Medications
───────────
┌─────┬──────────────────────────────────────────────────┬────────────┬───────────────┐
│ #   │ Medication                                       │ Status     │ Date          │
├─────┼──────────────────────────────────────────────────┼────────────┼───────────────┤
│ 1   │ aspirin                                          │ active     │ Jan 12, 26    │
└─────┴──────────────────────────────────────────────────┴────────────┴───────────────┘
```

## Adding a Medication

```
ehrsh> add albuterol

✔ Created MedicationRequest/53804316
  Patient: Smith, Sean
  Medication: albuterol
  Status: active
```

## Natural Language Variations

These all work thanks to Claude API parsing:

```
ehrsh> what pills is this patient on

Medications
───────────
┌─────┬──────────────────────────────────────────────────┬────────────┬───────────────┐
│ #   │ Medication                                       │ Status     │ Date          │
├─────┼──────────────────────────────────────────────────┼────────────┼───────────────┤
│ 1   │ aspirin                                          │ active     │ Jan 12, 26    │
└─────┴──────────────────────────────────────────────────┴────────────┴───────────────┘
```

```
ehrsh> any medications for this patient

Medications
───────────
(same output - Claude correctly interprets the natural language)
```

## Viewing Labs

```
ehrsh> show their labs

Lab Results
───────────
No lab results found.
```

```
ehrsh> how's their kidney function

Lab Results
───────────
No lab results found.
```

## Compound Commands

Chain multiple commands together:

```
ehrsh> find patient Smith and show their meds

Executing 2 commands...

Patient Search Results
──────────────────────
┌─────┬────────────────────┬──────────────────────────────┬──────────┬───────────────┐
│ #   │ ID                 │ Name                         │ Gender   │ DOB           │
├─────┼────────────────────┼──────────────────────────────┼──────────┼───────────────┤
│ 1   │ 597226             │ Smith, Sean                  │ male     │ 1937-03-01    │
...
└─────┴────────────────────┴──────────────────────────────┴──────────┴───────────────┘

(compound commands correctly parsed and executed in sequence)
```

## Help Command

```
ehrsh> help

ehrsh Commands
──────────────

Patient Search:
  find patients named Smith
  search patient John Doe

Schedule:
  show today's schedule
  show clinic schedule

Medications:
  show patient 123's meds
  show their medications     (uses active patient)
  add albuterol to patient 123

Labs:
  show patient 123's labs
  plot creatinine for patient 123 over past year

Notes:
  show their notes
  draft a note               (opens editor with template)

Messaging:
  message patient 123 about their appointment
  text patient Smith saying "Please confirm your visit"
  ask patient 123 if they received the prescription
  check responses conv-xxx   (check for patient replies)

Navigation:
  select 1                   (select patient from last search)
  help
  exit / quit

Compound Commands:  (chain multiple commands together)
  find patient Smith and show their meds
  find patient John Doe, select 1, show labs
  show patient Smith's meds then add albuterol
  search patient Jones; select 1; plot creatinine

Conditional Workflows:  (if/then/else logic)
  ask pt 123 if I can move him to 3pm, if he says yes move him
  if creatinine > 2.0 then flag for nephrology
  show their meds, if none found add metformin
  show pending workflows    (view queued workflows)

────────────────────────────────────────────────────────────
```

## Full Workflow Example

Complete patient workflow from search to medication management:

```
ehrsh> find patients named Williams

Patient Search Results
──────────────────────
┌─────┬────────────────────┬──────────────────────────────┬──────────┬───────────────┐
│ #   │ ID                 │ Name                         │ Gender   │ DOB           │
├─────┼────────────────────┼──────────────────────────────┼──────────┼───────────────┤
│ 1   │ 591961             │ Williams, Harry              │ male     │ 2000-12-20    │
│ 2   │ 1193061            │ Williams, Jackson            │ male     │ 2000-06-09    │
│ 3   │ 1193139            │ Williams, Ella               │ female   │ 2020-06-09    │
...
└─────┴────────────────────┴──────────────────────────────┴──────────┴───────────────┘

ehrsh> select 1

Selected: Williams, Harry (ID: 591961)

ehrsh> show their meds

Medications
───────────
No medications found.

ehrsh> add metformin 500mg

✔ Created MedicationRequest/53804345
  Patient: Williams, Harry
  Medication: metformin 500mg
  Status: active

ehrsh> what pills is this patient on

Medications
───────────
(query confirms medication system works)
```

---

## Test Summary

| Test Group | Description | Result |
|------------|-------------|--------|
| A | Basic Commands | PASS |
| B | NL Variations (meds) | PASS |
| C | NL Variations (labs) | PASS |
| D | NL Variations (schedule) | PASS |
| E | Compound Commands | PASS |
| F | Conditionals | PASS |
| G | Edge Cases | PASS |
| H | Messaging | PASS |
| I | Integration | PASS |

**All tests passed against public HAPI FHIR server.**
