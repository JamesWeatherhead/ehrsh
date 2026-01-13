// src/fhir/client.ts
import FhirKitClient from 'fhir-kit-client';
const Client = FhirKitClient as any;

/**
 * Configuration for the FHIR client
 */
export interface FHIRConfig {
  baseUrl: string;
  /** Optional authorization token */
  bearerToken?: string;
  /** Custom headers to include with requests */
  customHeaders?: Record<string, string>;
}

/**
 * FHIR Patient resource type
 */
export interface FHIRPatient {
  resourceType: 'Patient';
  id?: string;
  identifier?: Array<{
    system?: string;
    value?: string;
  }>;
  name?: Array<{
    use?: string;
    family?: string;
    given?: string[];
    text?: string;
  }>;
  birthDate?: string;
  gender?: string;
  address?: Array<{
    use?: string;
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
  }>;
  telecom?: Array<{
    system?: string;
    value?: string;
    use?: string;
  }>;
}

/**
 * FHIR Appointment resource type
 */
export interface FHIRAppointment {
  resourceType: 'Appointment';
  id?: string;
  status?: 'proposed' | 'pending' | 'booked' | 'arrived' | 'fulfilled' | 'cancelled' | 'noshow' | 'entered-in-error' | 'checked-in' | 'waitlist';
  start?: string;
  end?: string;
  description?: string;
  participant?: Array<{
    actor?: {
      reference?: string;
      display?: string;
    };
    status?: string;
  }>;
  reasonCode?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  }>;
}

/**
 * FHIR MedicationRequest resource type
 */
export interface FHIRMedicationRequest {
  resourceType: 'MedicationRequest';
  id?: string;
  status?: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'entered-in-error' | 'stopped' | 'draft' | 'unknown';
  intent?: string;
  medicationCodeableConcept?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };
  medicationReference?: {
    reference?: string;
    display?: string;
  };
  subject?: {
    reference?: string;
    display?: string;
  };
  dosageInstruction?: Array<{
    text?: string;
    timing?: {
      repeat?: {
        frequency?: number;
        period?: number;
        periodUnit?: string;
      };
    };
    doseAndRate?: Array<{
      doseQuantity?: {
        value?: number;
        unit?: string;
      };
    }>;
  }>;
  authoredOn?: string;
}

/**
 * FHIR Observation resource type (for lab results)
 */
export interface FHIRObservation {
  resourceType: 'Observation';
  id?: string;
  status?: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';
  category?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  }>;
  code?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };
  subject?: {
    reference?: string;
    display?: string;
  };
  effectiveDateTime?: string;
  valueQuantity?: {
    value?: number;
    unit?: string;
    system?: string;
    code?: string;
  };
  valueString?: string;
  referenceRange?: Array<{
    low?: {
      value?: number;
      unit?: string;
    };
    high?: {
      value?: number;
      unit?: string;
    };
    text?: string;
  }>;
  interpretation?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  }>;
}

/**
 * FHIR DocumentReference resource type (for clinical notes)
 */
export interface FHIRDocumentReference {
  resourceType: 'DocumentReference';
  id?: string;
  status?: 'current' | 'superseded' | 'entered-in-error';
  type?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };
  subject?: {
    reference?: string;
    display?: string;
  };
  date?: string;
  author?: Array<{
    reference?: string;
    display?: string;
  }>;
  content?: Array<{
    attachment?: {
      contentType?: string;
      data?: string;
      url?: string;
      title?: string;
    };
  }>;
  context?: {
    encounter?: Array<{
      reference?: string;
    }>;
  };
}

/**
 * FHIR Encounter resource type
 */
export interface FHIREncounter {
  resourceType: 'Encounter';
  id?: string;
  status?: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled' | 'entered-in-error' | 'unknown';
  class?: {
    system?: string;
    code?: string;
    display?: string;
  };
  type?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  }>;
  subject?: {
    reference?: string;
    display?: string;
  };
  participant?: Array<{
    individual?: {
      reference?: string;
      display?: string;
    };
  }>;
  period?: {
    start?: string;
    end?: string;
  };
  reasonCode?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  }>;
}

/**
 * FHIR Bundle resource type
 */
