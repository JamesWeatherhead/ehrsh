export interface ParsedCommand {
  action: 'search' | 'show' | 'list' | 'add' | 'update' | 'plot' | 'draft' | 'message' | 'select' | 'help' | 'check' | 'ask' | 'flag' | 'workflow';
  resource: 'patient' | 'schedule' | 'appointment' | 'medication' | 'lab' | 'note' | 'encounter' | 'sms' | 'response' | 'workflow' | 'unknown';
  params: {
    patientId?: string;
    patientName?: string;
    date?: string;
    labCode?: string;
    medicationName?: string;
    timeRange?: string;
    message?: string;
    messageContent?: string;
    conversationId?: string;
    index?: number;
    useActivePatient?: boolean;
    // Workflow-specific params
    newTime?: string;
    specialty?: string;
    appointmentId?: string;
  };
  raw: string;
  // Conditional workflow structure (when command contains if/then/else)
  workflow?: ParsedConditionalWorkflow;
}

/**
 * Parsed conditional workflow from natural language
 */
export interface ParsedConditionalWorkflow {
  conditionType: 'patient_response' | 'lab_value' | 'result_empty' | 'result_count';
  conditionParams: {
    expectedResponse?: 'yes' | 'no' | 'any';
    labCode?: string;
    operator?: '>' | '<' | '=' | '>=' | '<=';
    value?: number;
    count?: number;
  };
  thenCommand: string;
  elseCommand?: string;
  askMessage?: string;
}

export interface CommandContext {
  patientId?: string;
  patientName?: string;
  lastResults?: Array<{ id: string; name: string }>;
}

const ACTION_PATTERNS: Record<string, RegExp> = {
  ask: /\b(ask)\s+(?:pt|patient)/i,
  flag: /\b(flag)\s+(?:for|patient)/i,
  workflow: /\b(workflow|pending)\b/i,
  message: /\b(message|text|sms|send\s+(?:a\s+)?message|contact)\b/i,
  check: /\b(check|poll|get)\s+(?:for\s+)?response/i,
  search: /\b(search|find|look\s*up|lookup)\b/i,
  show: /\b(show|display|view|get|see)\b/i,
  list: /\b(list|all|show\s+all)\b/i,
  add: /\b(add|create|prescribe|order|new)\b/i,
  update: /\b(update|change|modify|reschedule|move)\b/i,
  plot: /\b(plot|chart|graph|trend|visualize)\b/i,
  draft: /\b(draft|write|compose|create\s+note)\b/i,
  select: /\b(select|choose|pick|use)\b/i,
  help: /\b(help|commands)\b/i,
};

// Order matters! More specific patterns first, then general "patient"
const RESOURCE_PATTERNS: Record<string, RegExp> = {
  workflow: /\b(workflow|workflows|pending\s+workflow)\b/i,
  sms: /\b(message|text|sms)\s+patient\b/i,
  response: /\b(response|responses|reply|replies)\b/i,
  schedule: /\b(schedule|today.*schedule|clinic|appointments?.*today)\b/i,
  appointment: /\b(appointment|appt|appointments|slot)\b/i,
  medication: /\b(med|meds|medication|medications|prescription|prescriptions|rx|drug|drugs)\b/i,
  lab: /\b(lab|labs|laboratory|bloodwork|test|tests|result|results|creatinine|glucose|hemoglobin|hba1c|cbc|bmp|cmp|sodium|potassium|bun|wbc|platelets|cholesterol|triglycerides|alt|ast)\b/i,
  note: /\b(note|notes|documentation)\b/i,
  encounter: /\b(encounter|visit|visits|encounters)\b/i,
  patient: /\b(patient|pt|patients|pts)\b/i,
};

const LAB_CODE_MAP: Record<string, string> = {
  creatinine: '2160-0',
  glucose: '2345-7',
  hba1c: '4548-4',
  hemoglobin: '718-7',
  sodium: '2951-2',
  potassium: '2823-3',
  bun: '3094-0',
  wbc: '6690-2',
  platelets: '777-3',
};

// Connectors that indicate compound commands
const COMPOUND_CONNECTORS = /\s+(?:and\s+then|then|and)\s+|[,;]\s*/i;

