// Re-export types from client for convenience
export type {
  FHIRConfig,
  FHIRPatient,
  FHIRAppointment,
  FHIRMedicationRequest,
  FHIRObservation,
  FHIRDocumentReference,
  FHIREncounter,
  FHIRBundle,
} from './client.js';

// Common LOINC codes for lab tests
export const LOINC_CODES = {
  // Renal
  CREATININE: '2160-0',
  BUN: '3094-0',
  GFR: '33914-3',

  // Metabolic
  GLUCOSE: '2345-7',
  HBA1C: '4548-4',
  SODIUM: '2951-2',
  POTASSIUM: '2823-3',
  CHLORIDE: '2075-0',
  CO2: '2028-9',
  CALCIUM: '17861-6',

  // Liver
  AST: '1920-8',
  ALT: '1742-6',
  ALP: '6768-6',
  BILIRUBIN_TOTAL: '1975-2',
  ALBUMIN: '1751-7',

  // Hematology
  WBC: '6690-2',
  RBC: '789-8',
  HEMOGLOBIN: '718-7',
  HEMATOCRIT: '4544-3',
  PLATELETS: '777-3',

  // Lipids
  CHOLESTEROL_TOTAL: '2093-3',
  HDL: '2085-9',
  LDL: '2089-1',
  TRIGLYCERIDES: '2571-8',

  // Cardiac
  TROPONIN: '6598-7',
  BNP: '30934-4',

  // Thyroid
  TSH: '3016-3',
  T4_FREE: '3024-7',
} as const;

// Common medication codes (RxNorm)
export const RXNORM_CODES = {
  ALBUTEROL: '435',
  METFORMIN: '6809',
  LISINOPRIL: '29046',
  ATORVASTATIN: '83367',
  AMLODIPINE: '17767',
  OMEPRAZOLE: '7646',
  METOPROLOL: '6918',
  LEVOTHYROXINE: '10582',
  GABAPENTIN: '25480',
  SERTRALINE: '36437',
} as const;

// Document type codes
export const DOC_TYPE_CODES = {
  PROGRESS_NOTE: '11506-3',
  DISCHARGE_SUMMARY: '18842-5',
  HISTORY_PHYSICAL: '34117-2',
  CONSULTATION: '11488-4',
  PROCEDURE_NOTE: '28570-0',
  IMAGING_REPORT: '18748-4',
  LAB_REPORT: '11502-2',
} as const;