export interface FHIRBundle<T = unknown> {
  resourceType: 'Bundle';
  type?: string;
  total?: number;
  link?: Array<{
    relation?: string;
    url?: string;
  }>;
  entry?: Array<{
    fullUrl?: string;
    resource?: T;
  }>;
}

/**
 * Error class for FHIR operations
 */
export class FHIRError extends Error {
  public statusCode?: number;
  public operationOutcome?: unknown;

  constructor(message: string, statusCode?: number, operationOutcome?: unknown) {
    super(message);
    this.name = 'FHIRError';
    this.statusCode = statusCode;
    this.operationOutcome = operationOutcome;
  }
}

/**
 * EHRClient provides high-level methods for EHR operations using FHIR R4
 *
 * This class wraps fhir-kit-client and provides convenient methods
 * for common EHR operations like patient search, appointments, medications, etc.
 */
export class EHRClient {
  private client: any;
  private baseUrl: string;

  constructor(config: FHIRConfig) {
    this.baseUrl = config.baseUrl;

    const clientConfig: any = {
      baseUrl: config.baseUrl,
    };

    if (config.bearerToken) {
      clientConfig.bearerToken = config.bearerToken;
    }

    if (config.customHeaders) {
      clientConfig.customHeaders = config.customHeaders;
    }

    this.client = new Client(clientConfig);
  }

  /**
   * Extract resources from a FHIR Bundle response
   */
  private extractResources<T>(bundle: FHIRBundle<T>): T[] {
    if (!bundle.entry) {
      return [];
    }
    return bundle.entry
      .map((entry) => entry.resource)
      .filter((resource): resource is T => resource !== undefined);
  }

  /**
   * Handle FHIR operation errors
   */
  private handleError(error: unknown, operation: string): never {
    if (error instanceof Error) {
      const fhirError = error as Error & { response?: { status?: number; data?: unknown } };
      throw new FHIRError(
        `FHIR ${operation} failed: ${error.message}`,
        fhirError.response?.status,
        fhirError.response?.data
      );
    }
    throw new FHIRError(`FHIR ${operation} failed: Unknown error`);
  }

  /**
   * Get today's date in FHIR date format (YYYY-MM-DD)
   */
  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  // ============================================
  // Patient Operations
  // ============================================

  /**
   * Search for patients by name, birthdate, or identifier
   *
   * @param params - Search parameters
   * @returns Array of matching Patient resources
   */
  async searchPatients(params: {
    name?: string;
    birthdate?: string;
    identifier?: string;
  }): Promise<FHIRPatient[]> {
    try {
      const searchParams: Record<string, string> = {};

      if (params.name) {
        searchParams.name = params.name;
      }
      if (params.birthdate) {
        searchParams.birthdate = params.birthdate;
      }
      if (params.identifier) {
        searchParams.identifier = params.identifier;
      }

      const response = await this.client.search({
        resourceType: 'Patient',
        searchParams,
      });

      return this.extractResources<FHIRPatient>(response as FHIRBundle<FHIRPatient>);
    } catch (error) {
      this.handleError(error, 'searchPatients');
    }
  }

  /**
   * Get a single patient by ID
   *
   * @param id - The patient's FHIR resource ID
   * @returns The Patient resource
   */
  async getPatient(id: string): Promise<FHIRPatient> {
    try {
      const response = await this.client.read({
        resourceType: 'Patient',
        id,
      });

      return response as FHIRPatient;
    } catch (error) {
      this.handleError(error, 'getPatient');
    }
  }

  // ============================================
  // Appointment/Schedule Operations
  // ============================================

  /**
   * Get today's appointments, optionally filtered by practitioner
   *
   * @param practitionerId - Optional practitioner ID to filter by
   * @returns Array of Appointment resources for today
   */
  async getTodaysAppointments(practitionerId?: string): Promise<FHIRAppointment[]> {
    try {
      const today = this.getTodayDate();
      const searchParams: Record<string, string> = {
        date: today,
      };

      if (practitionerId) {
        searchParams.actor = `Practitioner/${practitionerId}`;
      }

      const response = await this.client.search({
        resourceType: 'Appointment',
        searchParams,
      });

      return this.extractResources<FHIRAppointment>(response as FHIRBundle<FHIRAppointment>);
    } catch (error) {
      this.handleError(error, 'getTodaysAppointments');
    }
  }

