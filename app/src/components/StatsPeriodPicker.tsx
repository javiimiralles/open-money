import { StyleSheet, View } from 'react-native';

import { DateField } from '@/components/DateField';
import { SegmentedControl, type SegmentedOption } from '@/components/SegmentedControl';
import type { StatsPeriodControl } from '@/hooks/use-stats';
import { spacing } from '@/theme/tokens';
import type { StatsPeriod } from '@/utils/stats';

export interface StatsPeriodPickerProps extends StatsPeriodControl {
  options: readonly SegmentedOption<StatsPeriod>[];
  accessibilityLabel: string;
}

export function StatsPeriodPicker({
  options,
  accessibilityLabel,
  period,
  onPeriodChange,
  customRange,
  onCustomRangeChange,
}: StatsPeriodPickerProps) {
  return (
    <>
      <SegmentedControl
        options={options}
        value={period}
        onChange={onPeriodChange}
        accessibilityLabel={accessibilityLabel}
      />
      {period === 'custom' ? (
        <View style={styles.datesRow}>
          <View style={styles.datesColumn}>
            <DateField
              label="Desde"
              value={customRange.fromDate}
              clearable={false}
              onChange={(iso) => iso && onCustomRangeChange({ ...customRange, fromDate: iso })}
            />
          </View>
          <View style={styles.datesColumn}>
            <DateField
              label="Hasta"
              value={customRange.toDate}
              clearable={false}
              onChange={(iso) => iso && onCustomRangeChange({ ...customRange, toDate: iso })}
            />
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  datesRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  datesColumn: {
    flex: 1,
  },
});
