/**
 * Conditional Workflow Engine for ehrsh
 *
 * Enables complex conditional commands like:
 * - "ask pt X if I can move him to 3pm, if he says yes move him"
 * - "if creatinine > 2.0 then flag for nephrology"
 * - "show their meds, if none found add metformin"
 */

import chalk from 'chalk';
import { EHRClient, FHIRObservation, FHIRMedicationRequest, FHIRAppointment } from './fhir/client.js';
import { session } from './session.js';
import { ParsedCommand } from './utils/parser.js';

// ============================================
// Type Definitions
// ============================================

/**
 * Condition types for workflow evaluation
 */
export type WorkflowCondition =
  | { type: 'patient_response'; expectedResponse: 'yes' | 'no' | 'any'; patientId: string; message: string }
  | { type: 'lab_value'; code: string; operator: '>' | '<' | '=' | '>=' | '<='; value: number; patientId: string }
  | { type: 'result_empty' }
  | { type: 'result_count'; operator: '>' | '<' | '=' | '>=' | '<='; count: number }
  | { type: 'always_true' };

/**
 * Actions that can be executed as part of a workflow
 */
export type WorkflowAction =
  | { type: 'show_meds'; patientId: string }
  | { type: 'show_labs'; patientId: string; labCode?: string }
  | { type: 'add_medication'; patientId: string; medicationName: string; dose?: string }
  | { type: 'reschedule_appointment'; appointmentId: string; newTime: string }
  | { type: 'flag_for_specialty'; patientId: string; specialty: string; reason?: string }
  | { type: 'send_message'; patientId: string; message: string }
  | { type: 'create_note'; patientId: string; content: string; noteType?: string }
  | { type: 'execute_command'; command: ParsedCommand }
  | { type: 'log'; message: string }
  | { type: 'noop' };

/**
 * A conditional workflow with then/else branches
 */
export interface ConditionalWorkflow {
  id: string;
  condition: WorkflowCondition;
  thenAction: WorkflowAction;
  elseAction?: WorkflowAction;
  description?: string;
  createdAt: Date;
  status: 'pending' | 'ready' | 'completed' | 'failed';
}

/**
 * Context passed during workflow execution
 */
export interface WorkflowContext {
  client: EHRClient;
  patientId?: string;
  patientName?: string;
  lastResult?: unknown;
  lastResultCount?: number;
  patientResponse?: string;
}

/**
 * Result of workflow execution
 */
export interface WorkflowResult {
  success: boolean;
  conditionMet: boolean;
  actionExecuted: 'then' | 'else' | 'none';
  message: string;
  data?: unknown;
  error?: string;
}

// ============================================
// Pending Workflow Storage
// ============================================

/** In-memory storage for pending workflows (awaiting async conditions like patient SMS response) */
const pendingWorkflows = new Map<string, ConditionalWorkflow>();

/** Storage for patient responses (keyed by patient ID) */
const patientResponses = new Map<string, { response: string; timestamp: Date }>();

/**
 * Store a pending workflow that awaits an async condition
 * @param id Unique identifier for the workflow
 * @param workflow The workflow to store
 */
export function setPendingWorkflow(id: string, workflow: ConditionalWorkflow): void {
  pendingWorkflows.set(id, { ...workflow, status: 'pending' });
}

/**
 * Get a pending workflow by ID
 * @param id The workflow ID
 */
export function getPendingWorkflow(id: string): ConditionalWorkflow | undefined {
  return pendingWorkflows.get(id);
}

/**
 * Remove a pending workflow
 * @param id The workflow ID
 */
export function removePendingWorkflow(id: string): boolean {
  return pendingWorkflows.delete(id);
}

/**
 * Get all pending workflows
 */
export function getAllPendingWorkflows(): ConditionalWorkflow[] {
  return Array.from(pendingWorkflows.values());
}

/**
 * Record a patient response (from SMS, portal, etc.)
 * @param patientId The patient's ID
 * @param response The patient's response text
 */
export function recordPatientResponse(patientId: string, response: string): void {
  patientResponses.set(patientId, { response: response.toLowerCase().trim(), timestamp: new Date() });
}

/**
 * Get a patient's most recent response
 * @param patientId The patient's ID
 */
