import chalk from 'chalk';

export function formatName(name) {
  if (!name) return 'Unknown';
  const family = name.family || '';
  const given = name.given?.join(' ') || '';
  return family && given ? family + ', ' + given : family || given || 'Unknown';
}

export function formatPatientName(patient) {
  if (!patient.name?.length) return 'Unknown Patient';
  const official = patient.name.find(n => n.use === 'official');
  return formatName(official || patient.name[0]);
}

export function calculateAge(birthDate) {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function formatPatientSummary(patient) {
  const name = formatPatientName(patient);
  const gender = patient.gender ? patient.gender.charAt(0).toUpperCase() : '?';
  const age = patient.birthDate ? calculateAge(patient.birthDate) : '?';
  return name + ' (' + gender + ', ' + age + ')';
}

export function formatDate(dateString: any, options: any = {}) {
  if (!dateString) return chalk.gray('N/A');
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return chalk.gray('Invalid Date');
  if (options.short) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  const opts: any = { year: 'numeric', month: 'long', day: 'numeric' };
  if (options.includeTime) { opts.hour = '2-digit'; opts.minute = '2-digit'; }
  return date.toLocaleString('en-US', opts);
}

export function formatTime(dateString) {
  if (!dateString) return chalk.gray('N/A');
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return chalk.gray('Invalid');
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function formatStatus(status) {
  if (!status) return chalk.gray('Unknown');
  const s = status.toLowerCase();
  if (['arrived', 'completed', 'finished', 'active', 'confirmed', 'fulfilled'].includes(s)) return chalk.green(status);
  if (['pending', 'in-progress', 'booked', 'waitlist', 'on-hold', 'draft'].includes(s)) return chalk.yellow(status);
  if (['cancelled', 'canceled', 'noshow', 'no-show', 'entered-in-error', 'stopped'].includes(s)) return chalk.red(status);
  return status;
}

export function formatMedication(med) {
  const name = med.medicationCodeableConcept?.text || med.medicationCodeableConcept?.coding?.[0]?.display || med.medicationReference?.display || 'Unknown';
  const dose = med.dosageInstruction?.[0]?.text || '';
  return dose ? name + ' - ' + dose : name;
}

export function formatLabValue(obs) {
  let value = obs.valueString || (obs.valueQuantity?.value !== undefined ? obs.valueQuantity.value + ' ' + (obs.valueQuantity.unit || '') : 'N/A');
  value = value.trim();
  const interp = obs.interpretation?.[0]?.coding?.[0]?.code?.toUpperCase();
  if (interp === 'N' || interp === 'NORMAL') value = chalk.green(value);
  else if (['L', 'H', 'LOW', 'HIGH'].includes(interp || '')) value = chalk.yellow(value);
  else if (['LL', 'HH', 'CRITICAL'].includes(interp || '')) value = chalk.red.bold(value);
  const range = obs.referenceRange?.[0];
  if (range?.text) return value + ' (' + chalk.gray(range.text) + ')';
  if (range?.low?.value !== undefined && range?.high?.value !== undefined) {
    return value + ' (' + chalk.gray(range.low.value + '-' + range.high.value) + ')';
  }
  return value;
}

export function header(text) {
  return chalk.cyan.bold(text) + '\n' + chalk.gray('─'.repeat(text.length));
}

export function separator(width = 60) {
  return chalk.gray('─'.repeat(width));
}

export default { formatName, formatPatientName, formatPatientSummary, calculateAge, formatDate, formatTime, formatStatus, formatMedication, formatLabValue, header, separator };
