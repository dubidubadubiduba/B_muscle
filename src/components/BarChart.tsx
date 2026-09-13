import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

interface BarChartItem {
  label: string;
  value: number;
}

interface Props {
  data: BarChartItem[];
  unit?: string;
}

export default function BarChart({ data, unit = '' }: Props) {
  const maxValue = Math.max(1, ...data.map((item) => item.value));

  return (
    <View>
      {data.map((item) => (
        <View key={item.label} style={styles.row}>
          <Text variant="bodySmall" style={styles.label}>
            {item.label}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${(item.value / maxValue) * 100}%` }]} />
          </View>
          <Text variant="bodySmall" style={styles.value}>
            {item.value}
            {unit}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label: { width: 48 },
  track: { flex: 1, height: 12, backgroundColor: '#e0e0e0', borderRadius: 6, overflow: 'hidden', marginHorizontal: 8 },
  fill: { height: '100%', backgroundColor: '#43a047', borderRadius: 6 },
  value: { width: 48, textAlign: 'right' },
});