// Check if input contains compound command patterns
function isCompoundCommand(input: string): boolean {
  // Avoid splitting on "and" that's part of normal phrases
  // e.g., "search and rescue" or possessive patterns like "Smith's meds and"
  const normalized = input.toLowerCase();

  // Check for clear compound patterns
  if (/\s+then\s+/i.test(input)) return true;
  if (/[,;]\s*\w/.test(input)) return true;

  // Check for "and" followed by an action word
  const andPattern = /\s+and\s+(show|find|search|add|update|plot|draft|select|list|display|view|get|see)/i;
  if (andPattern.test(input)) return true;

  return false;
}

// Split compound command into individual command strings
function splitCompoundCommand(input: string): string[] {
  // First, handle "and then" as a single connector
  let normalized = input.replace(/\s+and\s+then\s+/gi, ' __SPLIT__ ');

  // Then handle "then"
  normalized = normalized.replace(/\s+then\s+/gi, ' __SPLIT__ ');

  // Handle semicolons and commas
  normalized = normalized.replace(/[;]\s*/g, ' __SPLIT__ ');
  normalized = normalized.replace(/,\s*/g, ' __SPLIT__ ');

  // Handle "and" followed by action words
  normalized = normalized.replace(/\s+and\s+(show|find|search|add|update|plot|draft|select|list|display|view|get|see)/gi, ' __SPLIT__ $1');

  return normalized
    .split('__SPLIT__')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// Parse a single command (internal use)
function parseSingleCommand(input: string): ParsedCommand | null {
  const raw = input.trim();
  if (!raw) return null;

  let action: ParsedCommand['action'] = 'show';
  let resource: ParsedCommand['resource'] = 'unknown';
  const params: ParsedCommand['params'] = {};

  // Detect action
  for (const [act, pattern] of Object.entries(ACTION_PATTERNS)) {
    if (pattern.test(raw)) {
      action = act as ParsedCommand['action'];
      break;
    }
  }

  // Detect resource
  for (const [res, pattern] of Object.entries(RESOURCE_PATTERNS)) {
    if (pattern.test(raw)) {
      resource = res as ParsedCommand['resource'];
      break;
    }
  }

  // Extract patient name (quoted or after 'named')
  // Support: O'Brien, José, Smith-Jones, Müller
  const quotedName = raw.match(/["']([^"']+)["']/);
  const namedPattern = raw.match(/\bnamed\s+([\p{L}][\p{L}'\-]*(?:\s+[\p{L}][\p{L}'\-]*)?)/iu);
  const ptName = raw.match(/\b(?:pt|patient)\s+([\p{L}][\p{L}'\-]*(?:\s+[\p{L}][\p{L}'\-]*)?)/iu);

  if (quotedName) params.patientName = quotedName[1];
  else if (namedPattern) params.patientName = namedPattern[1];
  else if (ptName && !/^\d+$/.test(ptName[1])) params.patientName = ptName[1];

  // Extract patient ID (numeric or UUID)
  const idMatch = raw.match(/\b(?:patient|pt)\s+(\d+|[a-f0-9-]{8,})\b/i);
  if (idMatch) params.patientId = idMatch[1];

  // Extract index for 'select patient 1'
  const indexMatch = raw.match(/\b(?:select|choose)\s+(?:patient\s+)?(\d+)\b/i);
  if (indexMatch) params.index = parseInt(indexMatch[1], 10);

  // Extract lab code
  for (const [labName, code] of Object.entries(LAB_CODE_MAP)) {
    if (raw.toLowerCase().includes(labName)) {
      params.labCode = code;
      break;
    }
  }

  // Extract medication name for add operations
  // Pattern: "add albuterol to patient 123" or "prescribe metformin"
  const medMatch = raw.match(/\b(?:add|prescribe|order)\s+([a-z]+)(?:\s+(?:to|for))?\s+(?:patient|pt)/i);
  if (medMatch && (action === 'add' || action === 'update')) {
    params.medicationName = medMatch[1];
    resource = 'medication';  // Override resource when adding a medication
  }

  // Extract time range - supports: past year, past 2 years, past month, past 6 months, past week, past 2 weeks
  if (/\b(?:past|last)\s+(\d+)\s+years?\b/i.test(raw)) {
    const m = raw.match(/\b(?:past|last)\s+(\d+)\s+years?\b/i);
    if (m) params.timeRange = m[1] + 'y';
  } else if (/\b(?:past|last)\s+year\b/i.test(raw)) {
    params.timeRange = '1y';
  } else if (/\b(?:past|last)\s+(\d+)\s+months?\b/i.test(raw)) {
    const m = raw.match(/\b(?:past|last)\s+(\d+)\s+months?\b/i);
    if (m) params.timeRange = m[1] + 'm';
  } else if (/\b(?:past|last)\s+month\b/i.test(raw)) {
    params.timeRange = '1m';
  } else if (/\b(?:past|last)\s+(\d+)\s+weeks?\b/i.test(raw)) {
    const m = raw.match(/\b(?:past|last)\s+(\d+)\s+weeks?\b/i);
    if (m) params.timeRange = m[1] + 'w';
  } else if (/\b(?:past|last)\s+week\b/i.test(raw)) {
    params.timeRange = '1w';
  } else if (/\btoday\b/i.test(raw)) {
    params.date = 'today';
  }

  // Handle 'their' or 'his'/'her' referring to active patient
  if (/\b(their|his|her)\b/i.test(raw)) {
    params.useActivePatient = true;
  }

  // Extract message content for messaging actions
  // Patterns: "message patient X about Y", "ask patient X if Z", "text patient X Y"
  if (action === 'message' || action === 'ask') {
    // Set resource to sms if it's a messaging action and resource wasn't detected as response
    if (resource !== 'response') {
      resource = 'sms';
    }

    // Extract message content after "about", "saying", "that", or "if"
    const aboutMatch = raw.match(/\b(?:about|saying|that)\s+["']?(.+?)["']?\s*$/i);
    const ifMatch = raw.match(/\bif\s+["']?(.+?)["']?\s*$/i);
    const quotedMessage = raw.match(/["']([^"']+)["']\s*$/);

    if (quotedMessage) {
      params.messageContent = quotedMessage[1];
    } else if (aboutMatch) {
      params.messageContent = aboutMatch[1];
    } else if (ifMatch) {
      params.messageContent = ifMatch[1] + '?';
    }
  }

  // Extract conversation ID for checking responses
  // Pattern: "check responses conv-xxx" or "check response conv-xxx"
  if (action === 'check') {
    resource = 'response';
    const convIdMatch = raw.match(/\b(conv-[a-z0-9-]+)\b/i);
    if (convIdMatch) {
      params.conversationId = convIdMatch[1];
    }
  }

  return { action, resource, params, raw };
}

/**
 * Check if input contains conditional workflow patterns (if/then/else)
 */
function isConditionalWorkflow(input: string): boolean {
  // Pattern 1: "ask pt X ..., if yes/no then ..."
  if (/\bask\s+(?:pt|patient)\s+.+?,?\s*if\s+(?:yes|no|he|she|they)\b.*\bthen\b/i.test(input)) {
    return true;
  }

  // Pattern 2: "if creatinine > 2.0 then ..."
  if (/\bif\s+(?:creatinine|glucose|hba1c|hemoglobin|sodium|potassium|bun|wbc|platelets)\s*[><=]+\s*[\d.]+\s+then\b/i.test(input)) {
    return true;
  }

  // Pattern 3: "show X, if none/empty then ..."
  if (/,?\s*if\s+(?:none|empty|no\s+results?|nothing)\s+(?:found\s+)?(?:then\s+)?(?:add|flag|create|show)/i.test(input)) {
    return true;
  }

  // Pattern 4: Generic "if X then Y" with patient response
  if (/\bif\s+(?:yes|no|they\s+(?:say|respond|reply))\b.*\bthen\b/i.test(input)) {
    return true;
  }

  return false;
}

/**
 * Parse a conditional workflow command
 * Examples:
 * - "ask patient 123 if they can come tomorrow, if yes then confirm appointment"
 * - "message patient about appointment, if no response then flag for follow-up"
 * - "if creatinine > 2.0 then flag for nephrology"
 * - "show their meds, if none found add metformin"
 */
function parseConditionalWorkflowCommand(input: string): ParsedCommand {
  const raw = input.trim();
  let baseCommand = input;
  let workflow: ParsedConditionalWorkflow | undefined;

  // Pattern 1: "ask pt X if I can move him to 3pm, if he says yes move him"
  const askPattern = /^(ask\s+(?:pt|patient)\s+\S+\s+.+?)\s*,?\s*if\s+(?:he|she|they)\s+(?:says?|responds?)\s+(yes|no)\s+(?:then\s+)?(.+?)(?:\s+(?:if\s+(?:he|she|they)\s+(?:says?|responds?)\s+(?:yes|no)|else)\s+(.+))?$/i;
  const askMatch = input.match(askPattern);
  if (askMatch) {
    baseCommand = askMatch[1];
    const expectedResponse = askMatch[2].toLowerCase() as 'yes' | 'no';
    const thenCommand = askMatch[3].trim();
    const elseCommand = askMatch[4]?.trim();

    // Extract the message content from the base command
    const msgMatch = baseCommand.match(/\bif\s+(.+?)$/i);
    const askMessage = msgMatch ? msgMatch[1].replace(/\?$/, '') + '?' : undefined;

    workflow = {
      conditionType: 'patient_response',
      conditionParams: { expectedResponse },
      thenCommand,
      elseCommand,
      askMessage,
    };
  }

  // Pattern 2: "if creatinine > 2.0 then flag for nephrology"
  if (!workflow) {
    const labPattern = /^if\s+(creatinine|glucose|hba1c|hemoglobin|sodium|potassium|bun|wbc|platelets)\s*(>|<|=|>=|<=)\s*([\d.]+)\s+then\s+(.+?)(?:\s+else\s+(.+))?$/i;
    const labMatch = input.match(labPattern);
    if (labMatch) {
      const labName = labMatch[1].toLowerCase();
      const labCode = LAB_CODE_MAP[labName];
      const operator = labMatch[2] as '>' | '<' | '=' | '>=' | '<=';
      const value = parseFloat(labMatch[3]);
      const thenCommand = labMatch[4].trim();
      const elseCommand = labMatch[5]?.trim();

      baseCommand = ''; // No base command for lab conditions
      workflow = {
        conditionType: 'lab_value',
        conditionParams: { labCode, operator, value },
        thenCommand,
        elseCommand,
      };
    }
  }

  // Pattern 3: "show their meds, if none found add metformin"
  if (!workflow) {
    const resultEmptyPattern = /^(.+?)\s*,\s*if\s+(?:none|empty|no\s+results?|nothing)\s+(?:found\s+)?(?:then\s+)?(.+?)(?:\s+else\s+(.+))?$/i;
    const resultMatch = input.match(resultEmptyPattern);
    if (resultMatch) {
      baseCommand = resultMatch[1].trim();
      const thenCommand = resultMatch[2].trim();
      const elseCommand = resultMatch[3]?.trim();

      workflow = {
        conditionType: 'result_empty',
        conditionParams: {},
        thenCommand,
        elseCommand,
      };
    }
  }

  // Pattern 4: Generic "if yes/no then" pattern
  if (!workflow) {
    const genericPattern = /^(.+?)\s*,?\s*if\s+(yes|no|they\s+(?:say|respond|reply)\s+(?:yes|no))\s+then\s+(.+?)(?:\s+else\s+(.+))?$/i;
    const genericMatch = input.match(genericPattern);
    if (genericMatch) {
      baseCommand = genericMatch[1];
      const expectedResponse = genericMatch[2].toLowerCase().includes('yes') ? 'yes' : 'no';
      const thenCommand = genericMatch[3];
      const elseCommand = genericMatch[4];

      workflow = {
        conditionType: 'patient_response',
        conditionParams: { expectedResponse: expectedResponse as 'yes' | 'no' },
        thenCommand,
        elseCommand,
      };
    }
  }

  // Parse the base command
  const parsed = baseCommand ? parseSingleCommand(baseCommand) : null;
  if (!parsed) {
    return {
      action: 'workflow',
      resource: 'workflow',
      params: {},
      raw,
      workflow,
    };
  }

  return {
    ...parsed,
    raw,
    workflow,
  };
}

/**
 * Extract time from natural language (e.g., "3pm", "15:00", "3:30 PM")
 */
export function extractTime(input: string): string | undefined {
  // Match patterns like "3pm", "3:00pm", "15:00", "3:30 PM"
  const timePattern = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;
  const match = input.match(timePattern);

  if (!match) return undefined;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3]?.toLowerCase();

  // Convert to 24-hour format
  if (meridiem === 'pm' && hours !== 12) {
    hours += 12;
  } else if (meridiem === 'am' && hours === 12) {
    hours = 0;
  }

  // Format as ISO time
  const today = new Date();
  today.setHours(hours, minutes, 0, 0);
  return today.toISOString();
}

/**
 * Extract specialty from natural language
 */
export function extractSpecialty(input: string): string | undefined {
  const specialties = [
    'nephrology', 'cardiology', 'neurology', 'oncology', 'endocrinology',
    'gastroenterology', 'pulmonology', 'rheumatology', 'hematology',
    'infectious disease', 'dermatology', 'psychiatry', 'urology',
    'orthopedics', 'ophthalmology', 'otolaryngology', 'ent',
  ];

  const normalized = input.toLowerCase();
  for (const specialty of specialties) {
    if (normalized.includes(specialty)) {
      return specialty.charAt(0).toUpperCase() + specialty.slice(1);
    }
  }

  // Try to extract "flag for X" pattern
  const flagPattern = /\bflag\s+(?:for\s+)?([a-z]+(?:\s+[a-z]+)?)\b/i;
  const match = input.match(flagPattern);
  if (match) {
    return match[1].charAt(0).toUpperCase() + match[1].slice(1);
  }

  return undefined;
}

export function parseCommand(input: string): ParsedCommand | ParsedCommand[] | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // First, check if this is a conditional workflow command
  if (isConditionalWorkflow(trimmed)) {
    return parseConditionalWorkflowCommand(trimmed);
  }

  // Check if this is a compound command
  if (isCompoundCommand(trimmed)) {
    return parseCompoundCommand(trimmed);
  }

  // Single command
  return parseSingleCommand(trimmed);
}

function parseCompoundCommand(input: string): ParsedCommand[] {
  const parts = splitCompoundCommand(input);
  const commands: ParsedCommand[] = [];

  // Track context from earlier commands in the chain
  let inheritedPatientName: string | undefined;
  let inheritedPatientId: string | undefined;

  for (const part of parts) {
    const parsed = parseSingleCommand(part);
    if (parsed) {
      // Inherit patient context from previous commands if this command lacks it
      if (!parsed.params.patientName && !parsed.params.patientId && !parsed.params.useActivePatient) {
        // Check if this command references patient implicitly (e.g., "show meds" after "find patient Smith")
        if (inheritedPatientName || inheritedPatientId) {
          // Mark as needing context from chain
          parsed.params.useActivePatient = true;
        }
      }

      // Extract patient info from this command for later commands in chain
      if (parsed.params.patientName) {
        inheritedPatientName = parsed.params.patientName;
      }
      if (parsed.params.patientId) {
        inheritedPatientId = parsed.params.patientId;
      }

      commands.push(parsed);
    }
  }

  return commands;
}

export function getTimeRangeDate(range: string | undefined): string | undefined {
  const now = new Date();
  if (!range) return undefined;
  if (range.endsWith('y')) {
    now.setFullYear(now.getFullYear() - parseInt(range));
  } else if (range.endsWith('m')) {
    now.setMonth(now.getMonth() - parseInt(range));
  } else if (range.endsWith('w')) {
    now.setDate(now.getDate() - parseInt(range) * 7);
  } else if (range.endsWith('d')) {
    now.setDate(now.getDate() - parseInt(range));
  }
  return now.toISOString().split('T')[0];
}

export { isCompoundCommand, splitCompoundCommand, parseSingleCommand, isConditionalWorkflow, parseConditionalWorkflowCommand };
export default { parseCommand, getTimeRangeDate, isCompoundCommand, splitCompoundCommand, isConditionalWorkflow, parseConditionalWorkflowCommand, extractTime, extractSpecialty };
