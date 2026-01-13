/**
 * Editor integration for ehrsh
 * Opens user's preferred editor (nano, vim, or $EDITOR) for note drafting
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Supported note template types
 */
export type NoteType = 'soap' | 'hp' | 'progress' | 'discharge';

/**
 * Template placeholder values
 */
export interface TemplatePlaceholders {
  patientName?: string;
  date?: string;
  chiefComplaint?: string;
  providerName?: string;
  mrn?: string;
  dob?: string;
  encounterDate?: string;
  admissionDate?: string;
  dischargeDate?: string;
  [key: string]: string | undefined;
}

/**
 * Result from the editor session
 */
export interface EditorResult {
  content: string;
  cancelled: boolean;
}

/**
 * Note templates for common clinical note types
 */
const TEMPLATES: Record<NoteType, string> = {
  soap: `================================================================================
                              SOAP NOTE
================================================================================

Patient: {{patientName}}
Date: {{date}}
Provider: {{providerName}}
MRN: {{mrn}}

--------------------------------------------------------------------------------
SUBJECTIVE
--------------------------------------------------------------------------------
Chief Complaint: {{chiefComplaint}}

History of Present Illness:


Review of Systems:
  - Constitutional:
  - Cardiovascular:
  - Respiratory:
  - Gastrointestinal:
  - Musculoskeletal:
  - Neurological:
  - Psychiatric:

--------------------------------------------------------------------------------
OBJECTIVE
--------------------------------------------------------------------------------
Vital Signs:
  - BP:
  - HR:
  - Temp:
  - RR:
  - SpO2:
  - Weight:
  - Height:

Physical Examination:
  - General:
  - HEENT:
  - Cardiovascular:
  - Lungs:
  - Abdomen:
  - Extremities:
  - Neurological:
  - Skin:

Laboratory/Imaging Results:


--------------------------------------------------------------------------------
ASSESSMENT
--------------------------------------------------------------------------------
1.
2.
3.

--------------------------------------------------------------------------------
PLAN
--------------------------------------------------------------------------------
1.
2.
3.

Follow-up:

________________________________________________________________________________
Signature: ________________________________  Date: {{date}}
`,

  hp: `================================================================================
                         HISTORY & PHYSICAL
================================================================================

Patient: {{patientName}}
Date of Exam: {{date}}
Provider: {{providerName}}
MRN: {{mrn}}
DOB: {{dob}}

--------------------------------------------------------------------------------
CHIEF COMPLAINT
--------------------------------------------------------------------------------
{{chiefComplaint}}

--------------------------------------------------------------------------------
HISTORY OF PRESENT ILLNESS
--------------------------------------------------------------------------------


--------------------------------------------------------------------------------
PAST MEDICAL HISTORY
--------------------------------------------------------------------------------
1.
2.
3.

--------------------------------------------------------------------------------
PAST SURGICAL HISTORY
--------------------------------------------------------------------------------
1.
2.

--------------------------------------------------------------------------------
MEDICATIONS
--------------------------------------------------------------------------------
1.
2.
3.
4.
5.

--------------------------------------------------------------------------------
ALLERGIES
--------------------------------------------------------------------------------


--------------------------------------------------------------------------------
FAMILY HISTORY
--------------------------------------------------------------------------------
  - Mother:
  - Father:
  - Siblings:
  - Children:

--------------------------------------------------------------------------------
SOCIAL HISTORY
--------------------------------------------------------------------------------
  - Tobacco:
  - Alcohol:
  - Drugs:
  - Occupation:
  - Living Situation:

--------------------------------------------------------------------------------
REVIEW OF SYSTEMS
--------------------------------------------------------------------------------
  - Constitutional:
  - Eyes:
  - ENT:
  - Cardiovascular:
  - Respiratory:
  - Gastrointestinal:
  - Genitourinary:
  - Musculoskeletal:
  - Integumentary:
  - Neurological:
  - Psychiatric:
  - Endocrine:
  - Hematologic/Lymphatic:
  - Allergic/Immunologic:

--------------------------------------------------------------------------------
PHYSICAL EXAMINATION
--------------------------------------------------------------------------------
Vital Signs:
  - BP:
  - HR:
  - Temp:
  - RR:
  - SpO2:
  - Weight:
  - Height:
  - BMI:

General Appearance:


HEENT:
  - Head:
  - Eyes:
  - Ears:
  - Nose:
  - Throat:

Neck:

Cardiovascular:

Respiratory:

Abdomen:

Extremities:

Neurological:
  - Mental Status:
  - Cranial Nerves:
  - Motor:
  - Sensory:
  - Reflexes:
  - Coordination:
  - Gait:

Skin:

--------------------------------------------------------------------------------
LABORATORY DATA
--------------------------------------------------------------------------------


--------------------------------------------------------------------------------
IMAGING
--------------------------------------------------------------------------------


--------------------------------------------------------------------------------
ASSESSMENT
--------------------------------------------------------------------------------
1.
2.
3.

--------------------------------------------------------------------------------
PLAN
--------------------------------------------------------------------------------
1.
2.
3.

________________________________________________________________________________
Signature: ________________________________  Date: {{date}}
`,

  progress: `================================================================================
                           PROGRESS NOTE
================================================================================

Patient: {{patientName}}
Date: {{date}}
Provider: {{providerName}}
MRN: {{mrn}}
Encounter Type:

--------------------------------------------------------------------------------
INTERVAL HISTORY
--------------------------------------------------------------------------------
Since last visit:


Current symptoms:


Medication compliance:


--------------------------------------------------------------------------------
CURRENT MEDICATIONS
--------------------------------------------------------------------------------
1.
2.
3.

--------------------------------------------------------------------------------
VITAL SIGNS
--------------------------------------------------------------------------------
  - BP:
  - HR:
  - Temp:
  - RR:
  - SpO2:
  - Weight:

--------------------------------------------------------------------------------
PHYSICAL EXAMINATION
--------------------------------------------------------------------------------
General:

Focused Exam:


--------------------------------------------------------------------------------
RECENT RESULTS
--------------------------------------------------------------------------------
Labs:

Imaging:

Other:

--------------------------------------------------------------------------------
ASSESSMENT & PLAN
--------------------------------------------------------------------------------
Problem #1:
  Assessment:
  Plan:

Problem #2:
  Assessment:
  Plan:

Problem #3:
  Assessment:
  Plan:

--------------------------------------------------------------------------------
FOLLOW-UP
--------------------------------------------------------------------------------
Return to clinic:
Additional instructions:

________________________________________________________________________________
Signature: ________________________________  Date: {{date}}
`,

  discharge: `================================================================================
                         DISCHARGE SUMMARY
================================================================================

Patient: {{patientName}}
MRN: {{mrn}}
DOB: {{dob}}
Admission Date: {{admissionDate}}
Discharge Date: {{dischargeDate}}
Attending Physician: {{providerName}}
Primary Care Physician:

Length of Stay:

--------------------------------------------------------------------------------
ADMISSION DIAGNOSIS
--------------------------------------------------------------------------------
1.
2.

--------------------------------------------------------------------------------
DISCHARGE DIAGNOSIS
--------------------------------------------------------------------------------
1.
2.
3.

--------------------------------------------------------------------------------
PROCEDURES PERFORMED
--------------------------------------------------------------------------------
1.
2.

--------------------------------------------------------------------------------
HOSPITAL COURSE
--------------------------------------------------------------------------------


--------------------------------------------------------------------------------
CONDITION AT DISCHARGE
--------------------------------------------------------------------------------
  - General condition:
  - Vital signs stable: Yes / No
  - Ambulatory status:
  - Diet:
  - Activity level:

--------------------------------------------------------------------------------
DISCHARGE MEDICATIONS
--------------------------------------------------------------------------------
1.
2.
3.
4.
5.

Medications stopped:

Medications changed:

--------------------------------------------------------------------------------
FOLLOW-UP APPOINTMENTS
--------------------------------------------------------------------------------
1. Provider:           Date:           Location:
2. Provider:           Date:           Location:

--------------------------------------------------------------------------------
DISCHARGE INSTRUCTIONS
--------------------------------------------------------------------------------
Activity restrictions:

Diet:

Wound care:

Warning signs - return to ED if:
  -
  -
  -

--------------------------------------------------------------------------------
PENDING RESULTS
--------------------------------------------------------------------------------


--------------------------------------------------------------------------------
PATIENT EDUCATION PROVIDED
--------------------------------------------------------------------------------
  - Diagnosis discussed: Yes / No
  - Medications reviewed: Yes / No
  - Follow-up explained: Yes / No
  - Written instructions given: Yes / No

Patient/Family verbalized understanding: Yes / No

________________________________________________________________________________
Signature: ________________________________  Date: {{dischargeDate}}

Dictated by:
Transcribed by:
`
};

