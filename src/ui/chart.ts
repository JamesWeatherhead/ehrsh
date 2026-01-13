import asciichart from 'asciichart';
import chalk from 'chalk';
import { formatDate } from './format.js';

export function renderLabTrendChart(observations: any[], options: any = {}) {
  const validObs = observations
    .filter(o => o.effectiveDateTime && o.valueQuantity?.value !== undefined)
    .map(o => ({ date: o.effectiveDateTime, value: o.valueQuantity.value }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (validObs.length < 2) {
    return chalk.yellow('Not enough data points to render chart (need at least 2).');
  }

  const values = validObs.map(d => d.value);
  const labName = observations[0]?.code?.text || observations[0]?.code?.coding?.[0]?.display || 'Lab Value';
  const unit = observations[0]?.valueQuantity?.unit || '';

  const chartConfig = {
    height: options.height || 10,
    colors: [asciichart.green],
    format: (x) => x.toFixed(1).padStart(8),
  };

  const chart = asciichart.plot(values, chartConfig);
  
  const startDate = formatDate(validObs[0].date, { short: true });
  const endDate = formatDate(validObs[validObs.length - 1].date, { short: true });
  const minVal = Math.min(...values).toFixed(1);
  const maxVal = Math.max(...values).toFixed(1);
  const avgVal = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);

  return [
    chalk.cyan.bold(labName + (unit ? ' (' + unit + ')' : '') + ' - Trend'),
    chalk.gray('─'.repeat(50)),
    chart,
    chalk.gray('─'.repeat(50)),
    chalk.gray('Period: ') + startDate + ' to ' + endDate + ' (' + validObs.length + ' readings)',
    chalk.gray('Range: ') + minVal + ' - ' + maxVal + ' | ' + chalk.gray('Avg: ') + avgVal,
  ].join('\n');
}

export default { renderLabTrendChart };
