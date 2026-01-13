#!/usr/bin/env node
import * as readline from 'readline';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { config } from './config.js';
import { EHRClient } from './fhir/client.js';
import { ParsedCommand, CommandContext } from './utils/parser.js';
import { parseNaturalLanguage, isConfigured } from './llm/parser.js';
import { session } from './session.js';
import { renderPatientTable, renderScheduleTable, renderMedicationTable, renderLabTable } from './ui/table.js';
import { renderLabTrendChart } from './ui/chart.js';
import { formatPatientName, header, separator, formatDate } from './ui/format.js';
import { draftNote, getAvailableNoteTypes, getNoteTypeName, getCurrentEditor, NoteType } from './editor.js';
import {
  sendPatientMessage,
  checkResponses,
  getPatientPhone,
  getMessagingConfig,
  getConversationHistory,
  MessageResult,
  PatientResponse,
} from './messaging.js';
import {
  executeWorkflow,
  createWorkflow,
  setPendingWorkflow,
  getAllPendingWorkflows,
  checkPendingWorkflows,
  recordPatientResponse,
  formatWorkflowStatus,
  WorkflowContext,
  WorkflowCondition,
  WorkflowAction,
} from './workflow.js';
import { extractTime, extractSpecialty, ParsedConditionalWorkflow } from './utils/parser.js';

const VERSION = '0.1.0';
let client: EHRClient;

async function initialize() {
  console.log(chalk.cyan.bold('\nehrsh v' + VERSION) + chalk.gray(' - EHR as a Shell'));
  console.log(chalk.gray('FHIR workflows powered by natural language\n'));

  // Check for API key - required for operation
  if (!isConfigured()) {
    console.log(chalk.red('Error: ANTHROPIC_API_KEY is required.'));
    console.log(chalk.gray('Get your API key at https://console.anthropic.com/'));
    console.log(chalk.gray('Then set it: export ANTHROPIC_API_KEY=your-key-here'));
    process.exit(1);
  }

  client = new EHRClient({ baseUrl: config.fhirBaseUrl });

  const spinner = ora('Connecting to FHIR server...').start();
  try {
    const connected = await client.testConnection();
    if (connected) {
      spinner.succeed('Connected to ' + chalk.cyan(config.fhirBaseUrl));
    } else {
      spinner.warn('Could not verify connection to FHIR server');
    }
  } catch (e) {
    spinner.fail('Failed to connect: ' + (e instanceof Error ? e.message : 'Unknown error'));
  }

  console.log(chalk.green('Claude API enabled') + chalk.gray(' - natural language to FHIR'));
  console.log(chalk.gray("\nType 'help' for commands, or describe what you need.\n"));
}

async function handleCommand(input: string) {
  let parsed: ParsedCommand | ParsedCommand[] | null = null;

  try {
    parsed = await parseNaturalLanguage(input);
  } catch (e) {
    console.log(chalk.red('Error parsing command: ' + (e instanceof Error ? e.message : 'Unknown error')));
    return;
  }

  if (!parsed) {
    console.log(chalk.yellow('Could not parse command. Type "help" for examples.'));
    return;
  }

  // Handle compound commands (array of commands)
  if (Array.isArray(parsed)) {
    await handleCompoundCommands(parsed);
    return;
  }

  // Single command
  await executeSingleCommand(parsed);
}

// Execute a chain of commands with context passing
async function handleCompoundCommands(commands: ParsedCommand[]) {
  const context: CommandContext = {};

  console.log(chalk.gray(`Executing ${commands.length} commands...\n`));

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    const isLast = i === commands.length - 1;

    // Apply context from previous commands
    if (context.patientId && !cmd.params.patientId && cmd.params.useActivePatient) {
      cmd.params.patientId = context.patientId;
    }

    try {
      const result = await executeSingleCommand(cmd, context, !isLast);

      // Update context based on result
      if (result) {
        if (result.patientId) context.patientId = result.patientId;
        if (result.patientName) context.patientName = result.patientName;
        if (result.lastResults) context.lastResults = result.lastResults;
      }

      // Add spacing between commands unless it's the last one
      if (!isLast) {
        console.log('');
      }
    } catch (error) {
      console.log(chalk.red('Command chain stopped due to error: ' + (error instanceof Error ? error.message : 'Unknown error')));
      break;
    }
  }
}