export function getPatientResponse(patientId: string): { response: string; timestamp: Date } | undefined {
  return patientResponses.get(patientId);
}

/**
 * Clear a patient's recorded response
 * @param patientId The patient's ID
 */
export function clearPatientResponse(patientId: string): void {
  patientResponses.delete(patientId);
}

// ============================================
// Condition Evaluation
// ============================================

/**
 * Evaluate a workflow condition
 * @param condition The condition to evaluate
 * @param context The workflow context
 * @returns True if the condition is met
 */
export async function evaluateCondition(
  condition: WorkflowCondition,
  context: WorkflowContext
): Promise<boolean> {
  switch (condition.type) {
    case 'always_true':
      return true;

    case 'patient_response': {
      const response = getPatientResponse(condition.patientId);
      if (!response) return false;

      const normalizedResponse = response.response.toLowerCase();

      if (condition.expectedResponse === 'any') {
        return true;
      }

      if (condition.expectedResponse === 'yes') {
        return ['yes', 'y', 'yeah', 'yep', 'sure', 'ok', 'okay', 'confirmed', 'approve', 'accept'].some(
          word => normalizedResponse.includes(word)
        );
      }

      if (condition.expectedResponse === 'no') {
        return ['no', 'n', 'nope', 'nah', 'decline', 'reject', 'cancel'].some(
          word => normalizedResponse.includes(word)
        );
      }

      return false;
    }

    case 'lab_value': {
      const labs = await context.client.getPatientLabs(condition.patientId, condition.code);
      if (!labs.length) return false;

      // Get the most recent lab value
      const latestLab = labs[0];
      const labValue = latestLab.valueQuantity?.value;

      if (labValue === undefined) return false;

      return compareValues(labValue, condition.operator, condition.value);
    }

    case 'result_empty': {
      if (context.lastResultCount !== undefined) {
        return context.lastResultCount === 0;
      }
      if (Array.isArray(context.lastResult)) {
        return context.lastResult.length === 0;
      }
      return context.lastResult === null || context.lastResult === undefined;
    }

    case 'result_count': {
      const count = context.lastResultCount ??
        (Array.isArray(context.lastResult) ? context.lastResult.length : 0);
      return compareValues(count, condition.operator, condition.count);
    }

    default:
      return false;
  }
}

/**
 * Compare two numeric values with an operator
 */
function compareValues(actual: number, operator: '>' | '<' | '=' | '>=' | '<=', expected: number): boolean {
  switch (operator) {
    case '>': return actual > expected;
    case '<': return actual < expected;
    case '=': return actual === expected;
    case '>=': return actual >= expected;
    case '<=': return actual <= expected;
    default: return false;
  }
}

// ============================================
// Action Execution
// ============================================

/**
 * Execute a workflow action
 * @param action The action to execute
 * @param context The workflow context
 * @returns Result message and any data
 */
