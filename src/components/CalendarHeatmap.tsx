import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

interface Props {
  month: Date;
  counts: Record<string, number>;
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function colorForCount(count: number) {
  if (count <= 0) return '#e0e0e0';
  if (count <= 2) return '#a5d6a7';
  if (count <= 5) return '#66bb6a';
  return '#2e7d32';
}

export default function CalendarHeatmap({ month, counts }: Props) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();

  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, monthIndex, i + 1)),
  ];

  return (
    <View>
      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} variant="bodySmall" style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((date, index) => (
          <View
            key={index}
            style={[
              styles.cell,
              { backgroundColor: date ? colorForCount(counts[toDateKey(date)] ?? 0) : 'transparent' },
            ]}
          >
            {date && (
              <Text variant="bodySmall" style={styles.cellLabel}>
                {date.getDate()}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekdayLabel: { width: `${100 / 7}%`, textAlign: 'center', color: '#888' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    marginBottom: 2,
  },
  cellLabel: { fontSize: 11 },
});