/**
 * Get the user's preferred editor
 * Checks $EDITOR environment variable, then falls back to nano, then vim
 */
function getPreferredEditor(): string {
  const editor = process.env.EDITOR;
  if (editor) {
    return editor;
  }

  // Check if nano is available
  try {
    const { execSync } = require('child_process');
    execSync('which nano', { stdio: 'ignore' });
    return 'nano';
  } catch {
    // nano not found
  }

  // Check if vim is available
  try {
    const { execSync } = require('child_process');
    execSync('which vim', { stdio: 'ignore' });
    return 'vim';
  } catch {
    // vim not found
  }

  // Default to nano and hope for the best
  return 'nano';
}

/**
 * Replace template placeholders with actual values
 */
function applyPlaceholders(template: string, placeholders: TemplatePlaceholders): string {
  let result = template;

  // Replace all known placeholders
  for (const [key, value] of Object.entries(placeholders)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value || '');
  }

  // Replace any remaining placeholders with empty string
  result = result.replace(/\{\{[^}]+\}\}/g, '');

  return result;
}

/**
 * Get the template for a note type
 */
export function getTemplate(noteType: NoteType): string {
  return TEMPLATES[noteType] || TEMPLATES.progress;
}

/**
 * Get all available note types
 */
export function getAvailableNoteTypes(): NoteType[] {
  return Object.keys(TEMPLATES) as NoteType[];
}

