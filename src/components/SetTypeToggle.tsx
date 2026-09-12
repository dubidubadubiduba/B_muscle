import React from 'react';
import { SegmentedButtons } from 'react-native-paper';
import type { SetType } from '../types/database';

interface Props {
  value: SetType;
  onChange: (value: SetType) => void;
}

const OPTIONS: { value: SetType; label: string }[] = [
  { value: 'normal', label: '일반' },
  { value: 'drop', label: '드롭' },
  { value: 'assisted', label: '보조' },
];

export default function SetTypeToggle({ value, onChange }: Props) {
  return (
    <SegmentedButtons value={value} onValueChange={(v) => onChange(v as SetType)} buttons={OPTIONS} />
  );
}