export async function executeAction(
  action: WorkflowAction,
  context: WorkflowContext
): Promise<{ success: boolean; message: string; data?: unknown }> {
  try {
    switch (action.type) {
      case 'show_meds': {
        const meds = await context.client.getPatientMedications(action.patientId);
        return {
          success: true,
          message: `Retrieved ${meds.length} medication(s)`,
          data: meds,
        };
      }

      case 'show_labs': {
        const labs = await context.client.getPatientLabs(action.patientId, action.labCode);
        return {
          success: true,
          message: `Retrieved ${labs.length} lab result(s)`,
          data: labs,
        };
      }

      case 'add_medication': {
        const med = await context.client.addMedication(
          action.patientId,
          action.medicationName,
          action.dose
        );
        return {
          success: true,
          message: `Added medication: ${action.medicationName} (ID: ${med.id})`,
          data: med,
        };
      }

      case 'reschedule_appointment': {
        const apt = await context.client.rescheduleAppointment(
          action.appointmentId,
          action.newTime
        );
        return {
          success: true,
          message: `Rescheduled appointment to ${action.newTime}`,
          data: apt,
        };
      }

      case 'flag_for_specialty': {
        // Create a flag/task in the system (simplified - would normally create a Task or Flag resource)
        const note = await context.client.createNote(
          action.patientId,
          `SPECIALTY REFERRAL FLAG\n\nSpecialty: ${action.specialty}\nReason: ${action.reason || 'Per clinical workflow'}\nDate: ${new Date().toISOString()}`,
          'Referral Request'
        );
        return {
          success: true,
          message: `Patient flagged for ${action.specialty} review`,
          data: note,
        };
      }

      case 'send_message': {
        // This would integrate with SMS/patient portal - for now, log the intent
        console.log(chalk.blue(`[Message to patient ${action.patientId}]: ${action.message}`));
        return {
          success: true,
          message: `Message queued for patient: "${action.message}"`,
          data: { patientId: action.patientId, message: action.message, status: 'queued' },
        };
      }

      case 'create_note': {
        const note = await context.client.createNote(
          action.patientId,
          action.content,
          action.noteType
        );
        return {
          success: true,
          message: `Created note (ID: ${note.id})`,
          data: note,
        };
      }

      case 'log': {
        console.log(chalk.gray(`[Workflow log]: ${action.message}`));
        return {
          success: true,
          message: action.message,
        };
      }

      case 'noop': {
        return {
          success: true,
          message: 'No action taken',
        };
      }

      case 'execute_command': {
        // This would delegate to the main command handler
        return {
          success: true,
          message: `Executing command: ${action.command.raw}`,
          data: action.command,
        };
      }

      default:
        return {
          success: false,
          message: 'Unknown action type',
        };
    }
  } catch (error) {
    return {
      success: false,
      message: `Action failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ============================================
// Workflow Execution
// ============================================

/**
 * Execute a conditional workflow
 * @param workflow The workflow to execute
 * @param context The execution context
 * @returns The workflow result
 */
export async function executeWorkflow(
  workflow: ConditionalWorkflow,
  context: WorkflowContext
): Promise<WorkflowResult> {
  try {
    // Evaluate the condition
    const conditionMet = await evaluateCondition(workflow.condition, context);

    // Determine which action to execute
    const actionToExecute = conditionMet ? workflow.thenAction : workflow.elseAction;

    if (!actionToExecute) {
      return {
        success: true,
        conditionMet,
        actionExecuted: 'none',
        message: conditionMet
          ? 'Condition met, but no action defined'
          : 'Condition not met, no else action defined',
      };
    }

    // Execute the appropriate action
    const result = await executeAction(actionToExecute, context);

    return {
      success: result.success,
      conditionMet,
      actionExecuted: conditionMet ? 'then' : 'else',
      message: result.message,
      data: result.data,
      error: result.success ? undefined : result.message,
    };
  } catch (error) {
    return {
      success: false,
      conditionMet: false,
      actionExecuted: 'none',
      message: 'Workflow execution failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check all pending workflows and execute any that are ready
 * This should be called periodically or when new patient responses arrive
 * @param client The FHIR client to use for execution
 */
export async function checkPendingWorkflows(client: EHRClient): Promise<WorkflowResult[]> {
  const results: WorkflowResult[] = [];

  for (const [id, workflow] of pendingWorkflows.entries()) {
    if (workflow.status !== 'pending') continue;

    // Check if the workflow's condition can now be evaluated
    const context: WorkflowContext = { client };

    // For patient_response conditions, check if we have a response
    if (workflow.condition.type === 'patient_response') {
      const response = getPatientResponse(workflow.condition.patientId);
      if (!response) continue; // Still waiting for response

      context.patientResponse = response.response;
    }

    try {
      // Mark as ready and execute
      workflow.status = 'ready';
      pendingWorkflows.set(id, workflow);

      const result = await executeWorkflow(workflow, context);

      // Mark as completed or failed
      workflow.status = result.success ? 'completed' : 'failed';
      pendingWorkflows.set(id, workflow);

      // Clean up completed workflows after a delay
      if (result.success) {
        setTimeout(() => removePendingWorkflow(id), 60000); // Clean up after 1 minute
      }

      // Clean up the patient response
      if (workflow.condition.type === 'patient_response') {
        clearPatientResponse(workflow.condition.patientId);
      }

      results.push(result);

      console.log(chalk.green(`Workflow ${id} completed: ${result.message}`));
    } catch (error) {
      workflow.status = 'failed';
      pendingWorkflows.set(id, workflow);

      results.push({
        success: false,
        conditionMet: false,
        actionExecuted: 'none',
        message: 'Workflow check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

// ============================================
// Workflow Builder Helpers
// ============================================

/**
 * Generate a unique workflow ID
 */
export function generateWorkflowId(): string {
  return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new conditional workflow
 */
export function createWorkflow(
  condition: WorkflowCondition,
  thenAction: WorkflowAction,
  elseAction?: WorkflowAction,
  description?: string
): ConditionalWorkflow {
  return {
    id: generateWorkflowId(),
    condition,
    thenAction,
    elseAction,
    description,
    createdAt: new Date(),
    status: 'pending',
  };
}

/**
 * Create a workflow from natural language patterns
 * This is a helper to build workflows from parsed conditional commands
 */
export function buildWorkflowFromParsed(
  conditionType: WorkflowCondition['type'],
  conditionParams: Partial<WorkflowCondition>,
  thenActionType: WorkflowAction['type'],
  thenActionParams: Partial<WorkflowAction>,
  elseActionType?: WorkflowAction['type'],
  elseActionParams?: Partial<WorkflowAction>
): ConditionalWorkflow {
  const condition = { type: conditionType, ...conditionParams } as WorkflowCondition;
  const thenAction = { type: thenActionType, ...thenActionParams } as WorkflowAction;
  const elseAction = elseActionType
    ? ({ type: elseActionType, ...elseActionParams } as WorkflowAction)
    : undefined;

  return createWorkflow(condition, thenAction, elseAction);
}

// ============================================
// Workflow Status Display
// ============================================

/**
 * Format workflow status for display
 */
export function formatWorkflowStatus(workflow: ConditionalWorkflow): string {
  const statusColors: Record<string, (s: string) => string> = {
    pending: chalk.yellow,
    ready: chalk.blue,
    completed: chalk.green,
    failed: chalk.red,
  };

  const colorFn = statusColors[workflow.status] || chalk.white;
  const desc = workflow.description || describeWorkflow(workflow);

  return `[${colorFn(workflow.status.toUpperCase())}] ${workflow.id}\n  ${desc}`;
}

/**
 * Generate a human-readable description of a workflow
 */
export function describeWorkflow(workflow: ConditionalWorkflow): string {
  const conditionDesc = describeCondition(workflow.condition);
  const thenDesc = describeAction(workflow.thenAction);
  const elseDesc = workflow.elseAction ? describeAction(workflow.elseAction) : null;

  let desc = `If ${conditionDesc}, then ${thenDesc}`;
  if (elseDesc) {
    desc += `, else ${elseDesc}`;
  }
  return desc;
}

function describeCondition(condition: WorkflowCondition): string {
  switch (condition.type) {
    case 'patient_response':
      return `patient responds "${condition.expectedResponse}"`;
    case 'lab_value':
      return `${condition.code} ${condition.operator} ${condition.value}`;
    case 'result_empty':
      return 'result is empty';
    case 'result_count':
      return `result count ${condition.operator} ${condition.count}`;
    case 'always_true':
      return 'always';
    default:
      return 'unknown condition';
  }
}

function describeAction(action: WorkflowAction): string {
  switch (action.type) {
    case 'show_meds':
      return 'show medications';
    case 'show_labs':
      return 'show labs';
    case 'add_medication':
      return `add ${action.medicationName}`;
    case 'reschedule_appointment':
      return `reschedule to ${action.newTime}`;
    case 'flag_for_specialty':
      return `flag for ${action.specialty}`;
    case 'send_message':
      return 'send message';
    case 'create_note':
      return 'create note';
    case 'log':
      return `log: ${action.message}`;
    case 'noop':
      return 'do nothing';
    case 'execute_command':
      return `execute: ${action.command.raw}`;
    default:
      return 'unknown action';
  }
}

// ============================================
// Exports
// ============================================

export default {
  // Workflow execution
  executeWorkflow,
  executeAction,
  evaluateCondition,

  // Pending workflow management
  setPendingWorkflow,
  getPendingWorkflow,
  removePendingWorkflow,
  getAllPendingWorkflows,
  checkPendingWorkflows,

  // Patient response handling
  recordPatientResponse,
  getPatientResponse,
  clearPatientResponse,

  // Workflow creation
  createWorkflow,
  generateWorkflowId,
  buildWorkflowFromParsed,

  // Display helpers
  formatWorkflowStatus,
  describeWorkflow,
};