  /**
   * Get all appointments for a specific patient
   *
   * @param patientId - The patient's FHIR resource ID
   * @returns Array of Appointment resources
   */
  async getPatientAppointments(patientId: string): Promise<FHIRAppointment[]> {
    try {
      const response = await this.client.search({
        resourceType: 'Appointment',
        searchParams: {
          actor: `Patient/${patientId}`,
          _sort: '-date',
        },
      });

      return this.extractResources<FHIRAppointment>(response as FHIRBundle<FHIRAppointment>);
    } catch (error) {
      this.handleError(error, 'getPatientAppointments');
    }
  }

  /**
   * Reschedule an appointment to a new time slot
   *
   * @param appointmentId - The appointment's FHIR resource ID
   * @param newSlot - The new start time in ISO 8601 format
   * @returns The updated Appointment resource
   */
  async rescheduleAppointment(
    appointmentId: string,
    newSlot: string
  ): Promise<FHIRAppointment> {
    try {
      // First, read the current appointment
      const currentAppointment = await this.client.read({
        resourceType: 'Appointment',
        id: appointmentId,
      }) as FHIRAppointment;

      // Calculate new end time based on original duration
      let newEnd: string | undefined;
      if (currentAppointment.start && currentAppointment.end) {
        const originalDuration =
          new Date(currentAppointment.end).getTime() -
          new Date(currentAppointment.start).getTime();
        newEnd = new Date(new Date(newSlot).getTime() + originalDuration).toISOString();
      }

      // Update the appointment
      const updatedAppointment: FHIRAppointment = {
        ...currentAppointment,
        start: newSlot,
        end: newEnd,
        status: 'booked',
      };

      const response = await this.client.update({
        resourceType: 'Appointment',
        id: appointmentId,
        body: updatedAppointment,
      });

      return response as FHIRAppointment;
    } catch (error) {
      this.handleError(error, 'rescheduleAppointment');
    }
  }

  // ============================================
  // Medication Operations
  // ============================================

  /**
   * Get all medications for a patient from both MedicationRequest and MedicationStatement
   *
   * @param patientId - The patient's FHIR resource ID
   * @param includeAllStatuses - If true, return all medications regardless of status (default: true)
   * @returns Array of MedicationRequest resources
   */
  async getPatientMedications(patientId: string, includeAllStatuses = true): Promise<FHIRMedicationRequest[]> {
    try {
      const searchParams: Record<string, string> = {
        patient: patientId,
        _sort: '-authoredon',
        _count: '100',
      };

      if (!includeAllStatuses) {
        searchParams.status = 'active';
      }

      // Search MedicationRequest first
      const requestResponse = await this.client.search({
        resourceType: 'MedicationRequest',
        searchParams,
      });

      const medications = this.extractResources<FHIRMedicationRequest>(
        requestResponse as FHIRBundle<FHIRMedicationRequest>
      );

      // Also search MedicationStatement as fallback (some servers use this instead)
      try {
        const statementParams: Record<string, string> = {
          patient: patientId,
          _sort: '-effective',
          _count: '100',
        };
        if (!includeAllStatuses) {
          statementParams.status = 'active';
        }

        const statementResponse = await this.client.search({
          resourceType: 'MedicationStatement',
          searchParams: statementParams,
        });

        // Convert MedicationStatement to MedicationRequest-like format
        const statements = this.extractResources<any>(statementResponse as FHIRBundle<any>);
        for (const stmt of statements) {
          medications.push({
            resourceType: 'MedicationRequest',
            id: stmt.id,
            status: stmt.status === 'active' ? 'active' : stmt.status,
            intent: 'order',
            medicationCodeableConcept: stmt.medicationCodeableConcept,
            medicationReference: stmt.medicationReference,
            subject: stmt.subject,
            dosageInstruction: stmt.dosage,
            authoredOn: stmt.effectiveDateTime || stmt.effectivePeriod?.start,
          });
        }
      } catch {
        // MedicationStatement may not be supported - that's OK
      }

      return medications;
    } catch (error) {
      this.handleError(error, 'getPatientMedications');
    }
  }