// Execute a single command, optionally with context from previous commands
async function executeSingleCommand(
  parsed: ParsedCommand,
  context?: CommandContext,
  suppressTips: boolean = false
): Promise<CommandContext | null> {
  const spinner = ora('Processing...').start();
  const resultContext: CommandContext = {};

  try {
    if (parsed.action === 'help' || parsed.raw.toLowerCase() === 'help') {
      spinner.stop();
      showHelp();
      return null;
    }

    if (parsed.action === 'select' && parsed.params.index !== undefined) {
      spinner.stop();
      // Validate index is positive
      if (parsed.params.index < 1) {
        console.log(chalk.red('Invalid selection. Please enter a number 1 or greater.'));
        return null;
      }

      // Try to get patient from context's last results first, then session
      let patient = null;
      if (context?.lastResults && context.lastResults.length > 0) {
        const idx = parsed.params.index - 1;
        if (idx >= 0 && idx < context.lastResults.length) {
          patient = context.lastResults[idx];
        }
      }
      if (!patient) {
        patient = session.getPatientFromIndex(parsed.params.index);
      }

      if (patient) {
        session.setActivePatient(patient.id, patient.name);
        console.log(chalk.green('Selected: ' + patient.name + ' (ID: ' + patient.id + ')'));
        resultContext.patientId = patient.id;
        resultContext.patientName = patient.name;
        return resultContext;
      } else {
        console.log(chalk.red('Invalid selection. Use a number from the last search results.'));
        return null;
      }
    }

    let patientId = parsed.params.patientId;

    // Use context patientId if available and command needs it
    if (!patientId && context?.patientId && parsed.params.useActivePatient) {
      patientId = context.patientId;
    }

    // Fall back to session's active patient
    if (parsed.params.useActivePatient || (!patientId && !parsed.params.patientName)) {
      const active = session.getActivePatient();
      if (active) patientId = active.id;
    }

    switch (parsed.resource) {
      case 'patient':
        if (parsed.action === 'search' || parsed.params.patientName) {
          const patients = await client.searchPatients({ name: parsed.params.patientName });
          spinner.stop();
          console.log(header('Patient Search Results'));
          console.log(renderPatientTable(patients));
          const results = patients.map(p => ({ id: p.id || '', name: formatPatientName(p) }));
          session.setLastSearchResults(results);
          resultContext.lastResults = results;

          // If only one result, auto-select for context
          if (patients.length === 1) {
            const p = patients[0];
            resultContext.patientId = p.id;
            resultContext.patientName = formatPatientName(p);
            session.setActivePatient(p.id || '', resultContext.patientName);
            console.log(chalk.gray('Auto-selected: ' + resultContext.patientName));
          } else if (patients.length && !suppressTips) {
            console.log(chalk.gray('Tip: Use "select 1" to set a patient as active.'));
          }
        } else if (patientId) {
          const patient = await client.getPatient(patientId);
          spinner.stop();
          console.log(header('Patient Details'));
          console.log('Name: ' + formatPatientName(patient));
          console.log('DOB: ' + formatDate(patient.birthDate));
          console.log('Gender: ' + (patient.gender || 'Unknown'));
          console.log('ID: ' + patient.id);
          resultContext.patientId = patient.id;
          resultContext.patientName = formatPatientName(patient);
        }
        break;

      case 'schedule':
        const appointments = await client.getTodaysAppointments();
        spinner.stop();
        console.log(header("Today's Schedule"));
        console.log(renderScheduleTable(appointments));
        break;

      case 'medication':
        if (!patientId) { spinner.stop(); console.log(chalk.yellow('Please specify a patient or select one first.')); return null; }
        if (parsed.action === 'add' && parsed.params.medicationName) {
          const med = await client.addMedication(patientId, parsed.params.medicationName);
          spinner.succeed(`Created MedicationRequest/${med.id}`);
          const patientName = session.getActivePatient()?.name || patientId;
          console.log(`  Patient: ${patientName}`);
          console.log(`  Medication: ${parsed.params.medicationName}`);
          console.log(`  Status: ${med.status || 'active'}`);
        } else {
          const meds = await client.getPatientMedications(patientId);
          spinner.stop();
          console.log(header('Medications'));
          console.log(renderMedicationTable(meds));
        }
        resultContext.patientId = patientId;
        break;

      case 'lab':
        if (!patientId) { spinner.stop(); console.log(chalk.yellow('Please specify a patient or select one first.')); return null; }
        if (parsed.action === 'plot' && parsed.params.labCode) {
          const startDate = parsed.params.timeRange ? getStartDate(parsed.params.timeRange) : undefined;
          const trend = await client.getLabTrend(patientId, parsed.params.labCode, startDate);
          spinner.stop();
          console.log(renderLabTrendChart(trend));
        } else {
          const labs = await client.getPatientLabs(patientId, parsed.params.labCode);
          spinner.stop();
          console.log(header('Lab Results'));
          console.log(renderLabTable(labs));
        }
        resultContext.patientId = patientId;
        break;

      case 'note':
        if (!patientId) { spinner.stop(); console.log(chalk.yellow('Please specify a patient or select one first.')); return null; }
        if (parsed.action === 'draft') {
          spinner.stop();

          // Get patient info for the template
          const activePatient = session.getActivePatient();
          const patientName = activePatient?.name || context?.patientName || 'Unknown Patient';

          // Show note type selection menu
          const noteTypes = getAvailableNoteTypes();
          const choices = noteTypes.map(type => ({
            name: getNoteTypeName(type),
            value: type
          }));

          console.log(header('Draft Note'));
          console.log(chalk.gray('Using editor: ' + getCurrentEditor()));
          console.log('');

          const { noteType } = await inquirer.prompt([{
            type: 'list',
            name: 'noteType',
            message: 'Select note type:',
            choices
          }]);

          console.log(chalk.gray('\nOpening editor... Save and exit when done.\n'));

          try {
            const result = await draftNote(noteType as NoteType, {
              patientName,
              date: new Date().toISOString().split('T')[0],
              encounterDate: new Date().toISOString().split('T')[0],
              admissionDate: new Date().toISOString().split('T')[0],
              dischargeDate: new Date().toISOString().split('T')[0]
            });

            if (result.cancelled) {
              console.log(chalk.yellow('Note drafting cancelled - no changes made.'));
            } else {
              // Ask if user wants to save to FHIR
              const { shouldSave } = await inquirer.prompt([{
                type: 'confirm',
                name: 'shouldSave',
                message: 'Save note to patient record?',
                default: true
              }]);

              if (shouldSave) {
                const saveSpinner = ora('Saving note to FHIR...').start();
                try {
                  const savedNote = await client.createNote(patientId, result.content, getNoteTypeName(noteType as NoteType));
                  saveSpinner.succeed('Note saved successfully (ID: ' + savedNote.id + ')');
                } catch (saveError) {
                  saveSpinner.fail('Failed to save note: ' + (saveError instanceof Error ? saveError.message : 'Unknown error'));
                }
              } else {
                console.log(chalk.gray('Note not saved.'));
              }
            }
          } catch (editorError) {
            console.log(chalk.red('Editor error: ' + (editorError instanceof Error ? editorError.message : 'Unknown error')));
          }
        } else {
          const notes = await client.getPatientNotes(patientId);
          spinner.stop();
          console.log(header('Clinical Notes'));
          notes.slice(0, 10).forEach((n, i) => {
            const type = n.type?.text || n.type?.coding?.[0]?.display || 'Note';
            const date = formatDate(n.date, { short: true });
            console.log((i + 1) + '. ' + type + ' - ' + date);
          });
          if (!notes.length) console.log(chalk.yellow('No notes found.'));
        }
        resultContext.patientId = patientId;
        break;

      case 'encounter':
        if (!patientId) { spinner.stop(); console.log(chalk.yellow('Please specify a patient or select one first.')); return null; }
        const encounters = await client.getPatientEncounters(patientId);
        spinner.stop();
        console.log(header('Encounters'));
        encounters.slice(0, 10).forEach((e, i) => {
          const type = e.type?.[0]?.text || e.class?.display || 'Visit';
          const date = formatDate(e.period?.start, { short: true });
          console.log((i + 1) + '. ' + type + ' - ' + date + ' (' + (e.status || 'unknown') + ')');
        });
        if (!encounters.length) console.log(chalk.yellow('No encounters found.'));
        resultContext.patientId = patientId;
        break;

      case 'sms':
        // Handle SMS/messaging to patient
        if (!patientId) {
          spinner.stop();
          console.log(chalk.yellow('Please specify a patient or select one first.'));
          return null;
        }

        // Get the message content
        let messageContent = parsed.params.messageContent;
        if (!messageContent) {
          spinner.stop();
          // Prompt for message content if not provided
          const { message: promptedMessage } = await inquirer.prompt([{
            type: 'input',
            name: 'message',
            message: 'Enter message to send:',
            validate: (input: string) => input.trim().length > 0 || 'Message cannot be empty'
          }]);
          messageContent = promptedMessage;
          spinner.start('Sending message...');
        }

        // Check messaging mode
        const msgConfig = getMessagingConfig();
        if (msgConfig.mode === 'mock') {
          console.log(chalk.gray('(Running in mock mode - no real SMS will be sent)'));
        }

        // Send the message
        const sendResult: MessageResult = await sendPatientMessage(patientId, messageContent, client);
        spinner.stop();

        if (sendResult.success) {
          console.log(header('Message Sent'));
          console.log(chalk.green('Message sent successfully!'));
          console.log('Conversation ID: ' + chalk.cyan(sendResult.conversationId));
          console.log('Message ID: ' + (sendResult.messageId || 'N/A'));
          console.log('Provider: ' + sendResult.provider);
          console.log('');
          console.log(chalk.gray('Use "check responses ' + sendResult.conversationId + '" to check for replies.'));
        } else {
          console.log(chalk.red('Failed to send message: ' + (sendResult.error || 'Unknown error')));
        }
        resultContext.patientId = patientId;
        break;

      case 'response':
        // Handle checking for responses
        spinner.stop();
        const conversationId = parsed.params.conversationId;

        if (!conversationId) {
          console.log(chalk.yellow('Please provide a conversation ID.'));
          console.log(chalk.gray('Usage: check responses conv-xxx'));
          return null;
        }

        const response: PatientResponse | null = await checkResponses(conversationId);

        if (response) {
          console.log(header('Patient Response'));
          console.log('From Patient ID: ' + response.patientId);
          console.log('Phone: ' + response.fromNumber);
          console.log('Received: ' + formatDate(response.receivedAt.toISOString()));
          console.log('');
          console.log(chalk.cyan('Message: ') + response.message);
        } else {
          console.log(chalk.yellow('No new responses for conversation: ' + conversationId));

          // In mock mode, show conversation history if available
          const msgCfg = getMessagingConfig();
          if (msgCfg.mode === 'mock') {
            const history = getConversationHistory(conversationId);
            if (history) {
              console.log('');
              console.log(chalk.gray('Conversation history:'));
              history.messages.forEach((msg, i) => {
                const prefix = msg.direction === 'outbound' ? chalk.blue('-> ') : chalk.green('<- ');
                console.log(prefix + msg.content);
              });
            }
          }
        }
        break;

      case 'workflow':
        // Handle conditional workflow commands
        spinner.stop();
        if (parsed.workflow) {
          const workflowResult = await handleConditionalWorkflow(parsed, patientId, context);
          if (workflowResult) {
            resultContext.patientId = workflowResult.patientId || patientId;
          }
        } else {
          // Show pending workflows
          const pendingWorkflows = getAllPendingWorkflows();
          if (pendingWorkflows.length === 0) {
            console.log(chalk.yellow('No pending workflows.'));
          } else {
            console.log(header('Pending Workflows'));
            pendingWorkflows.forEach(wf => {
              console.log(formatWorkflowStatus(wf));
              console.log('');
            });
          }
        }
        break;

      default:
        spinner.stop();
        console.log(chalk.yellow('Command not recognized. Try "help" for examples.'));
        return null;
    }

    return resultContext;
  } catch (error) {
    spinner.fail('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    throw error;
  }
}

/**
 * Handle conditional workflow commands
 * Examples:
 * - "ask pt X if I can move him to 3pm, if he says yes move him"
 * - "if creatinine > 2.0 then flag for nephrology"
 * - "show their meds, if none found add metformin"
 */
async function handleConditionalWorkflow(
  parsed: ParsedCommand,
  patientId: string | undefined,
  context?: CommandContext
): Promise<CommandContext | null> {
  const workflow = parsed.workflow;
  if (!workflow) return null;

  console.log(header('Conditional Workflow'));

  // Build the workflow condition based on the parsed type
  let condition: WorkflowCondition;
  let thenAction: WorkflowAction;
  let elseAction: WorkflowAction | undefined;

  // Determine the condition
  switch (workflow.conditionType) {
    case 'patient_response':
      if (!patientId) {
        console.log(chalk.yellow('Please specify a patient for the workflow.'));
        return null;
      }
      condition = {
        type: 'patient_response',
        patientId,
        expectedResponse: workflow.conditionParams.expectedResponse || 'yes',
        message: workflow.askMessage || '',
      };

      // If this is an ask command, send the message first
      if (parsed.action === 'ask' || parsed.action === 'message') {
        const msgContent = workflow.askMessage || parsed.params.messageContent || 'Please respond yes or no.';
        console.log(chalk.gray('Sending message to patient: "' + msgContent + '"'));

        const sendResult = await sendPatientMessage(patientId, msgContent, client);
        if (sendResult.success) {
          console.log(chalk.green('Message sent. Conversation ID: ' + sendResult.conversationId));
        } else {
          console.log(chalk.red('Failed to send message: ' + (sendResult.error || 'Unknown error')));
          return null;
        }
      }
      break;

    case 'lab_value':
      if (!patientId) {
        console.log(chalk.yellow('Please specify a patient for the workflow.'));
        return null;
      }
      condition = {
        type: 'lab_value',
        patientId,
        code: workflow.conditionParams.labCode || '',
        operator: workflow.conditionParams.operator || '>',
        value: workflow.conditionParams.value || 0,
      };
      break;

    case 'result_empty':
      condition = { type: 'result_empty' };

      // Execute the base command first to get results
      if (parsed.action !== 'workflow') {
        console.log(chalk.gray('Executing: ' + parsed.raw.split(',')[0]));
        const baseResult = await executeSingleCommand({
          ...parsed,
          workflow: undefined, // Remove workflow to prevent recursion
        }, context, true);

        // Store result count for condition evaluation
        const lastResults = context?.lastResults;
        const resultCount = lastResults?.length || 0;
        console.log(chalk.gray(`Found ${resultCount} result(s)`));
      }
      break;

    case 'result_count':
      condition = {
        type: 'result_count',
        operator: workflow.conditionParams.operator || '>',
        count: workflow.conditionParams.count || 0,
      };
      break;

    default:
      console.log(chalk.yellow('Unknown workflow condition type.'));
      return null;
  }

  // Build the then action
  thenAction = buildWorkflowAction(workflow.thenCommand, patientId);

  // Build the else action if present
  if (workflow.elseCommand) {
    elseAction = buildWorkflowAction(workflow.elseCommand, patientId);
  }

  // Create the workflow
  const wf = createWorkflow(condition, thenAction, elseAction, parsed.raw);

  // For patient_response conditions, store as pending and wait
  if (condition.type === 'patient_response') {
    setPendingWorkflow(wf.id, wf);
    console.log(chalk.cyan('Workflow created and awaiting patient response.'));
    console.log(chalk.gray('Workflow ID: ' + wf.id));
    console.log(chalk.gray('Use "show pending workflows" to check status.'));
    return { patientId };
  }

  // For other conditions, execute immediately
  const workflowContext: WorkflowContext = {
    client,
    patientId,
    patientName: context?.patientName,
    lastResultCount: context?.lastResults?.length,
  };

  console.log(chalk.gray('Evaluating condition...'));
  const result = await executeWorkflow(wf, workflowContext);

  if (result.success) {
    console.log(chalk.green('Workflow completed: ' + result.message));
    if (result.conditionMet) {
      console.log(chalk.gray('Condition was met, executed "then" action.'));
    } else if (result.actionExecuted === 'else') {
      console.log(chalk.gray('Condition was not met, executed "else" action.'));
    } else {
      console.log(chalk.gray('Condition was not met, no "else" action defined.'));
    }
  } else {
    console.log(chalk.red('Workflow failed: ' + (result.error || 'Unknown error')));
  }

  return { patientId };
}

/**
 * Build a WorkflowAction from a command string
 */
function buildWorkflowAction(commandStr: string, patientId: string | undefined): WorkflowAction {
  const normalized = commandStr.toLowerCase().trim();

  // Check for "move him" / "reschedule"
  if (/\b(?:move|reschedule)\b/.test(normalized)) {
    const time = extractTime(commandStr);
    return {
      type: 'reschedule_appointment',
      appointmentId: '', // Would need to be determined from context
      newTime: time || new Date().toISOString(),
    };
  }

  // Check for "flag for X"
  if (/\bflag\s+(?:for\s+)?/.test(normalized)) {
    const specialty = extractSpecialty(commandStr);
    return {
      type: 'flag_for_specialty',
      patientId: patientId || '',
      specialty: specialty || 'Review',
    };
  }

  // Check for "add X" (medication)
  const addMatch = normalized.match(/\badd\s+([a-z]+)/i);
  if (addMatch) {
    return {
      type: 'add_medication',
      patientId: patientId || '',
      medicationName: addMatch[1],
    };
  }

  // Check for "show meds/labs"
  if (/\bshow\s+(?:their\s+)?meds?\b/.test(normalized)) {
    return {
      type: 'show_meds',
      patientId: patientId || '',
    };
  }

  if (/\bshow\s+(?:their\s+)?labs?\b/.test(normalized)) {
    return {
      type: 'show_labs',
      patientId: patientId || '',
    };
  }

  // Check for "send message" / "notify"
  if (/\b(?:send|message|notify)\b/.test(normalized)) {
    return {
      type: 'send_message',
      patientId: patientId || '',
      message: commandStr,
    };
  }

  // Check for "create note"
  if (/\b(?:create|draft)\s+(?:a\s+)?note\b/.test(normalized)) {
    return {
      type: 'create_note',
      patientId: patientId || '',
      content: commandStr,
    };
  }

  // Default: log the action
  return {
    type: 'log',
    message: 'Action: ' + commandStr,
  };
}

function getStartDate(range: string): string {
  const now = new Date();
  if (range.endsWith('y')) now.setFullYear(now.getFullYear() - parseInt(range));
  else if (range.endsWith('m')) now.setMonth(now.getMonth() - parseInt(range));
  else if (range.endsWith('w')) now.setDate(now.getDate() - parseInt(range) * 7);
  else if (range.endsWith('d')) now.setDate(now.getDate() - parseInt(range));
  return now.toISOString().split('T')[0];
}

function showHelp() {
  console.log(header('ehrsh Commands'));
  console.log(`
${chalk.cyan('Patient Search:')}
  find patients named Smith
  search patient John Doe

${chalk.cyan('Schedule:')}
  show today's schedule
  show clinic schedule

${chalk.cyan('Medications:')}
  show patient 123's meds
  show their medications     ${chalk.gray('(uses active patient)')}
  add albuterol to patient 123

${chalk.cyan('Labs:')}
  show patient 123's labs
  plot creatinine for patient 123 over past year

${chalk.cyan('Notes:')}
  show their notes
  draft a note               ${chalk.gray('(opens editor with template)')}

${chalk.cyan('Messaging:')}
  message patient 123 about their appointment
  text patient Smith saying "Please confirm your visit"
  ask patient 123 if they received the prescription
  check responses conv-xxx   ${chalk.gray('(check for patient replies)')}

${chalk.cyan('Navigation:')}
  select 1                   ${chalk.gray('(select patient from last search)')}
  help
  exit / quit

${chalk.cyan('Compound Commands:')}  ${chalk.gray('(chain multiple commands together)')}
  find patient Smith and show their meds
  find patient John Doe, select 1, show labs
  show patient Smith's meds then add albuterol
  search patient Jones; select 1; plot creatinine

${chalk.cyan('Conditional Workflows:')}  ${chalk.gray('(if/then/else logic)')}
  ask pt 123 if I can move him to 3pm, if he says yes move him
  if creatinine > 2.0 then flag for nephrology
  show their meds, if none found add metformin
  show pending workflows    ${chalk.gray('(view queued workflows)')}
`);
  console.log(separator());
}

async function main() {
  await initialize();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.green('ehrsh> '),
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    
    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      console.log(chalk.gray('Goodbye!'));
      rl.close();
      process.exit(0);
    }

    if (input) await handleCommand(input);
    rl.prompt();
  });

  rl.on('close', () => process.exit(0));
}

main().catch(console.error);
