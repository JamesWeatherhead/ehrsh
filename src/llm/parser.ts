/**
 * Natural Language Parser using Claude API
 * Converts conversational input to structured FHIR commands
 */

import Anthropic from '@anthropic-ai/sdk';
import { ParsedCommand, ParsedConditionalWorkflow } from '../utils/parser.js';

const SYSTEM_PROMPT = `You are a clinical EHR command parser. Convert natural language into structured FHIR commands.

Your job: Take whatever the clinician says and figure out what FHIR operation they want.

## Actions (what they want to do)
- search: Find patients ("find Smith", "look up John Doe", "who's my 3pm")
- show: Display data ("show their meds", "what pills does he take", "any recent labs")
- add: Create something ("add albuterol", "prescribe metformin", "order a CBC")
- plot: Trend/chart ("plot creatinine", "trend their A1C", "graph kidney function")
- draft: Write a note ("draft a note", "write up this visit", "document the encounter")
- message: Contact patient ("text the patient", "send them a reminder", "ask if they can come earlier")
- select: Pick from list ("select 1", "use the first one", "that one")
- update: Modify ("reschedule to 3pm", "change the appointment", "move it")
- check: Check responses ("check responses", "any replies")
- flag: Flag for review ("flag for nephrology", "needs cardiology consult")
- help: Show help
- workflow: Conditional logic ("if X then Y")

## Resources (what FHIR resource)
- patient: Patient records
- medication: Meds, pills, prescriptions, drugs, rx
- lab: Labs, bloodwork, tests, kidney function, A1C, creatinine, glucose, CBC, BMP, CMP
- schedule: Today's schedule, appointments today
- appointment: Specific appointments
- note: Clinical notes, documentation
- encounter: Visits
- sms: Patient messaging
- response: Message responses
- workflow: Conditional workflows

## Lab Codes (LOINC)
- creatinine, kidney function, renal: 2160-0
- glucose, blood sugar: 2345-7
- hba1c, a1c, hemoglobin a1c: 4548-4
- hemoglobin, hgb: 718-7
- sodium, na: 2951-2
- potassium, k: 2823-3
- bun: 3094-0
- wbc, white count: 6690-2
- platelets, plt: 777-3
- cholesterol: 2093-3
- triglycerides: 2571-8
- alt: 1742-6
- ast: 1920-8
- tsh: 3016-3

## Time Ranges
- "past year", "last year", "this year" -> "1y"
- "past 6 months", "last 6 months" -> "6m"
- "past month", "last month" -> "1m"
- "past week", "last week" -> "1w"

## Context Clues
- "their", "his", "her", "the patient's", "this guy" -> useActivePatient: true
- Numbers after "select" or "choose" -> index parameter
- Names after "find", "search", "patient" -> patientName parameter

## Response Format
Return ONLY valid JSON (no markdown, no backticks, no explanation):

{
  "action": "search|show|add|plot|draft|message|select|update|check|flag|help|workflow",
  "resource": "patient|medication|lab|schedule|appointment|note|encounter|sms|response|workflow",
  "params": {
    "patientId": "string or null",
    "patientName": "string or null",
    "labCode": "LOINC code or null",
    "medicationName": "string or null",
    "timeRange": "1y|6m|1m|1w or null",
    "messageContent": "string or null",
    "index": "number or null",
    "useActivePatient": "boolean",
    "specialty": "string or null"
  },
  "isCompound": false,
  "commands": []
}

For compound commands ("find Smith and show their meds"), set isCompound: true and put each command in commands array.

## Examples

"what pills does this guy take"
{"action":"show","resource":"medication","params":{"useActivePatient":true},"isCompound":false,"commands":[]}

"any recent kidney function tests"
{"action":"show","resource":"lab","params":{"labCode":"2160-0","useActivePatient":true},"isCompound":false,"commands":[]}

"is their A1C under control"
{"action":"show","resource":"lab","params":{"labCode":"4548-4","useActivePatient":true},"isCompound":false,"commands":[]}

"find patients named Smith"
{"action":"search","resource":"patient","params":{"patientName":"Smith"},"isCompound":false,"commands":[]}

"select 1 and show their meds"
{"action":"select","resource":"patient","params":{"index":1},"isCompound":true,"commands":[{"action":"select","resource":"patient","params":{"index":1}},{"action":"show","resource":"medication","params":{"useActivePatient":true}}]}

"plot creatinine over the past year"
{"action":"plot","resource":"lab","params":{"labCode":"2160-0","timeRange":"1y","useActivePatient":true},"isCompound":false,"commands":[]}

"flag for nephrology"
{"action":"flag","resource":"workflow","params":{"specialty":"Nephrology","useActivePatient":true},"isCompound":false,"commands":[]}`;