/**
 * Get a human-readable name for a note type
 */
export function getNoteTypeName(noteType: NoteType): string {
  const names: Record<NoteType, string> = {
    soap: 'SOAP Note',
    hp: 'History & Physical',
    progress: 'Progress Note',
    discharge: 'Discharge Summary'
  };
  return names[noteType] || noteType;
}

/**
 * Create a temporary file with the template content
 */
function createTempFile(content: string): string {
  const tmpDir = os.tmpdir();
  const timestamp = Date.now();
  const filename = `ehrsh_note_${timestamp}.txt`;
  const filepath = path.join(tmpDir, filename);

  fs.writeFileSync(filepath, content, 'utf-8');
  return filepath;
}

/**
 * Open the editor with a file and wait for it to close
 */
function openEditor(filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const editor = getPreferredEditor();

    // Spawn editor as child process with stdio inherited
    // This allows the editor to take over the terminal
    const child = spawn(editor, [filepath], {
      stdio: 'inherit',
      shell: true
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to start editor '${editor}': ${err.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Editor exited with code ${code}`));
      }
    });
  });
}

/**
 * Read the content of a file
 */
function readFileContent(filepath: string): string {
  return fs.readFileSync(filepath, 'utf-8');
}

/**
 * Clean up temporary file
 */
function cleanupTempFile(filepath: string): void {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Draft a clinical note using the user's preferred editor
 *
 * Opens the editor with a template pre-populated with the provided placeholders.
 * When the user saves and exits, the content is returned.
 *
 * @param noteType - The type of note template to use
 * @param placeholders - Values to substitute in the template
 * @returns The note content after editing, or null if cancelled
 *
 * @example
 * ```typescript
 * const content = await draftNote('soap', {
 *   patientName: 'John Smith',
 *   date: '2024-01-12',
 *   chiefComplaint: 'Chest pain'
 * });
 * ```
 */
export async function draftNote(
  noteType: NoteType,
  placeholders: TemplatePlaceholders = {}
): Promise<EditorResult> {
  // Get the template
  const template = getTemplate(noteType);

  // Set default date if not provided
  if (!placeholders.date) {
    placeholders.date = new Date().toISOString().split('T')[0];
  }

  // Apply placeholders
  const content = applyPlaceholders(template, placeholders);

  // Create temp file
  const filepath = createTempFile(content);

  try {
    // Get original content for comparison
    const originalContent = content;

    // Open editor and wait for it to close
    await openEditor(filepath);

    // Read the modified content
    const modifiedContent = readFileContent(filepath);

    // Check if content was modified (user didn't just exit without saving)
    const cancelled = modifiedContent === originalContent;

    return {
      content: modifiedContent,
      cancelled
    };
  } finally {
    // Always clean up temp file
    cleanupTempFile(filepath);
  }
}

/**
 * Edit arbitrary text content using the user's preferred editor
 *
 * @param initialContent - The initial content to display in the editor
 * @returns The modified content after editing
 *
 * @example
 * ```typescript
 * const content = await editText('Initial text here');
 * ```
 */
export async function editText(initialContent: string = ''): Promise<EditorResult> {
  const filepath = createTempFile(initialContent);

  try {
    const originalContent = initialContent;

    await openEditor(filepath);

    const modifiedContent = readFileContent(filepath);
    const cancelled = modifiedContent === originalContent;

    return {
      content: modifiedContent,
      cancelled
    };
  } finally {
    cleanupTempFile(filepath);
  }
}

/**
 * Get the currently configured editor
 */
export function getCurrentEditor(): string {
  return getPreferredEditor();
}

export default {
  draftNote,
  editText,
  getTemplate,
  getAvailableNoteTypes,
  getNoteTypeName,
  getCurrentEditor
};
