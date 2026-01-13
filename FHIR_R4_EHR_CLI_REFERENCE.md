# FHIR R4 Operations Reference for EHR CLI

A comprehensive guide to key FHIR R4 operations needed for Electronic Health Record (EHR) Command Line Interface (CLI) implementation.

**Version:** 1.0
**FHIR Standard:** Release 4 (R4)
**Last Updated:** January 2026

---

## Table of Contents

1. [Patient Operations](#1-patient-operations)
2. [Schedule & Appointments](#2-schedule--appointments)
3. [Medications](#3-medications)
4. [Lab Results](#4-lab-results)
5. [Clinical Notes & Documentation](#5-clinical-notes--documentation)
6. [Common Patterns & Best Practices](#6-common-patterns--best-practices)
7. [Authentication & Error Handling](#7-authentication--error-handling)

---

## 1. Patient Operations

### Overview
The Patient resource contains demographics and other administrative information about an individual receiving care or other health-related services.

### Resource Type
**FHIR Resource:** `Patient`
**Base URL Pattern:** `[base]/Patient`

### Key Search Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `name` | string | A portion of either family or given name of the patient | `name=Smith` |
| `family` | string | A portion of the family name of the patient | `family=Smith` |
| `given` | string | A portion of the given name of the patient | `given=John` |
| `identifier` | token | A patient identifier (MRN, SSN, etc.) | `identifier=MRN\|12345` |
| `birthdate` | date | The patient's date of birth | `birthdate=1980-01-15` |
| `gender` | token | Gender of the patient (male, female, other, unknown) | `gender=male` |
| `address-city` | string | City of the address | `address-city=Houston` |
| `address-state` | string | State of the address | `address-state=TX` |
| `address-postalcode` | string | Postal code | `address-postalcode=77001` |
| `phone` | token | Phone number | `phone=7135551234` |
| `email` | token | Email address | `email=john@example.com` |
| `active` | token | Whether the record is active (true/false) | `active=true` |
| `_lastUpdated` | date | When the resource was last updated | `_lastUpdated=ge2024-01-01` |

### REST Query Examples

#### 1.1 Search by Name
```bash
# Search by full name
GET [base]/Patient?name=John+Smith

# Search by family and given name separately
GET [base]/Patient?family=Smith&given=John

# Case-insensitive, partial match search
GET [base]/Patient?name=joh
```

**Response:** Bundle of Patient resources matching the search criteria

#### 1.2 Search by Medical Record Number (MRN)
```bash
# Using system and value
GET [base]/Patient?identifier=http://hospital.example.com/mrn|MRN12345

# Alternative: just the value
GET [base]/Patient?identifier=MRN12345
```

#### 1.3 Search by Date of Birth
```bash
# Exact date
GET [base]/Patient?birthdate=1980-01-15

# Date range (greater than or equal)
GET [base]/Patient?birthdate=ge1980-01-01

# Date range (less than)
GET [base]/Patient?birthdate=lt1985-01-01

# Between dates
GET [base]/Patient?birthdate=ge1980-01-01&birthdate=lt1985-01-01
```

#### 1.4 Combined Searches
```bash
# Name + Gender
GET [base]/Patient?name=Smith&gender=female

# Name + DOB
GET [base]/Patient?family=Smith&birthdate=1980-01-15

# Complex query: Name + City + Gender
GET [base]/Patient?name=John&address-city=Houston&gender=male
```

#### 1.5 Get Specific Patient by ID
```bash
GET [base]/Patient/[patient-id]
```

### Patient Resource Structure

```json
{
  "resourceType": "Patient",
  "id": "example-patient-1",
  "identifier": [
    {
      "type": {
        "coding": [
          {
            "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
            "code": "MR",
            "display": "Medical Record Number"
          }
        ]
      },
      "system": "http://hospital.example.com/mrn",
      "value": "MRN123456"
    }
  ],
  "active": true,
  "name": [
    {
      "use": "official",
      "family": "Smith",
      "given": ["John", "Michael"],
      "prefix": ["Mr."],
      "suffix": ["Jr."]
    },
    {
      "use": "nickname",
      "given": ["Johnny"]
    }
  ],
  "telecom": [
    {
      "system": "phone",
      "value": "713-555-1234",
      "use": "home"
    },
    {
      "system": "email",
      "value": "john.smith@example.com"
    },
    {
      "system": "phone",
      "value": "713-555-5678",
      "use": "work"
    }
  ],
  "gender": "male",
  "birthDate": "1980-01-15",
  "address": [
    {
      "use": "home",
      "type": "postal",
      "text": "123 Main Street, Houston, TX 77001",
      "line": ["123 Main Street"],
      "city": "Houston",
      "state": "TX",
      "postalCode": "77001",
      "country": "USA"
    }
  ],
  "maritalStatus": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus",
        "code": "M",
        "display": "Married"
      }
    ]
  },
  "contact": [
    {
      "relationship": [
        {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/v2-0131",
              "code": "N",
              "display": "Next-of-kin"
            }
          ]
        }
      ],
      "name": {
        "family": "Smith",
        "given": ["Jane"]
      },
      "telecom": [
        {
          "system": "phone",
          "value": "713-555-9999"
        }
      ]
    }
  ],
  "communication": [
    {
      "language": {
        "coding": [
          {
            "system": "urn:ietf:bcp:47",
            "code": "en",
            "display": "English"
          }
        ]
      },
      "preferred": true
    }
  ],
  "meta": {
    "lastUpdated": "2024-01-15T10:30:00Z",
    "versionId": "2"
  }
}
```

### Key Fields for Demographics

- **id**: Unique patient identifier in system
- **identifier**: External identifiers (MRN, SSN, passport, etc.) with system and value
- **active**: Boolean indicating if patient record is active
- **name**: Array of names with use types (official, nickname, maiden, etc.)
- **gender**: One of: male, female, other, unknown
- **birthDate**: ISO 8601 date format (YYYY-MM-DD)
- **telecom**: Contact information (phone, email, fax, etc.)
- **address**: One or more addresses with use (home, work, temp, etc.)
- **maritalStatus**: Coded value using V3-MaritalStatus CodeSystem
- **contact**: Emergency contacts with relationship types
- **communication**: Languages spoken with preference indicator

### Pagination

Responses use FHIR Bundle resources with pagination:

```bash
# Get first page (default page size varies by server)
GET [base]/Patient?name=Smith

# Specify page size
GET [base]/Patient?name=Smith&_count=50

# Get specific page (use 'next' link from previous response)
GET [base]/Patient?name=Smith&_count=50&_offset=50

# Total count without retrieving results
GET [base]/Patient?name=Smith&_summary=count
```

### Common Use Cases for EHR CLI

1. **Patient lookup:** Search by name and DOB to verify patient identity
2. **MRN verification:** Get patient details given their medical record number
3. **Demographics update trigger:** Monitor `_lastUpdated` for recent changes
4. **Patient list export:** Search with criteria and iterate through pages
5. **Duplicate detection:** Search for similar names/DOB combinations

---

## 2. Schedule & Appointments

### Overview
The Appointment, Schedule, and Slot resources work together to manage clinical scheduling:
- **Schedule**: Container for a practitioner's/resource's availability
- **Slot**: Individual time slot within a schedule
- **Appointment**: Booked appointment with one or more participants

### Resource Types

#### 2.1 Schedule Resource

**FHIR Resource:** `Schedule`
**Base URL Pattern:** `[base]/Schedule`

##### Key Search Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `actor` | reference | The practitioner or resource this schedule applies to | `actor=Practitioner/prac-123` |
| `date` | date | The start date of the schedule | `date=2024-02-01` |
| `identifier` | token | External identifier for the schedule | `identifier=SCHED123` |
| `specialty` | token | Type of specialty (cardiology, pediatrics, etc.) | `specialty=cardiology` |
| `service-type` | token | The type of service provided | `service-type=consultation` |

##### Schedule Resource Structure

```json
{
  "resourceType": "Schedule",
  "id": "schedule-cardiology-dr-smith",
  "identifier": [
    {
      "system": "http://hospital.example.com/schedule",
      "value": "SCHED-CARDIO-001"
    }
  ],
  "active": true,
  "serviceType": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/service-type",
          "code": "367",
          "display": "Cardiology"
        }
      ]
    }
  ],
  "specialty": [
    {
      "coding": [
        {
          "system": "http://snomed.info/sct",
          "code": "394579002",
          "display": "Cardiology"
        }
      ]
    }
  ],
  "actor": [
    {
      "reference": "Practitioner/dr-smith-123"
    },
    {
      "reference": "Location/clinic-downtown"
    }
  ],
  "planningHorizon": {
    "start": "2024-02-01T00:00:00Z",
    "end": "2024-03-31T23:59:59Z"
  },
  "comment": "Accepting new patients",
  "meta": {
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
}
```

#### 2.2 Slot Resource

**FHIR Resource:** `Slot`
**Base URL Pattern:** `[base]/Slot`

##### Key Search Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `schedule` | reference | The schedule this slot belongs to | `schedule=Schedule/schedule-123` |
| `status` | token | Slot status: free, busy, busy-unavailable, or entered-in-error | `status=free` |
| `start` | date | The start date/time of the slot | `start=2024-02-01` |
| `start` | dateTime | Specific start time (greater than or equal) | `start=ge2024-02-01T09:00:00Z` |
| `specialty` | token | Specialty of the slot | `specialty=cardiology` |
| `service-type` | token | Type of service | `service-type=consultation` |
| `practitioner` | reference | The practitioner providing the service | `practitioner=Practitioner/dr-123` |
| `location` | reference | Location where slot is available | `location=Location/clinic-123` |

##### Slot Resource Structure

```json
{
  "resourceType": "Slot",
  "id": "slot-cardio-20240201-0900",
  "identifier": [
    {
      "system": "http://hospital.example.com/slot",
      "value": "SLOT-20240201-0900"
    }
  ],
  "serviceCategory": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/service-category",
          "code": "17",
          "display": "General Practice"
        }
      ]
    }
  ],
  "serviceType": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/service-type",
          "code": "367",
          "display": "Cardiology"
        }
      ]
    }
  ],
  "specialty": [
    {
      "coding": [
        {
          "system": "http://snomed.info/sct",
          "code": "394579002",
          "display": "Cardiology"
        }
      ]
    }
  ],
  "schedule": {
    "reference": "Schedule/schedule-cardiology-dr-smith"
  },
  "status": "free",
  "start": "2024-02-01T09:00:00Z",
  "end": "2024-02-01T09:30:00Z",
  "overbooked": false,
  "comment": "New patient slot available",
  "meta": {
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
}
```

#### 2.3 Appointment Resource

**FHIR Resource:** `Appointment`
**Base URL Pattern:** `[base]/Appointment`

##### Key Search Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `patient` | reference | The patient the appointment is for | `patient=Patient/pat-123` |
| `actor` | reference | Participant (practitioner, location) | `actor=Practitioner/dr-123` |
| `date` | date | Appointment date | `date=2024-02-01` |
| `start` | dateTime | Appointment start time (greater than or equal) | `start=ge2024-02-01T09:00:00Z` |
| `status` | token | Appointment status: proposed, pending, booked, arrived, fulfilled, cancelled, noshow, entered-in-error | `status=booked` |
| `identifier` | token | Appointment identifier | `identifier=APT123` |
| `appointment-type` | token | The type of appointment (checkup, surgery, etc.) | `appointment-type=checkup` |
| `specialty` | token | Medical specialty | `specialty=cardiology` |
| `location` | reference | Appointment location | `location=Location/clinic-123` |
| `slot` | reference | The slot the appointment is booked into | `slot=Slot/slot-123` |

##### REST Query Examples for Appointments

```bash
# Get all appointments for a patient
GET [base]/Appointment?patient=Patient/pat-12345

# Get appointments for a practitioner on a specific date
GET [base]/Appointment?actor=Practitioner/dr-123&date=2024-02-01

# Get all booked appointments for a date range
GET [base]/Appointment?date=ge2024-02-01&date=lt2024-02-28&status=booked

# Get free slots for a specialty
GET [base]/Slot?specialty=cardiology&status=free&start=ge2024-02-01T00:00:00Z

# Get appointments for patient in a date range with status
GET [base]/Appointment?patient=Patient/pat-123&date=ge2024-01-01&date=lt2024-12-31&status=booked

# Search by appointment type and location
GET [base]/Appointment?appointment-type=surgery&location=Location/or-1&status=booked
```

##### Appointment Resource Structure

```json
{
  "resourceType": "Appointment",
  "id": "apt-cardio-20240201-0900",
  "identifier": [
    {
      "system": "http://hospital.example.com/appointment",
      "value": "APT-20240201-0900"
    }
  ],
  "status": "booked",
  "cancelationReason": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/appointment-cancellation-reason",
        "code": "pat-unavail",
        "display": "Patient unavailable"
      }
    ]
  },
  "appointmentType": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/v2-0276",
        "code": "ROUTINE",
        "display": "Routine appointment"
      }
    ]
  },
  "specialty": [
    {
      "coding": [
        {
          "system": "http://snomed.info/sct",
          "code": "394579002",
          "display": "Cardiology"
        }
      ]
    }
  ],
  "reasonCode": [
    {
      "coding": [
        {
          "system": "http://snomed.info/sct",
          "code": "27822007",
          "display": "Cardiac evaluation"
        }
      ]
    }
  ],
  "reasonReference": [
    {
      "reference": "Condition/condition-hypertension-456"
    }
  ],
  "priority": 0,
  "description": "Annual cardiology checkup",
  "start": "2024-02-01T09:00:00Z",
  "end": "2024-02-01T09:30:00Z",
  "minutesDuration": 30,
  "slot": [
    {
      "reference": "Slot/slot-cardio-20240201-0900"
    }
  ],
  "created": "2024-01-20T14:22:09.284Z",
  "comment": "Patient has history of hypertension",
  "basedOn": [
    {
      "reference": "ServiceRequest/service-req-123"
    }
  ],
  "participant": [
    {
      "type": [
        {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
              "code": "PPRF",
              "display": "Primary Performer"
            }
          ]
        }
      ],
      "actor": {
        "reference": "Practitioner/dr-smith-123",
        "display": "Dr. Smith"
      },
      "required": "required",
      "status": "accepted"
    },
    {
      "type": [
        {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
              "code": "SBJ",
              "display": "Subject"
            }
          ]
        }
      ],
      "actor": {
        "reference": "Patient/pat-12345",
        "display": "John Smith"
      },
      "required": "required",
      "status": "accepted"
    },
    {
      "type": [
        {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
              "code": "SPRF",
              "display": "Secondary Performer"
            }
          ]
        }
      ],
      "actor": {
        "reference": "Location/clinic-downtown",
        "display": "Downtown Clinic"
      },
      "required": "required",
      "status": "accepted"
    }
  ],
  "requestedPeriod": [
    {
      "start": "2024-02-01T09:00:00Z",
      "end": "2024-02-01T17:00:00Z"
    }
  ],
  "meta": {
    "lastUpdated": "2024-01-20T14:22:09.284Z",
    "versionId": "1"
  }
}
```

### Appointment Status Values
- **proposed**: Initial proposal (informal booking)
- **pending**: Pending approval/confirmation
- **booked**: Confirmed appointment
- **arrived**: Patient has arrived
- **fulfilled**: Appointment completed
- **cancelled**: Appointment cancelled
- **noshow**: Patient did not appear
- **entered-in-error**: Erroneous entry

### Common Use Cases for EHR CLI

1. **View available slots:** List free slots for a practitioner on specific dates
2. **Schedule appointment:** Create new appointment in available slot
3. **Check patient appointments:** List all scheduled appointments for a patient
4. **Reschedule:** Cancel one appointment and create new one in different slot
5. **Slot management:** Check practitioner availability and find conflicts
6. **No-show tracking:** Query appointments with noshow status for follow-up

---

## 3. Medications

### Overview
Medications are represented through multiple interrelated resources:
- **MedicationRequest**: A prescription or medication order (what was prescribed)
- **MedicationStatement**: What the patient is actually taking (what patient reports/is on)
- **Medication**: The actual drug information (defined separately or inline)
- **MedicationAdministration**: Record of medication being given (in clinical settings)

### Resource Type 1: MedicationRequest

**FHIR Resource:** `MedicationRequest`
**Base URL Pattern:** `[base]/MedicationRequest`

#### Key Search Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `patient` | reference | Patient the prescription is for | `patient=Patient/pat-123` |
| `identifier` | token | Prescription identifier | `identifier=RX123456` |
| `status` | token | Status: active, on-hold, cancelled, completed, entered-in-error, draft, unknown | `status=active` |
| `intent` | token | Intent: proposal, plan, order, original-order, reflex-order, filler-order, instance-order, option | `intent=order` |
| `authoredon` | date | When prescription was written | `authoredon=2024-01-15` |
| `requester` | reference | Practitioner who wrote the prescription | `requester=Practitioner/dr-123` |
| `medication` | reference | The medication being prescribed | `medication=Medication/med-123` |
| `code` | token | Medication code (RxNorm, SNOMED, etc.) | `code=http://www.nlm.nih.gov/research/umls/rxnorm\|1234567` |
| `encounter` | reference | Related encounter | `encounter=Encounter/enc-123` |
| `_lastUpdated` | date | Last update time | `_lastUpdated=ge2024-01-01` |

#### REST Query Examples

```bash
# Get all active prescriptions for a patient
GET [base]/MedicationRequest?patient=Patient/pat-123&status=active

# Get prescriptions for a patient authored in last 30 days
GET [base]/MedicationRequest?patient=Patient/pat-123&authoredon=ge2024-01-01

# Get completed prescriptions for patient
GET [base]/MedicationRequest?patient=Patient/pat-123&status=completed

# Get prescriptions by prescriber
GET [base]/MedicationRequest?requester=Practitioner/dr-123&status=active

# Get prescriptions for specific medication
GET [base]/MedicationRequest?patient=Patient/pat-123&medication=Medication/atorvastatin-20mg

# Advanced: Get orders authored in date range with intent
GET [base]/MedicationRequest?patient=Patient/pat-123&authoredon=ge2024-01-01&authoredon=lt2024-02-01&intent=order
```

#### MedicationRequest Resource Structure

```json
{
  "resourceType": "MedicationRequest",
  "id": "rx-metoprolol-12345",
  "identifier": [
    {
      "system": "http://hospital.example.com/prescription",
      "value": "RX-MET-001234"
    }
  ],
  "status": "active",
  "statusReason": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason",
        "code": "altchoice",
        "display": "Try another treatment first"
      }
    ]
  },
  "intent": "order",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/medicationrequest-category",
          "code": "outpatient",
          "display": "Outpatient"
        }
      ]
    }
  ],
  "priority": "routine",
  "medicationCodeableConcept": {
    "coding": [
      {
        "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
        "code": "866428",
        "display": "metoprolol tartrate 25 MG Oral Tablet"
      }
    ],
    "text": "Metoprolol 25mg tablet"
  },
  "subject": {
    "reference": "Patient/pat-12345",
    "display": "John Smith"
  },
  "encounter": {
    "reference": "Encounter/enc-cardio-20240115"
  },
  "authoredOn": "2024-01-15T14:30:00Z",
  "requester": {
    "reference": "Practitioner/dr-smith-123",
    "display": "Dr. Smith"
  },
  "reasonCode": [
    {
      "coding": [
        {
          "system": "http://snomed.info/sct",
          "code": "38341003",
          "display": "Hypertension"
        }
      ]
    }
  ],
  "reasonReference": [
    {
      "reference": "Condition/condition-hypertension-456"
    }
  ],
  "note": [
    {
      "text": "Take with food. Monitor blood pressure regularly."
    }
  ],
  "dosageInstruction": [
    {
      "sequence": 1,
      "text": "25 mg once daily",
      "timing": {
        "repeat": {
          "frequency": 1,
          "period": 1,
          "periodUnit": "d"
        },
        "code": {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/timing-abbreviation",
              "code": "QD",
              "display": "Every day"
            }
          ]
        }
      },
      "route": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "code": "26643006",
            "display": "Oral route (qualifier value)"
          }
        ]
      },
      "doseAndRate": [
        {
          "type": {
            "coding": [
              {
                "system": "http://terminology.hl7.org/CodeSystem/dose-rate-type",
                "code": "ordered",
                "display": "Ordered"
              }
            ]
          },
          "doseQuantity": {
            "value": 25,
            "unit": "mg",
            "system": "http://unitsofmeasure.org",
            "code": "mg"
          }
        }
      ]
    }
  ],
  "dispenseRequest": {
    "initialFill": {
      "quantity": {
        "value": 30,
        "unit": "tablets",
        "system": "http://unitsofmeasure.org",
        "code": "{tablets}"
      },
      "duration": {
        "value": 30,
        "unit": "days",
        "system": "http://unitsofmeasure.org",
        "code": "d"
      }
    },
    "dispenseInterval": {
      "value": 1,
      "unit": "months",
      "system": "http://unitsofmeasure.org",
      "code": "mo"
    },
    "validityPeriod": {
      "start": "2024-01-15T00:00:00Z",
      "end": "2025-01-15T23:59:59Z"
    },
    "numberOfRepeatsAllowed": 11,
    "quantity": {
      "value": 30,
      "unit": "tablets",
      "system": "http://unitsofmeasure.org",
      "code": "{tablets}"
    },
    "expectedSupplyDuration": {
      "value": 30,
      "unit": "days",
      "system": "http://unitsofmeasure.org",
      "code": "d"
    }
  },
  "substitution": {
    "allowed": true,
    "reason": {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/v3-ActReason",
          "code": "CT",
          "display": "Cost"
        }
      ]
    }
  },
  "priorPrescription": {
    "reference": "MedicationRequest/rx-metoprolol-11111"
  },
  "meta": {
    "lastUpdated": "2024-01-15T14:30:00Z",
    "versionId": "1"
  }
}
```

### Resource Type 2: MedicationStatement

**FHIR Resource:** `MedicationStatement`
**Base URL Pattern:** `[base]/MedicationStatement`

#### Key Search Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `patient` | reference | Patient taking the medication | `patient=Patient/pat-123` |
| `status` | token | Status: active, completed, entered-in-error, intended, stopped, on-hold, unknown, not-taken | `status=active` |
| `medication` | reference | The medication | `medication=Medication/med-123` |
| `code` | token | Medication code (RxNorm, SNOMED, etc.) | `code=http://www.nlm.nih.gov/research/umls/rxnorm\|1234567` |
| `effective` | date | When medication is/was being taken | `effective=ge2024-01-01` |
| `source` | reference | Who provided the information (patient, practitioner, etc.) | `source=Practitioner/dr-123` |
| `identifier` | token | Identifier for the statement | `identifier=MS123456` |
| `_lastUpdated` | date | Last update time | `_lastUpdated=ge2024-01-01` |

#### REST Query Examples

```bash
# Get current medications for patient
GET [base]/MedicationStatement?patient=Patient/pat-123&status=active

# Get all medications patient has taken (active and completed)
GET [base]/MedicationStatement?patient=Patient/pat-123

# Get medications started after specific date
GET [base]/MedicationStatement?patient=Patient/pat-123&effective=ge2024-01-01

# Get completed medications (discontinued)
GET [base]/MedicationStatement?patient=Patient/pat-123&status=completed

# Get medications patient reports not taking
GET [base]/MedicationStatement?patient=Patient/pat-123&status=not-taken
```

#### MedicationStatement Resource Structure

```json
{
  "resourceType": "MedicationStatement",
  "id": "ms-lisinopril-12345",
  "identifier": [
    {
      "system": "http://hospital.example.com/medication-statement",
      "value": "MS-LIS-001234"
    }
  ],
  "status": "active",
  "category": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/medication-statement-category",
        "code": "inpatient",
        "display": "Inpatient"
      }
    ]
  },
  "medicationCodeableConcept": {
    "coding": [
      {
        "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
        "code": "314076",
        "display": "lisinopril 10 MG Oral Tablet"
      }
    ],
    "text": "Lisinopril 10mg"
  },
  "subject": {
    "reference": "Patient/pat-12345",
    "display": "John Smith"
  },
  "context": {
    "reference": "Encounter/enc-cardio-20240115"
  },
  "effectiveDateTime": "2024-01-15T00:00:00Z",
  "effectivePeriod": {
    "start": "2024-01-15T00:00:00Z",
    "end": "2024-02-15T23:59:59Z"
  },
  "dateAsserted": "2024-01-15T14:30:00Z",
  "informationSource": {
    "reference": "Patient/pat-12345",
    "display": "Patient reported"
  },
  "derivedFrom": [
    {
      "reference": "MedicationRequest/rx-lisinopril-999"
    }
  ],
  "reasonCode": [
    {
      "coding": [
        {
          "system": "http://snomed.info/sct",
          "code": "38341003",
          "display": "Hypertension"
        }
      ]
    }
  ],
  "reasonReference": [
    {
      "reference": "Condition/condition-hypertension-456"
    }
  ],
  "note": [
    {
      "text": "Patient reports taking medication consistently. Good adherence."
    }
  ],
  "dosage": [
    {
      "sequence": 1,
      "text": "10 mg once daily",
      "timing": {
        "repeat": {
          "frequency": 1,
          "period": 1,
          "periodUnit": "d"
        }
      },
      "route": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "code": "26643006",
            "display": "Oral route"
          }
        ]
      },
      "doseAndRate": [
        {
          "doseQuantity": {
            "value": 10,
            "unit": "mg",
            "system": "http://unitsofmeasure.org",
            "code": "mg"
          }
        }
      ]
    }
  ],
  "meta": {
    "lastUpdated": "2024-01-15T14:30:00Z",
    "versionId": "1"
  }
}
```

### Resource Type 3: Medication (Referenced)

**FHIR Resource:** `Medication`
**Base URL Pattern:** `[base]/Medication`

Medication can be referenced as:
1. **Contained resource** (inline in request/statement)
2. **Reference** (separate resource)
3. **CodeableConcept** (inline coding)

#### Medication Resource Structure

```json
{
  "resourceType": "Medication",
  "id": "med-metoprolol-25mg",
  "code": {
    "coding": [
      {
        "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
        "code": "866428",
        "display": "metoprolol tartrate 25 MG Oral Tablet"
      },
      {
        "system": "http://snomed.info/sct",
        "code": "319749007",
        "display": "Metoprolol 25mg tablet"
      }
    ],
    "text": "Metoprolol 25mg tablet"
  },
  "status": "active",
  "manufacturer": {
    "reference": "Organization/pharma-company-123",
    "display": "Pharmacy Inc."
  },
  "doseForm": {
    "coding": [
      {
        "system": "http://snomed.info/sct",
        "code": "385055001",
        "display": "Tablet"
      }
    ]
  },
  "amount": {
    "numerator": {
      "value": 25,
      "unit": "mg",
      "system": "http://unitsofmeasure.org",
      "code": "mg"
    },
    "denominator": {
      "value": 1,
      "unit": "tablet",
      "system": "http://unitsofmeasure.org",
      "code": "{tablet}"
    }
  },
  "ingredient": [
    {
      "item": {
        "coding": [
          {
            "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
            "code": "6918",
            "display": "metoprolol"
          }
        ]
      },
      "strength": {
        "numerator": {
          "value": 25,
          "unit": "mg",
          "system": "http://unitsofmeasure.org",
          "code": "mg"
        },
        "denominator": {
          "value": 1,
          "unit": "tablet",
          "system": "http://unitsofmeasure.org",
          "code": "{tablet}"
        }
      }
    }
  ],
  "meta": {
    "lastUpdated": "2024-01-01T00:00:00Z"
  }
}
```

### Creating/Updating Medications

#### Create New MedicationRequest (Prescription)

```bash
POST [base]/MedicationRequest
Content-Type: application/fhir+json

{
  "resourceType": "MedicationRequest",
  "status": "active",
  "intent": "order",
  "medicationCodeableConcept": {
    "coding": [
      {
        "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
        "code": "314076"
      }
    ]
  },
  "subject": {
    "reference": "Patient/pat-12345"
  },
  "encounter": {
    "reference": "Encounter/enc-123"
  },
  "authoredOn": "2024-01-15T14:30:00Z",
  "requester": {
    "reference": "Practitioner/dr-smith-123"
  },
  "dosageInstruction": [
    {
      "text": "10 mg once daily",
      "timing": {
        "repeat": {
          "frequency": 1,
          "period": 1,
          "periodUnit": "d"
        }
      },
      "route": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "code": "26643006"
          }
        ]
      },
      "doseAndRate": [
        {
          "doseQuantity": {
            "value": 10,
            "unit": "mg",
            "system": "http://unitsofmeasure.org",
            "code": "mg"
          }
        }
      ]
    }
  ],
  "dispenseRequest": {
    "quantity": {
      "value": 30,
      "unit": "tablets",
      "system": "http://unitsofmeasure.org",
      "code": "{tablets}"
    },
    "numberOfRepeatsAllowed": 11
  }
}
```

**Response:** Returns created MedicationRequest with server-assigned ID

#### Update Medication Request Status (e.g., Cancel)

```bash
PUT [base]/MedicationRequest/[id]
Content-Type: application/fhir+json

{
  "resourceType": "MedicationRequest",
  "id": "[id]",
  "status": "cancelled",
  "statusReason": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/medicationrequest-status-reason",
        "code": "dupthpy",
        "display": "Duplicate therapy"
      }
    ]
  },
  ...rest of the fields...
}
```

### Common Medication Codes

#### RxNorm Codes (Common Medications)

| Medication | RxNorm Code | Dosage |
|-----------|------------|--------|
| Lisinopril | 314076 | 10 MG Oral Tablet |
| Metoprolol | 866428 | 25 MG Oral Tablet |
| Atorvastatin | 617312 | 20 MG Oral Tablet |
| Metformin | 860975 | 500 MG Oral Tablet |
| Aspirin | 243670 | 325 MG Oral Tablet |
| Amoxicillin | 308191 | 250 MG Oral Capsule |
| Omeprazole | 571016 | 20 MG Oral Capsule |

#### Routes of Administration (SNOMED CT)

| Route | SNOMED Code | Display |
|-------|------------|---------|
| Oral | 26643006 | Oral route |
| Intravenous | 47625008 | Intravenous route |
| Intramuscular | 78421000 | Intramuscular route |
| Subcutaneous | 34206005 | Subcutaneous route |
| Transdermal | 37161004 | Transdermal route |
| Inhaled | 54471007 | Inhaled route |
| Topical | 6064005 | Topical route |

### Common Use Cases for EHR CLI

1. **Current medication list:** Get all active MedicationStatements for patient
2. **Prescription history:** Query MedicationRequests with date ranges
3. **New prescription:** Create MedicationRequest with proper dosage and dispensing info
4. **Medication reconciliation:** Compare MedicationRequests vs MedicationStatements
5. **Medication adherence:** Check status of prescriptions (active, completed, cancelled)
6. **Drug interactions:** Review all current medications for patient
7. **Refill management:** Check dispenseRequest refills remaining

---

## 4. Lab Results

### Overview
Laboratory results are captured using the Observation resource with:
- **category**: "laboratory"
- **code**: LOINC code for the specific test
- **value**: The result value with unit
- **referenceRange**: Normal/expected values
- **interpretation**: Whether result is high/normal/low

### Resource Type: Observation

**FHIR Resource:** `Observation`
**Base URL Pattern:** `[base]/Observation`

#### Key Search Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `patient` | reference | Patient the observation is for | `patient=Patient/pat-123` |
| `code` | token | LOINC code for test | `code=http://loinc.org\|2160-0` |
| `category` | token | Category: vital-signs, imaging, laboratory, procedure, survey, exam, social-history, therapy | `category=laboratory` |
| `status` | token | Status: registered, preliminary, final, amended, cancelled, entered-in-error, unknown | `status=final` |
| `date` | date | When observation was performed | `date=2024-01-15` |
| `effective` | date/dateTime | Effective date/time of observation | `effective=ge2024-01-01` |
| `value-quantity` | quantity | Numeric value (greater than, less than, etc.) | `value-quantity=gt100` |
| `component-code` | token | Component test code (for composite observations) | `component-code=http://loinc.org\|1975-2` |
| `specimen` | reference | Specimen used | `specimen=Specimen/spec-123` |
| `_lastUpdated` | date | Last update time | `_lastUpdated=ge2024-01-01` |

#### REST Query Examples

```bash
# Get all lab results for a patient
GET [base]/Observation?patient=Patient/pat-123&category=laboratory

# Get creatinine results (kidney function)
GET [base]/Observation?patient=Patient/pat-123&code=http://loinc.org|2160-0&category=laboratory

# Get glucose results over time
GET [base]/Observation?patient=Patient/pat-123&code=http://loinc.org|2345-7&category=laboratory&_sort=date

# Get final lab results from specific date range
GET [base]/Observation?patient=Patient/pat-123&category=laboratory&status=final&date=ge2024-01-01&date=lt2024-02-01

# Get hemoglobin A1c results (diabetes monitoring)
GET [base]/Observation?patient=Patient/pat-123&code=http://loinc.org|4548-4&category=laboratory

# Get lab results with values greater than reference range
GET [base]/Observation?patient=Patient/pat-123&category=laboratory&value-quantity=gt200

# Get CBC (Complete Blood Count) panel results
GET [base]/Observation?patient=Patient/pat-123&code=http://loinc.org|58410-2&category=laboratory

# Get lipid panel results
GET [base]/Observation?patient=Patient/pat-123&code=http://loinc.org|57698-3&category=laboratory
```

#### Observation Resource Structure (Single Result)

```json
{
  "resourceType": "Observation",
  "id": "obs-creatinine-20240115",
  "identifier": [
    {
      "system": "http://hospital.example.com/observation",
      "value": "OBS-CREAT-001234"
    }
  ],
  "basedOn": [
    {
      "reference": "ServiceRequest/service-req-123"
    }
  ],
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "laboratory",
          "display": "Laboratory"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "2160-0",
        "display": "Creatinine [Mass/volume] in Serum or Plasma"
      },
      {
        "system": "http://snomed.info/sct",
        "code": "14682000",
        "display": "Serum creatinine"
      }
    ],
    "text": "Serum Creatinine"
  },
  "subject": {
    "reference": "Patient/pat-12345",
    "display": "John Smith"
  },
  "encounter": {
    "reference": "Encounter/enc-renal-20240115"
  },
  "effectiveDateTime": "2024-01-15T08:30:00Z",
  "issued": "2024-01-15T10:45:00Z",
  "performer": [
    {
      "reference": "Organization/lab-downtown",
      "display": "Downtown Lab"
    }
  ],
  "valueQuantity": {
    "value": 1.2,
    "unit": "mg/dL",
    "system": "http://unitsofmeasure.org",
    "code": "mg/dL"
  },
  "interpretation": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
          "code": "N",
          "display": "Normal"
        }
      ]
    }
  ],
  "note": [
    {
      "text": "Sample collected in morning after overnight fast"
    }
  ],
  "specimen": {
    "reference": "Specimen/spec-serum-20240115"
  },
  "referenceRange": [
    {
      "low": {
        "value": 0.7,
        "unit": "mg/dL",
        "system": "http://unitsofmeasure.org",
        "code": "mg/dL"
      },
      "high": {
        "value": 1.3,
        "unit": "mg/dL",
        "system": "http://unitsofmeasure.org",
        "code": "mg/dL"
      },
      "text": "0.7 - 1.3 mg/dL"
    }
  ],
  "meta": {
    "lastUpdated": "2024-01-15T10:45:00Z",
    "versionId": "1"
  }
}
```

#### Observation Resource Structure (Panel/Component Results)

```json
{
  "resourceType": "Observation",
  "id": "obs-lipid-panel-20240115",
  "identifier": [
    {
      "system": "http://hospital.example.com/observation",
      "value": "OBS-LIPID-001234"
    }
  ],
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/observation-category",
          "code": "laboratory",
          "display": "Laboratory"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "57698-3",
        "display": "Lipid panel - serum or plasma"
      }
    ]
  },
  "subject": {
    "reference": "Patient/pat-12345"
  },
  "effectiveDateTime": "2024-01-15T08:30:00Z",
  "issued": "2024-01-15T10:45:00Z",
  "performer": [
    {
      "reference": "Organization/lab-downtown"
    }
  ],
  "note": [
    {
      "text": "Fasting sample"
    }
  ],
  "specimen": {
    "reference": "Specimen/spec-serum-20240115"
  },
  "component": [
    {
      "code": {
        "coding": [
          {
            "system": "http://loinc.org",
            "code": "2571-8",
            "display": "Triglycerides [Mass/volume] in Serum or Plasma"
          }
        ]
      },
      "valueQuantity": {
        "value": 150,
        "unit": "mg/dL",
        "system": "http://unitsofmeasure.org",
        "code": "mg/dL"
      },
      "interpretation": [
        {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
              "code": "N",
              "display": "Normal"
            }
          ]
        }
      ],
      "referenceRange": [
        {
          "low": {
            "value": 0,
            "unit": "mg/dL"
          },
          "high": {
            "value": 150,
            "unit": "mg/dL"
          }
        }
      ]
    },
    {
      "code": {
        "coding": [
          {
            "system": "http://loinc.org",
            "code": "2085-9",
            "display": "Cholesterol [Mass/volume] in HDL [Cholesterol]"
          }
        ]
      },
      "valueQuantity": {
        "value": 45,
        "unit": "mg/dL",
        "system": "http://unitsofmeasure.org",
        "code": "mg/dL"
      },
      "interpretation": [
        {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
              "code": "L",
              "display": "Low"
            }
          ]
        }
      ],
      "referenceRange": [
        {
          "low": {
            "value": 40,
            "unit": "mg/dL"
          }
        }
      ]
    },
    {
      "code": {
        "coding": [
          {
            "system": "http://loinc.org",
            "code": "2089-1",
            "display": "Cholesterol [Mass/volume] in LDL [Cholesterol]"
          }
        ]
      },
      "valueQuantity": {
        "value": 120,
        "unit": "mg/dL",
        "system": "http://unitsofmeasure.org",
        "code": "mg/dL"
      },
      "interpretation": [
        {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
              "code": "N",
              "display": "Normal"
            }
          ]
        }
      ],
      "referenceRange": [
        {
          "low": {
            "value": 0,
            "unit": "mg/dL"
          },
          "high": {
            "value": 130,
            "unit": "mg/dL"
          }
        }
      ]
    }
  ],
  "meta": {
    "lastUpdated": "2024-01-15T10:45:00Z"
  }
}
```

### Common LOINC Codes for Laboratory Tests

#### Metabolic Panel

| Test | LOINC Code | Units | Reference Range |
|------|-----------|-------|------------------|
| Sodium (Na) | 2951-2 | mEq/L | 135-145 |
| Potassium (K) | 2823-3 | mEq/L | 3.5-5.0 |
| Chloride (Cl) | 2075-0 | mEq/L | 98-107 |
| CO2 | 1963-8 | mEq/L | 23-29 |
| Glucose, fasting | 2345-7 | mg/dL | 70-99 |
| Creatinine | 2160-0 | mg/dL | 0.7-1.3 |
| BUN | 3094-0 | mg/dL | 7-20 |
| Calcium | 1995-1 | mg/dL | 8.5-10.5 |

#### Lipid Panel

| Test | LOINC Code | Units | Reference Range |
|------|-----------|-------|------------------|
| Total Cholesterol | 2093-3 | mg/dL | <200 |
| Triglycerides | 2571-8 | mg/dL | <150 |
| HDL Cholesterol | 2085-9 | mg/dL | >40 (M), >50 (F) |
| LDL Cholesterol | 2089-1 | mg/dL | <130 |
| Lipid Panel | 57698-3 | panel | - |

#### Complete Blood Count (CBC)

| Test | LOINC Code | Units | Reference Range |
|------|-----------|-------|------------------|
| WBC | 6690-2 | K/uL | 4.5-11.0 |
| RBC | 789-8 | M/uL | 4.5-5.5 (M), 4.1-5.1 (F) |
| Hemoglobin | 718-7 | g/dL | 13.5-17.5 (M), 12.0-15.5 (F) |
| Hematocrit | 4544-0 | % | 41-53 (M), 36-46 (F) |
| Platelets | 777-3 | K/uL | 150-400 |
| CBC Panel | 58410-2 | panel | - |

#### Thyroid Function

| Test | LOINC Code | Units | Reference Range |
|------|-----------|-------|------------------|
| TSH | 3016-3 | mIU/L | 0.4-4.0 |
| Free T4 | 3026-2 | ng/dL | 0.7-1.9 |
| Free T3 | 3635-7 | pg/mL | 2.3-4.2 |

#### Liver Function

| Test | LOINC Code | Units | Reference Range |
|------|-----------|-------|------------------|
| ALT (SGPT) | 1742-6 | U/L | 7-56 |
| AST (SGOT) | 1920-8 | U/L | 10-40 |
| Alkaline Phosphatase | 6768-6 | U/L | 30-120 |
| Total Bilirubin | 1975-2 | mg/dL | 0.2-1.2 |
| Direct Bilirubin | 1968-7 | mg/dL | 0.0-0.3 |
| Albumin | 1863-0 | g/dL | 3.5-5.0 |

#### Diabetes Monitoring

| Test | LOINC Code | Units | Reference Range |
|------|-----------|-------|------------------|
| Glucose, fasting | 2345-7 | mg/dL | 70-99 |
| HbA1c | 4548-4 | % | <5.7 |
| Glucose tolerance | 1558-5 | mg/dL | <140 (2 hr after glucose) |

#### Cardiac Markers

| Test | LOINC Code | Units | Reference Range |
|------|-----------|-------|------------------|
| Troponin I | 10839-9 | ng/mL | <0.04 |
| BNP | 33891-5 | pg/mL | <100 |
| CK-MB | 3192-3 | U/L | 0-7 |

### Accessing Lab Trends

To get trending data for a patient over time:

```bash
# Get all glucose measurements, sorted by date
GET [base]/Observation?patient=Patient/pat-123&code=http://loinc.org|2345-7&_sort=-date

# Get creatinine results from last 6 months
GET [base]/Observation?patient=Patient/pat-123&code=http://loinc.org|2160-0&date=ge2023-07-15&date=lt2024-01-15&_sort=-date

# Get abnormal results only
GET [base]/Observation?patient=Patient/pat-123&category=laboratory&_has:Observation:subject:interpretation=http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation|H
```

### Common Use Cases for EHR CLI

1. **Recent lab results:** Get latest observations for patient
2. **Lab trending:** Retrieve historical results to track progression
3. **Abnormal values:** Flag results outside reference range
4. **Panel results:** Get multiple related tests (lipid panel, CBC, etc.)
5. **Lab ordering:** Create ServiceRequest that links to resulting Observations
6. **Critical values:** Alert on critical lab result interpretation codes
7. **Lab comparison:** Compare results from different dates

---

## 5. Clinical Notes & Documentation

### Overview
Clinical documentation is captured through multiple resources:
- **Encounter**: A visit, consultation, or admission event
- **DocumentReference**: Reference to a clinical document (note, report, image)
- **DiagnosticReport**: Report of a diagnostic procedure with findings
- **Condition**: Problem/diagnosis for a patient

### Resource Type 1: Encounter

**FHIR Resource:** `Encounter`
**Base URL Pattern:** `[base]/Encounter`

#### Key Search Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `patient` | reference | Patient the encounter is for | `patient=Patient/pat-123` |
| `date` | date | Encounter date | `date=2024-01-15` |
| `status` | token | Status: planned, arrived, triaged, in-progress, on-leave, finished, cancelled, entered-in-error, unknown | `status=finished` |
| `type` | token | Encounter type: consultation, emergency, inpatient, observation, etc. | `type=consultation` |
| `practitioner` | reference | Practitioner involved | `practitioner=Practitioner/dr-123` |
| `location` | reference | Location of encounter | `location=Location/clinic-123` |
| `reason-code` | token | Reason for encounter (diagnosis code) | `reason-code=http://snomed.info/sct\|38341003` |
| `service-provider` | reference | Organization providing the service | `service-provider=Organization/hospital-123` |
| `_lastUpdated` | date | Last update time | `_lastUpdated=ge2024-01-01` |

#### REST Query Examples

```bash
# Get all encounters for a patient
GET [base]/Encounter?patient=Patient/pat-123

# Get completed encounters (visits)
GET [base]/Encounter?patient=Patient/pat-123&status=finished

# Get encounters from specific date range
GET [base]/Encounter?patient=Patient/pat-123&date=ge2024-01-01&date=lt2024-02-01

# Get specific encounter type (consultation)
GET [base]/Encounter?patient=Patient/pat-123&type=consultation&status=finished

# Get encounters by practitioner
GET [base]/Encounter?practitioner=Practitioner/dr-123&date=2024-01-15

# Get recent encounters with practitioner info
GET [base]/Encounter?patient=Patient/pat-123&_include=Encounter:practitioner&_sort=-date
```

#### Encounter Resource Structure

```json
{
  "resourceType": "Encounter",
  "id": "enc-cardio-20240115",
  "identifier": [
    {
      "system": "http://hospital.example.com/encounter",
      "value": "ENC-CARDIO-001234"
    }
  ],
  "status": "finished",
  "statusHistory": [
    {
      "status": "in-progress",
      "period": {
        "start": "2024-01-15T09:00:00Z"
      }
    },
    {
      "status": "finished",
      "period": {
        "start": "2024-01-15T09:00:00Z",
        "end": "2024-01-15T09:45:00Z"
      }
    }
  ],
  "class": {
    "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
    "code": "AMB",
    "display": "Ambulatory"
  },
  "type": [
    {
      "coding": [
        {
          "system": "http://snomed.info/sct",
          "code": "11429006",
          "display": "Consultation"
        }
      ],
      "text": "Cardiology Consultation"
    }
  ],
  "serviceType": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/service-type",
        "code": "367",
        "display": "Cardiology"
      }
    ]
  },
  "priority": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/v3-ActPriority",
        "code": "R",
        "display": "Routine"
      }
    ]
  },
  "subject": {
    "reference": "Patient/pat-12345",
    "display": "John Smith"
  },
  "episodeOfCare": [
    {
      "reference": "EpisodeOfCare/eoc-cardio-2024"
    }
  ],
  "basedOn": [
    {
      "reference": "ServiceRequest/service-req-123"
    }
  ],
  "participant": [
    {
      "type": [
        {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
              "code": "PPRF",
              "display": "Primary Performer"
            }
          ]
        }
      ],
      "period": {
        "start": "2024-01-15T09:00:00Z",
        "end": "2024-01-15T09:45:00Z"
      },
      "individual": {
        "reference": "Practitioner/dr-smith-123",
        "display": "Dr. Smith"
      }
    }
  ],
  "appointment": [
    {
      "reference": "Appointment/apt-cardio-20240115-0900"
    }
  ],
  "period": {
    "start": "2024-01-15T09:00:00Z",
    "end": "2024-01-15T09:45:00Z"
  },
  "length": {
    "value": 45,
    "unit": "minutes",
    "system": "http://unitsofmeasure.org",
    "code": "min"
  },
  "reasonCode": [
    {
      "coding": [
        {
          "system": "http://snomed.info/sct",
          "code": "27822007",
          "display": "Cardiac evaluation"
        }
      ],
      "text": "Annual cardiac checkup"
    }
  ],
  "reasonReference": [
    {
      "reference": "Condition/condition-hypertension-456"
    }
  ],
  "diagnosis": [
    {
      "condition": {
        "reference": "Condition/condition-hypertension-456",
        "display": "Hypertension"
      },
      "use": {
        "coding": [
          {
            "system": "http://terminology.hl7.org/CodeSystem/diagnosis-role",
            "code": "chief-complaint",
            "display": "Chief Complaint"
          }
        ]
      },
      "rank": 1
    }
  ],
  "account": [
    {
      "reference": "Account/account-insurance-123"
    }
  ],
  "hospitalization": {
    "preAdmissionIdentifier": {
      "system": "http://hospital.example.com/pre-admit",
      "value": "PRE-ADM-123"
    },
    "origin": {
      "reference": "Location/clinic-outpatient"
    },
    "admitSource": {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/admit-source",
          "code": "hosp-trans",
          "display": "Transferred from another hospital"
        }
      ]
    },
    "destination": {
      "reference": "Location/clinic-outpatient"
    },
    "dischargeDisposition": {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/discharge-disposition",
          "code": "home",
          "display": "Discharged to home"
        }
      ]
    },
    "dischargeDiagnosis": [
      {
        "condition": {
          "reference": "Condition/condition-hypertension-456"
        },
        "use": {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/diagnosis-role",
              "code": "discharge",
              "display": "Discharge Diagnosis"
            }
          ]
        }
      }
    ]
  },
  "location": [
    {
      "location": {
        "reference": "Location/clinic-downtown",
        "display": "Downtown Cardiology Clinic"
      },
      "status": "completed",
      "period": {
        "start": "2024-01-15T09:00:00Z",
        "end": "2024-01-15T09:45:00Z"
      }
    }
  ],
  "serviceProvider": {
    "reference": "Organization/hospital-downtown",
    "display": "Downtown Hospital"
  },
  "partOf": {
    "reference": "Encounter/enc-cardio-admission-2024"
  },
  "meta": {
    "lastUpdated": "2024-01-15T09:45:00Z",
    "versionId": "1"
  }
}
```

### Resource Type 2: DocumentReference

**FHIR Resource:** `DocumentReference`
**Base URL Pattern:** `[base]/DocumentReference`

#### Key Search Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `patient` | reference | Patient the document is for | `patient=Patient/pat-123` |
| `type` | token | Document type (clinical note, discharge summary, etc.) | `type=http://loinc.org\|11506-3` |
| `category` | token | Document category (history, physical, assessment, plan, etc.) | `category=clinical-note` |
| `date` | date | Document date | `date=2024-01-15` |
| `created` | date | When document was created | `created=ge2024-01-01` |
| `status` | token | Status: current, superseded, entered-in-error | `status=current` |
| `encounter` | reference | Related encounter | `encounter=Encounter/enc-123` |
| `custodian` | reference | Organization managing document | `custodian=Organization/hospital-123` |
| `description` | string | Document description (free text search) | `description=discharge` |
| `_lastUpdated` | date | Last update time | `_lastUpdated=ge2024-01-01` |

#### REST Query Examples

```bash
# Get all documents for a patient
GET [base]/DocumentReference?patient=Patient/pat-123

# Get clinical notes for a patient
GET [base]/DocumentReference?patient=Patient/pat-123&category=clinical-note

# Get discharge summaries
GET [base]/DocumentReference?patient=Patient/pat-123&type=http://loinc.org|18842-5

# Get documents from specific date range
GET [base]/DocumentReference?patient=Patient/pat-123&date=ge2024-01-01&date=lt2024-02-01

# Get documents related to an encounter
GET [base]/DocumentReference?patient=Patient/pat-123&encounter=Encounter/enc-123

# Get current documents (not superseded)
GET [base]/DocumentReference?patient=Patient/pat-123&status=current
```

#### DocumentReference Resource Structure

```json
{
  "resourceType": "DocumentReference",
  "id": "docref-cardio-note-20240115",
  "identifier": [
    {
      "system": "http://hospital.example.com/documents",
      "value": "DOC-CARDIO-001234"
    }
  ],
  "status": "current",
  "docStatus": "final",
  "type": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "11506-3",
        "display": "Provider-unspecified Cardiology Consult note"
      }
    ],
    "text": "Cardiology Consultation Note"
  },
  "category": [
    {
      "coding": [
        {
          "system": "http://hl7.org/fhir/us/core/CodeSystem/us-core-document-reference-category",
          "code": "clinical-note",
          "display": "Clinical Note"
        }
      ]
    }
  ],
  "subject": {
    "reference": "Patient/pat-12345",
    "display": "John Smith"
  },
  "date": "2024-01-15T09:45:00Z",
  "author": [
    {
      "reference": "Practitioner/dr-smith-123",
      "display": "Dr. Smith"
    }
  ],
  "authenticator": {
    "reference": "Practitioner/dr-smith-123",
    "display": "Dr. Smith"
  },
  "custodian": {
    "reference": "Organization/hospital-downtown",
    "display": "Downtown Hospital"
  },
  "relatesTo": [
    {
      "code": "replaces",
      "target": {
        "reference": "DocumentReference/docref-cardio-note-draft"
      }
    }
  ],
  "description": "Cardiology consultation note for hypertension follow-up and annual cardiac evaluation",
  "securityLabel": [
    {
      "system": "http://terminology.hl7.org/CodeSystem/v3-Confidentiality",
      "code": "R",
      "display": "Restricted"
    }
  ],
  "content": [
    {
      "attachment": {
        "contentType": "text/plain",
        "language": "en-US",
        "data": "UGF0aWVudCBwcmVzZW50cyB3aXRoIGNoaWVmIGNvbXBsYWludCBvZiBjaGVzdCBwYWluLiBQdGlzIGluIDYwcyB3aXRoIGhpc3Rvcnkgb2YgaHlwZXJ0ZW5zaW9uLi4u",
        "url": "https://hospital.example.com/documents/docref-cardio-note-20240115",
        "size": 2048,
        "hash": "2jmj7l5rSw0yVb_vlWAYkK_YBwk",
        "title": "Cardiology Note"
      },
      "format": {
        "system": "urn:ietf:bcp:13",
        "code": "text/plain"
      }
    }
  ],
  "context": {
    "encounter": [
      {
        "reference": "Encounter/enc-cardio-20240115"
      }
    ],
    "period": {
      "start": "2024-01-15T09:00:00Z",
      "end": "2024-01-15T09:45:00Z"
    }
  },
  "meta": {
    "lastUpdated": "2024-01-15T09:45:00Z",
    "versionId": "1"
  }
}
```

### Resource Type 3: DiagnosticReport

**FHIR Resource:** `DiagnosticReport`
**Base URL Pattern:** `[base]/DiagnosticReport`

#### Key Search Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `patient` | reference | Patient the report is for | `patient=Patient/pat-123` |
| `code` | token | Report type code (radiology, pathology, etc.) | `code=http://loinc.org\|18748-4` |
| `category` | token | Category: imaging, laboratory, cardiology, etc. | `category=imaging` |
| `date` | date | Report date | `date=2024-01-15` |
| `issued` | date | When report was issued | `issued=ge2024-01-01` |
| `status` | token | Status: registered, partial, preliminary, final, amended, corrected, appended, cancelled, entered-in-error, unknown | `status=final` |
| `encounter` | reference | Related encounter | `encounter=Encounter/enc-123` |
| `result` | reference | Observation results | `result=Observation/obs-123` |
| `performer` | reference | Who created the report | `performer=Practitioner/dr-123` |
| `_lastUpdated` | date | Last update time | `_lastUpdated=ge2024-01-01` |

#### REST Query Examples

```bash
# Get diagnostic reports for a patient
GET [base]/DiagnosticReport?patient=Patient/pat-123

# Get radiology reports
GET [base]/DiagnosticReport?patient=Patient/pat-123&category=imaging

# Get pathology reports
GET [base]/DiagnosticReport?patient=Patient/pat-123&category=laboratory

# Get final reports from specific date
GET [base]/DiagnosticReport?patient=Patient/pat-123&date=2024-01-15&status=final

# Get reports with imaging results
GET [base]/DiagnosticReport?patient=Patient/pat-123&code=http://loinc.org|18748-4

# Get reports issued in date range
GET [base]/DiagnosticReport?patient=Patient/pat-123&issued=ge2024-01-01&issued=lt2024-02-01
```

#### DiagnosticReport Resource Structure

```json
{
  "resourceType": "DiagnosticReport",
  "id": "diag-report-cardio-echo-20240115",
  "identifier": [
    {
      "system": "http://hospital.example.com/diagnostic-report",
      "value": "DR-ECHO-001234"
    }
  ],
  "status": "final",
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/v2-0074",
          "code": "CAR",
          "display": "Cardiology"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://loinc.org",
        "code": "18748-4",
        "display": "Echocardiography report"
      }
    ],
    "text": "Transthoracic Echocardiogram"
  },
  "subject": {
    "reference": "Patient/pat-12345",
    "display": "John Smith"
  },
  "encounter": {
    "reference": "Encounter/enc-cardio-20240115"
  },
  "effectiveDateTime": "2024-01-15T10:30:00Z",
  "issued": "2024-01-15T14:45:00Z",
  "performer": [
    {
      "reference": "Organization/hospital-cardiology",
      "display": "Cardiology Department"
    }
  ],
  "resultsInterpreter": [
    {
      "reference": "Practitioner/dr-cardiologist-123",
      "display": "Dr. Cardiologist"
    }
  ],
  "specimen": [
    {
      "reference": "Specimen/spec-echo-20240115"
    }
  ],
  "result": [
    {
      "reference": "Observation/obs-ef-20240115",
      "display": "Ejection Fraction: 55%"
    },
    {
      "reference": "Observation/obs-lv-function-20240115",
      "display": "Left Ventricular Function: Normal"
    }
  ],
  "imagingStudy": [
    {
      "reference": "ImagingStudy/img-study-echo-20240115"
    }
  ],
  "media": [
    {
      "comment": "Four chamber view",
      "link": {
        "reference": "Media/media-echo-4chamber"
      }
    }
  ],
  "conclusion": "Transthoracic echocardiogram shows normal left ventricular size and global systolic function. Normal diastolic filling pattern. Normal right ventricular size and function. Mild left atrial enlargement. No pericardial effusion. Ejection fraction is approximately 55%.",
  "conclusionCode": [
    {
      "coding": [
        {
          "system": "http://snomed.info/sct",
          "code": "314006005",
          "display": "Normal - Ejection fraction"
        }
      ]
    }
  ],
  "presentedForm": [
    {
      "contentType": "application/pdf",
      "language": "en-US",
      "data": "JVBERi0xLjQK...",
      "url": "https://hospital.example.com/reports/diag-report-cardio-echo-20240115.pdf",
      "size": 15234,
      "hash": "d8e8fca2dc0f896fd7cb4cb0031ba249",
      "title": "Echocardiogram Report"
    }
  ],
  "meta": {
    "lastUpdated": "2024-01-15T14:45:00Z",
    "versionId": "1"
  }
}
```

### Resource Type 4: Condition

**FHIR Resource:** `Condition`
**Base URL Pattern:** `[base]/Condition`

#### Key Search Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `patient` | reference | Patient the condition is for | `patient=Patient/pat-123` |
| `code` | token | Diagnosis code (SNOMED, ICD-10, etc.) | `code=http://snomed.info/sct\|38341003` |
| `clinical-status` | token | Status: active, recurrence, remission, resolved | `clinical-status=active` |
| `verification-status` | token | Verification: unconfirmed, provisional, differential, confirmed, refuted, entered-in-error | `verification-status=confirmed` |
| `category` | token | Category: problem-list-item, encounter-diagnosis, etc. | `category=problem-list-item` |
| `onset-date` | date | When condition started | `onset-date=ge2024-01-01` |
| `abatement-date` | date | When condition resolved | `abatement-date=lt2024-01-01` |
| `encounter` | reference | Related encounter | `encounter=Encounter/enc-123` |
| `severity` | token | Severity: mild, moderate, severe | `severity=severe` |
| `_lastUpdated` | date | Last update time | `_lastUpdated=ge2024-01-01` |

#### REST Query Examples

```bash
# Get all active conditions for a patient
GET [base]/Condition?patient=Patient/pat-123&clinical-status=active

# Get specific diagnosis
GET [base]/Condition?patient=Patient/pat-123&code=http://snomed.info/sct|38341003

# Get problem list
GET [base]/Condition?patient=Patient/pat-123&category=problem-list-item&clinical-status=active

# Get conditions diagnosed in date range
GET [base]/Condition?patient=Patient/pat-123&onset-date=ge2020-01-01

# Get severe conditions
GET [base]/Condition?patient=Patient/pat-123&severity=severe&clinical-status=active
```

#### Condition Resource Structure

```json
{
  "resourceType": "Condition",
  "id": "condition-hypertension-456",
  "identifier": [
    {
      "system": "http://hospital.example.com/condition",
      "value": "COND-HTN-001234"
    }
  ],
  "clinicalStatus": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
        "code": "active",
        "display": "Active"
      }
    ]
  },
  "verificationStatus": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
        "code": "confirmed",
        "display": "Confirmed"
      }
    ]
  },
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/condition-category",
          "code": "problem-list-item",
          "display": "Problem List Item"
        }
      ]
    }
  ],
  "severity": {
    "coding": [
      {
        "system": "http://snomed.info/sct",
        "code": "255604002",
        "display": "Mild"
      }
    ]
  },
  "code": {
    "coding": [
      {
        "system": "http://snomed.info/sct",
        "code": "38341003",
        "display": "Hypertension"
      },
      {
        "system": "http://hl7.org/fhir/sid/icd-10-cm",
        "code": "I10",
        "display": "Essential (primary) hypertension"
      }
    ],
    "text": "Essential Hypertension"
  },
  "subject": {
    "reference": "Patient/pat-12345",
    "display": "John Smith"
  },
  "encounter": {
    "reference": "Encounter/enc-cardio-20240115"
  },
  "onsetDateTime": "2015-06-20T00:00:00Z",
  "abatementString": "no known abatement",
  "recordedDate": "2015-06-20T14:30:00Z",
  "recorder": {
    "reference": "Practitioner/dr-smith-123",
    "display": "Dr. Smith"
  },
  "asserter": {
    "reference": "Practitioner/dr-smith-123",
    "display": "Dr. Smith"
  },
  "stage": [
    {
      "summary": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "code": "255609007",
            "display": "Stage II"
          }
        ]
      },
      "assessment": [
        {
          "reference": "ClinicalImpression/clinical-impression-123"
        }
      ]
    }
  ],
  "evidence": [
    {
      "code": [
        {
          "coding": [
            {
              "system": "http://snomed.info/sct",
              "code": "87739005",
              "display": "Blood pressure reading"
            }
          ]
        }
      ],
      "detail": [
        {
          "reference": "Observation/obs-bp-elevated"
        }
      ]
    }
  ],
  "note": [
    {
      "text": "Patient reports compliance with medications. Regular monitoring needed."
    }
  ],
  "meta": {
    "lastUpdated": "2024-01-15T14:30:00Z",
    "versionId": "2"
  }
}
```

### Common Clinical Document LOINC Codes

| Document Type | LOINC Code | Description |
|---------------|-----------|-------------|
| Clinical Note | 11506-3 | Provider-unspecified Clinic note |
| Office Visit Note | 11488-4 | Consultation note |
| Progress Note | 11491-8 | Hospital admission history & physical |
| Discharge Summary | 18842-5 | Discharge Summary |
| History & Physical | 34117-2 | History and Physical Note |
| Operative Report | 11504-1 | Surgical operation note |
| Imaging Report | 18748-4 | Diagnostic imaging report |
| Pathology Report | 11526-1 | Pathology report |
| Lab Report | 11502-5 | Laboratory report |

### Common Condition Codes (SNOMED CT)

| Condition | SNOMED Code | ICD-10 Code |
|-----------|------------|------------|
| Hypertension | 38341003 | I10 |
| Type 2 Diabetes | 44054006 | E11 |
| Coronary Artery Disease | 53741008 | I25.10 |
| Asthma | 195967001 | J45 |
| COPD | 13645005 | J44 |
| Heart Failure | 84114007 | I50 |
| Acute Myocardial Infarction | 57054005 | I21 |
| Atrial Fibrillation | 49436004 | I48 |
| Stroke/CVA | 230690007 | I63 |
| Pneumonia | 233604007 | J18 |

### Common Use Cases for EHR CLI

1. **Encounter summary:** Get visit details with diagnoses and practitioners
2. **Document retrieval:** Search for and retrieve clinical notes
3. **Diagnosis lookup:** Get patient's active problem list
4. **Report access:** Retrieve diagnostic reports (imaging, pathology, etc.)
5. **Clinical narrative:** Get textual documentation from encounters
6. **Document audit:** Track document creation/modification dates
7. **Condition status:** Check if condition is active, resolved, or under investigation

---

## 6. Common Patterns & Best Practices

### 6.1 Search Pagination

FHIR searches return Bundle resources with pagination:

```bash
# Get first page with 20 results
GET [base]/Patient?name=Smith&_count=20

# Get total count of matching resources
GET [base]/Patient?name=Smith&_summary=count

# Include related resources (references)
GET [base]/Patient/pat-123?_include=Patient:general-practitioner

# Include reverse references (where this is referenced from)
GET [base]/Patient/pat-123?_revinclude=Appointment:patient
```

### 6.2 Sorting Results

```bash
# Sort by date ascending (default)
GET [base]/Observation?patient=Patient/pat-123&_sort=date

# Sort by date descending (most recent first)
GET [base]/Observation?patient=Patient/pat-123&_sort=-date

# Sort by multiple fields
GET [base]/Observation?patient=Patient/pat-123&_sort=-date,code
```

### 6.3 Date/Time Comparisons

FHIR supports comparison operators in date searches:

```bash
# Equal
GET [base]/Patient?birthdate=1980-01-15

# Greater than or equal (ge)
GET [base]/Patient?birthdate=ge1980-01-01

# Less than (lt)
GET [base]/Patient?birthdate=lt1990-01-01

# Less than or equal (le)
GET [base]/Patient?birthdate=le2000-12-31

# Greater than (gt)
GET [base]/Patient?birthdate=gt1970-01-01

# Not equal (ne)
GET [base]/Patient?birthdate=ne1985-06-15

# Approximately equal (~)
GET [base]/Patient?birthdate=~1980
```

### 6.4 Search Result Filtering

```bash
# Only return specific fields (summary)
GET [base]/Patient?name=Smith&_elements=name,birthDate,gender

# Return all except specific fields
GET [base]/Patient?name=Smith&_elements=-telecom,-address

# Only summaries (minimal data)
GET [base]/Patient?name=Smith&_summary=true

# Text search (full-text search if supported)
GET [base]/Condition?text=hypertension
```

### 6.5 Reference Resolution

Include related resources in response:

```bash
# Include referenced resources
GET [base]/Appointment?patient=Patient/pat-123&_include=Appointment:practitioner&_include=Appointment:location

# Include reverse references (resources that reference this)
GET [base]/Patient/pat-123?_revinclude=Appointment:patient&_revinclude=Condition:subject

# Recursive includes (includes of includes)
GET [base]/Appointment?patient=Patient/pat-123&_include=Appointment:practitioner&_include:iterate=Practitioner:organization
```

### 6.6 Common Query Patterns for EHR CLI

#### Get Patient with All Data

```bash
# Get patient demographics
GET [base]/Patient/pat-123

# Get all appointments
GET [base]/Appointment?patient=Patient/pat-123&status=booked&_sort=-date

# Get active medications
GET [base]/MedicationRequest?patient=Patient/pat-123&status=active

# Get active conditions
GET [base]/Condition?patient=Patient/pat-123&clinical-status=active

# Get recent lab results
GET [base]/Observation?patient=Patient/pat-123&category=laboratory&_sort=-date&_count=10

# Get recent encounters
GET [base]/Encounter?patient=Patient/pat-123&_sort=-date&_count=5

# Get recent notes
GET [base]/DocumentReference?patient=Patient/pat-123&_sort=-date&_count=5
```

#### Clinical Summary for Patient

```bash
# Single query with includes (if server supports)
GET [base]/Encounter?patient=Patient/pat-123&status=finished&_sort=-date&_include=Encounter:practitioner&_include=Encounter:location

# With diagnosis references
GET [base]/Encounter?patient=Patient/pat-123&status=finished&_sort=-date&_revinclude=Condition:encounter
```

### 6.7 Terminology Binding

Most FHIR elements are bound to CodeSystems and ValueSets:

```json
{
  "code": {
    "coding": [
      {
        "system": "http://snomed.info/sct",
        "code": "38341003",
        "display": "Hypertension"
      },
      {
        "system": "http://hl7.org/fhir/sid/icd-10-cm",
        "code": "I10"
      }
    ],
    "text": "High Blood Pressure"
  }
}
```

**Key CodeSystems:**
- `http://snomed.info/sct` - SNOMED Clinical Terms
- `http://hl7.org/fhir/sid/icd-10-cm` - ICD-10 Diagnoses
- `http://loinc.org` - LOINC Lab Codes
- `http://www.nlm.nih.gov/research/umls/rxnorm` - RxNorm Drug Codes
- `http://unitsofmeasure.org` - UCUM Units
- `urn:ietf:bcp:47` - Language Tags

---

## 7. Authentication & Error Handling

### 7.1 Authentication Methods

Most FHIR servers use:

#### OAuth 2.0 (Most Common)
```bash
# Get access token
curl -X POST https://auth.example.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&grant_type=client_credentials"

# Use token in request
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  https://fhir.example.com/Patient/pat-123
```

#### Basic Authentication
```bash
curl -u username:password \
  https://fhir.example.com/Patient/pat-123
```

#### API Key
```bash
curl -H "X-API-Key: YOUR_API_KEY" \
  https://fhir.example.com/Patient/pat-123
```

### 7.2 Common HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Successful GET/PUT |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid search parameters |
| 401 | Unauthorized | Missing/invalid credentials |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Version mismatch in PUT |
| 422 | Unprocessable Entity | Invalid FHIR data |
| 500 | Internal Server Error | Server error |

### 7.3 FHIR OperationOutcome for Errors

When an error occurs, FHIR servers return OperationOutcome:

```json
{
  "resourceType": "OperationOutcome",
  "issue": [
    {
      "severity": "error",
      "code": "invalid",
      "details": {
        "text": "Patient identifier is required for MedicationRequest"
      },
      "location": ["MedicationRequest.subject"],
      "expression": ["MedicationRequest.subject"]
    },
    {
      "severity": "warning",
      "code": "incomplete",
      "details": {
        "text": "Not all requested includes were resolved"
      }
    }
  ]
}
```

### 7.4 Best Practices for Error Handling

```bash
# Check response status code
if [ $? -ne 0 ]; then
  echo "Request failed"
  # Parse OperationOutcome from response
fi

# Always include proper Content-Type
curl -H "Content-Type: application/fhir+json" \
  -H "Accept: application/fhir+json" \
  https://fhir.example.com/Patient
```

### 7.5 Rate Limiting & Performance

```bash
# Check rate limit headers
curl -I https://fhir.example.com/Patient

# Response headers may include:
# X-RateLimit-Limit: 1000
# X-RateLimit-Remaining: 999
# X-RateLimit-Reset: 1705343400

# Use pagination for large result sets
GET [base]/Patient?_count=100&offset=0
```

---

## Appendices

### Appendix A: Common FHIR Resource Types

| Resource | Use Case |
|----------|----------|
| Patient | Demographics, identifiers |
| Practitioner | Doctor/clinician information |
| Organization | Hospital, clinic, pharmacy |
| Location | Physical location (clinic, OR, etc.) |
| Schedule | Practitioner availability |
| Slot | Individual time slot |
| Appointment | Booked appointment |
| Encounter | Visit/admission |
| MedicationRequest | Prescription |
| MedicationStatement | Current medication |
| Medication | Drug information |
| Observation | Lab result, vital sign, measurement |
| DiagnosticReport | Report of diagnostic procedure |
| DocumentReference | Reference to clinical document |
| Condition | Problem/diagnosis |
| ServiceRequest | Order for service/test |
| Procedure | Performed procedure |
| AllergyIntolerance | Patient allergies |
| Immunization | Vaccination record |

### Appendix B: Search Parameter Quick Reference

**Modifier Syntax:**
- `:exact` - Exact match
- `:contains` - Contains substring
- `:missing=true/false` - Has/missing value
- `:above` - Parent/ancestor code
- `:below` - Child/descendant code
- `:in` - Value in ValueSet
- `:type=` - Resource type for reference

**Example:**
```bash
GET [base]/Condition?code:in=http://example.com/valueset/my-conditions
```

### Appendix C: FHIR Resource Capabilities

Check server capabilities:
```bash
GET [base]/metadata
```

Returns CapabilityStatement describing:
- Supported resources
- Search parameters
- Operations
- Security settings

---

## References & Additional Resources

- **Official FHIR R4 Specification**: http://hl7.org/fhir/R4/
- **FHIR Search**: http://hl7.org/fhir/R4/search.html
- **REST Operations**: http://hl7.org/fhir/R4/http.html
- **HL7 FHIR Community**: https://www.hl7.org/fhir/
- **LOINC Codes**: https://loinc.org/
- **SNOMED CT**: https://www.snomed.org/
- **RxNorm**: https://www.nlm.nih.gov/research/umls/rxnorm/
- **US Core Implementation Guide**: http://hl7.org/fhir/us/core/
- **SMART on FHIR**: http://docs.smarthealthit.org/

---

**Document Version:** 1.0
**Last Updated:** January 12, 2026
**Status:** Ready for Implementation