let client: Anthropic | null = null;

/**
 * Initialize the Claude client
 * Supports both direct Anthropic API and Azure Foundry
 */
function getClient(): Anthropic {
  if (!client) {
    // Check for Azure Foundry configuration first
    const foundryBaseUrl = process.env.ANTHROPIC_FOUNDRY_BASE_URL;
    const foundryApiKey = process.env.ANTHROPIC_FOUNDRY_API_KEY;

    if (foundryBaseUrl && foundryApiKey) {
      client = new Anthropic({
        apiKey: foundryApiKey,
        baseURL: foundryBaseUrl,
      });
    } else {
      // Fall back to direct Anthropic API
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY or ANTHROPIC_FOUNDRY_API_KEY is required. Get your key at https://console.anthropic.com/');
      }
      client = new Anthropic({ apiKey });
    }
  }
  return client;
}

/**
 * Check if API key is configured (direct or Foundry)
 */
export function isConfigured(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY ||
    (process.env.ANTHROPIC_FOUNDRY_BASE_URL && process.env.ANTHROPIC_FOUNDRY_API_KEY));
}

/**
 * Parse natural language input using Claude
 */
export async function parseNaturalLanguage(input: string): Promise<ParsedCommand | ParsedCommand[] | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Simple commands don't need LLM
  if (/^(help|exit|quit)$/i.test(trimmed)) {
    return {
      action: 'help',
      resource: 'unknown' as const,
      params: {},
      raw: trimmed,
    };
  }

  const anthropic = getClient();

  // Use environment variable for model or default to claude-3-5-sonnet
  const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

  const message = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: trimmed }],
  });

  // Extract text response
  const textBlock = message.content.find(block => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No response from Claude');
  }

  // Parse JSON
  let parsed: LLMResponse;
  try {
    parsed = JSON.parse(textBlock.text.trim());
  } catch {
    // Try to extract JSON if there's extra text
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Could not parse response');
    }
  }

  // Handle compound commands
  if (parsed.isCompound && parsed.commands && parsed.commands.length > 0) {
    return parsed.commands.map(cmd => toCommand(cmd, trimmed));
  }

  return toCommand(parsed, trimmed);
}

interface LLMResponse {
  action: string;
  resource: string;
  params: Record<string, unknown>;
  isCompound?: boolean;
  commands?: LLMResponse[];
  workflow?: ParsedConditionalWorkflow;
}

function toCommand(result: LLMResponse, raw: string): ParsedCommand {
  const params: ParsedCommand['params'] = {};

  if (result.params) {
    if (result.params.patientId) params.patientId = String(result.params.patientId);
    if (result.params.patientName) params.patientName = String(result.params.patientName);
    if (result.params.labCode) params.labCode = String(result.params.labCode);
    if (result.params.medicationName) params.medicationName = String(result.params.medicationName);
    if (result.params.timeRange) params.timeRange = String(result.params.timeRange);
    if (result.params.messageContent) params.messageContent = String(result.params.messageContent);
    if (result.params.conversationId) params.conversationId = String(result.params.conversationId);
    if (result.params.index) params.index = Number(result.params.index);
    if (result.params.useActivePatient) params.useActivePatient = true;
    if (result.params.specialty) params.specialty = String(result.params.specialty);
    if (result.params.newTime) params.newTime = String(result.params.newTime);
    if (result.params.appointmentId) params.appointmentId = String(result.params.appointmentId);
    if (result.params.message) params.message = String(result.params.message);
  }

  return {
    action: (result.action || 'show') as ParsedCommand['action'],
    resource: (result.resource || 'unknown') as ParsedCommand['resource'],
    params,
    raw,
    workflow: result.workflow,
  };
}

export default { parseNaturalLanguage, isConfigured };