  /**
   * Add a new medication order for a patient
   *
   * @param patientId - The patient's FHIR resource ID
   * @param medicationName - The name of the medication
   * @param dose - Optional dosage instruction text
   * @returns The created MedicationRequest resource
   */
  async addMedication(
    patientId: string,
    medicationName: string,
    dose?: string
  ): Promise<FHIRMedicationRequest> {
    try {
      const medicationRequest: FHIRMedicationRequest = {
        resourceType: 'MedicationRequest',
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          text: medicationName,
        },
        subject: {
          reference: `Patient/${patientId}`,
        },
        authoredOn: new Date().toISOString(),
      };

      if (dose) {
        medicationRequest.dosageInstruction = [
          {
            text: dose,
          },
        ];
      }

      const response = await this.client.create({
        resourceType: 'MedicationRequest',
        body: medicationRequest,
      });

      return response as FHIRMedicationRequest;
    } catch (error) {
      this.handleError(error, 'addMedication');
    }
  }

  // ============================================
  // Lab Operations
  // ============================================

  /**
   * Get laboratory results for a patient
   *
   * @param patientId - The patient's FHIR resource ID
   * @param loincCode - Optional LOINC code to filter by specific lab type
   * @returns Array of Observation resources
   */
  async getPatientLabs(
    patientId: string,
    loincCode?: string
  ): Promise<FHIRObservation[]> {
    try {
      const searchParams: Record<string, string> = {
        patient: patientId,
        category: 'laboratory',
        _sort: '-date',
      };

      if (loincCode) {
        searchParams.code = `http://loinc.org|${loincCode}`;
      }

      const response = await this.client.search({
        resourceType: 'Observation',
        searchParams,
      });

      return this.extractResources<FHIRObservation>(
        response as FHIRBundle<FHIRObservation>
      );
    } catch (error) {
      this.handleError(error, 'getPatientLabs');
    }
  }

  /**
   * Get a trend of lab values over time for a specific test
   *
   * @param patientId - The patient's FHIR resource ID
   * @param loincCode - The LOINC code for the lab test
   * @param startDate - Optional start date for the trend (ISO 8601 format)
   * @returns Array of Observation resources sorted by date (oldest first)
   */
  async getLabTrend(
    patientId: string,
    loincCode: string,
    startDate?: string
  ): Promise<FHIRObservation[]> {
    try {
      const searchParams: Record<string, string> = {
        patient: patientId,
        category: 'laboratory',
        code: `http://loinc.org|${loincCode}`,
        _sort: 'date',
      };

      if (startDate) {
        searchParams.date = `ge${startDate}`;
      }

      const response = await this.client.search({
        resourceType: 'Observation',
        searchParams,
      });

      return this.extractResources<FHIRObservation>(
        response as FHIRBundle<FHIRObservation>
      );
    } catch (error) {
      this.handleError(error, 'getLabTrend');
    }
  }

  // ============================================
  // Clinical Notes Operations
  // ============================================

  /**
   * Get clinical notes/documents for a patient
   *
   * @param patientId - The patient's FHIR resource ID
   * @returns Array of DocumentReference resources
   */
  async getPatientNotes(patientId: string): Promise<FHIRDocumentReference[]> {
    try {
      const response = await this.client.search({
        resourceType: 'DocumentReference',
        searchParams: {
          patient: patientId,
          status: 'current',
          _sort: '-date',
        },
      });

      return this.extractResources<FHIRDocumentReference>(
        response as FHIRBundle<FHIRDocumentReference>
      );
    } catch (error) {
      this.handleError(error, 'getPatientNotes');
    }
  }

  /**
   * Create a new clinical note for a patient
   *
   * @param patientId - The patient's FHIR resource ID
   * @param content - The note content (plain text)
   * @param type - Optional note type (defaults to 'Progress note')
   * @returns The created DocumentReference resource
   */
  async createNote(
    patientId: string,
    content: string,
    type?: string
  ): Promise<FHIRDocumentReference> {
    try {
      // Encode content as base64 for attachment
      const base64Content = Buffer.from(content).toString('base64');
      const noteType = type || 'Progress note';

      const documentReference: FHIRDocumentReference = {
        resourceType: 'DocumentReference',
        status: 'current',
        type: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '11506-3',
              display: noteType,
            },
          ],
          text: noteType,
        },
        subject: {
          reference: `Patient/${patientId}`,
        },
        date: new Date().toISOString(),
        content: [
          {
            attachment: {
              contentType: 'text/plain',
              data: base64Content,
              title: noteType,
            },
          },
        ],
      };

      const response = await this.client.create({
        resourceType: 'DocumentReference',
        body: documentReference,
      });

      return response as FHIRDocumentReference;
    } catch (error) {
      this.handleError(error, 'createNote');
    }
  }

  // ============================================
  // Encounter Operations
  // ============================================

  /**
   * Get all encounters for a patient
   *
   * @param patientId - The patient's FHIR resource ID
   * @returns Array of Encounter resources
   */
  async getPatientEncounters(patientId: string): Promise<FHIREncounter[]> {
    try {
      const response = await this.client.search({
        resourceType: 'Encounter',
        searchParams: {
          patient: patientId,
          _sort: '-date',
        },
      });

      return this.extractResources<FHIREncounter>(
        response as FHIRBundle<FHIREncounter>
      );
    } catch (error) {
      this.handleError(error, 'getPatientEncounters');
    }
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get the base URL of the FHIR server
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Test the connection to the FHIR server
   *
   * @returns true if connection is successful, false otherwise
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.capabilityStatement();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the CapabilityStatement from the FHIR server
   *
   * @returns The CapabilityStatement resource
   */
  async getCapabilityStatement(): Promise<unknown> {
    try {
      const response = await this.client.capabilityStatement();
      return response;
    } catch (error) {
      this.handleError(error, 'getCapabilityStatement');
    }
  }

  /**
   * Perform a raw FHIR search
   *
   * @param resourceType - The FHIR resource type
   * @param searchParams - Search parameters
   * @returns The raw Bundle response
   */
  async rawSearch(
    resourceType: string,
    searchParams: Record<string, string>
  ): Promise<FHIRBundle<unknown>> {
    try {
      const response = await this.client.search({
        resourceType,
        searchParams,
      });

      return response as FHIRBundle<unknown>;
    } catch (error) {
      this.handleError(error, `rawSearch(${resourceType})`);
    }
  }

  /**
   * Perform a raw FHIR read
   *
   * @param resourceType - The FHIR resource type
   * @param id - The resource ID
   * @returns The raw resource
   */
  async rawRead(resourceType: string, id: string): Promise<unknown> {
    try {
      const response = await this.client.read({
        resourceType,
        id,
      });

      return response;
    } catch (error) {
      this.handleError(error, `rawRead(${resourceType}/${id})`);
    }
  }

  /**
   * Perform a raw FHIR create
   *
   * @param resourceType - The FHIR resource type
   * @param body - The resource to create
   * @returns The created resource
   */
  async rawCreate(resourceType: string, body: unknown): Promise<unknown> {
    try {
      const response = await this.client.create({
        resourceType,
        body,
      });

      return response;
    } catch (error) {
      this.handleError(error, `rawCreate(${resourceType})`);
    }
  }

  /**
   * Perform a raw FHIR update
   *
   * @param resourceType - The FHIR resource type
   * @param id - The resource ID
   * @param body - The updated resource
   * @returns The updated resource
   */
  async rawUpdate(resourceType: string, id: string, body: unknown): Promise<unknown> {
    try {
      const response = await this.client.update({
        resourceType,
        id,
        body,
      });

      return response;
    } catch (error) {
      this.handleError(error, `rawUpdate(${resourceType}/${id})`);
    }
  }

  /**
   * Perform a raw FHIR delete
   *
   * @param resourceType - The FHIR resource type
   * @param id - The resource ID
   * @returns The operation outcome
   */
  async rawDelete(resourceType: string, id: string): Promise<unknown> {
    try {
      const response = await this.client.delete({
        resourceType,
        id,
      });

      return response;
    } catch (error) {
      this.handleError(error, `rawDelete(${resourceType}/${id})`);
    }
  }
}

/**
 * Create a new EHRClient instance
 *
 * @param baseUrl - The FHIR server base URL
 * @param bearerToken - Optional authorization token
 * @returns A configured EHRClient instance
 */
export function createEHRClient(baseUrl: string, bearerToken?: string): EHRClient {
  return new EHRClient({
    baseUrl,
    bearerToken,
  });
}

export default EHRClient;
