import { colors } from '../theme/colors';

export const QUEUE_REPORT_OPTIONS = [
  { value: 'NO_QUEUE', label: 'No queue' },
  { value: 'WAIT_5_10', label: '5-10 min' },
  { value: 'WAIT_10_20', label: '10-20 min' },
  { value: 'WAIT_20_30', label: '20-30 min' },
  { value: 'WAIT_30_PLUS', label: '30+ min' },
];

export const CNG_REPORT_OPTIONS = [
  { value: 'CNG_UNAVAILABLE', label: 'Unavailable' },
  { value: 'CNG_LOW_PRESSURE', label: 'Low pressure' },
  { value: 'CNG_NORMAL_PRESSURE', label: 'Normal pressure' },
  { value: 'CNG_GOOD_PRESSURE', label: 'Good pressure' },
];

const QUEUE_COLOR_BY_VALUE = {
  NO_QUEUE: colors.green,
  WAIT_5_10: colors.green,
  WAIT_10_20: colors.orange,
  WAIT_20_30: colors.orange,
  WAIT_30_PLUS: colors.error,
  CNG_UNAVAILABLE: colors.error,
  CNG_LOW_PRESSURE: colors.orange,
  CNG_NORMAL_PRESSURE: colors.green,
  CNG_GOOD_PRESSURE: colors.green,
};

export function queueSignalColor(value) {
  return QUEUE_COLOR_BY_VALUE[value] || colors.textMuted;
}
