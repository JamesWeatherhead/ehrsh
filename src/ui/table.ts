import Table from 'cli-table3';
import chalk from 'chalk';
import { formatPatientSummary, formatTime, formatStatus, formatMedication, formatLabValue, formatDate } from './format.js';

export function renderPatientTable(patients) {
  if (!patients.length) return chalk.yellow('No patients found.');
  const table = new Table({
    head: [chalk.cyan('#'), chalk.cyan('ID'), chalk.cyan('Name'), chalk.cyan('Gender'), chalk.cyan('DOB')],
    colWidths: [5, 20, 30, 10, 15],
  });
  patients.slice(0, 20).forEach((p, i) => {
    const name = p.name?.[0] ? (p.name[0].family || '') + ', ' + (p.name[0].given?.join(' ') || '') : 'Unknown';
    table.push([String(i + 1), (p.id || 'N/A').slice(0, 18), name, p.gender || '?', p.birthDate || 'N/A']);
  });
  return table.toString();
}

export function renderScheduleTable(appointments) {
  if (!appointments.length) return chalk.yellow('No appointments found.');
  const table = new Table({
    head: [chalk.cyan('Time'), chalk.cyan('Patient'), chalk.cyan('Reason'), chalk.cyan('Status')],
    colWidths: [12, 30, 25, 12],
  });
  const sorted = [...appointments].sort((a, b) => new Date(a.start || 0).getTime() - new Date(b.start || 0).getTime());
  sorted.slice(0, 20).forEach(apt => {
    const patient = apt.participant?.find(p => p.actor?.display)?.actor?.display || 'Unknown';
    const reason = apt.reasonCode?.[0]?.text || 'Visit';
    table.push([formatTime(apt.start), patient, reason, formatStatus(apt.status)]);
  });
  return table.toString();
}

export function renderMedicationTable(meds) {
  if (!meds.length) return chalk.yellow('No medications found.');
  const table = new Table({
    head: [chalk.cyan('#'), chalk.cyan('Medication'), chalk.cyan('Status'), chalk.cyan('Date')],
    colWidths: [5, 50, 12, 15],
  });
  meds.slice(0, 30).forEach((med, i) => {
    table.push([String(i + 1), formatMedication(med), formatStatus(med.status), formatDate(med.authoredOn, { short: true })]);
  });
  return table.toString();
}

export function renderLabTable(labs) {
  if (!labs.length) return chalk.yellow('No lab results found.');
  const table = new Table({
    head: [chalk.cyan('Test'), chalk.cyan('Value'), chalk.cyan('Date')],
    colWidths: [35, 25, 18],
  });
  labs.slice(0, 30).forEach(lab => {
    const name = lab.code?.text || lab.code?.coding?.[0]?.display || 'Unknown';
    table.push([name, formatLabValue(lab), formatDate(lab.effectiveDateTime, { short: true })]);
  });
  return table.toString();
}

export default { renderPatientTable, renderScheduleTable, renderMedicationTable, renderLabTable };
