import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export function formatLocalYMD(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseYMDToDate(s, fallback = new Date()) {
  const fb = fallback instanceof Date && !Number.isNaN(fallback.getTime()) ? fallback : new Date();
  if (!s || typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return new Date(fb.getTime());
  const [y, m, d] = s.trim().split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return new Date(fb.getTime());
  return dt;
}

export function formatLocalYM(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function parseYMToDate(s, fallback = new Date()) {
  const fb = fallback instanceof Date && !Number.isNaN(fallback.getTime()) ? fallback : new Date();
  if (!s || typeof s !== 'string' || !/^\d{4}-\d{2}$/.test(s.trim())) return new Date(fb.getFullYear(), fb.getMonth(), 1);
  const [y, m] = s.trim().split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, 1);
  if (Number.isNaN(dt.getTime())) return new Date(fb.getFullYear(), fb.getMonth(), 1);
  return dt;
}

/**
 * Full calendar day; value / onChangeValue use YYYY-MM-DD (local calendar).
 */
export default function DatePickerField({
  label,
  value,
  onChangeValue,
  minimumDate,
  maximumDate,
  placeholder = 'Select date',
}) {
  const [androidOpen, setAndroidOpen] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);
  const [iosTemp, setIosTemp] = useState(() => parseYMDToDate(value));

  const baseDate = useMemo(() => parseYMDToDate(value), [value]);

  const summary = value && /^\d{4}-\d{2}-\d{2}$/.test(String(value).trim()) ? value.trim() : null;

  const open = () => {
    setIosTemp(parseYMDToDate(value));
    if (Platform.OS === 'android') {
      setAndroidOpen(true);
    } else {
      setIosOpen(true);
    }
  };

  const onAndroidChange = (event, selectedDate) => {
    setAndroidOpen(false);
    if (event?.type === 'dismissed') return;
    if (selectedDate) onChangeValue(formatLocalYMD(selectedDate));
  };

  const commitIos = () => {
    onChangeValue(formatLocalYMD(iosTemp));
    setIosOpen(false);
  };

  const cancelIos = () => {
    setIosTemp(baseDate);
    setIosOpen(false);
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.lbl}>{label}</Text> : null}
      <TouchableOpacity style={styles.field} onPress={open} accessibilityRole="button">
        <Text style={[styles.fieldTxt, !summary && styles.fieldPh]}>{summary || placeholder}</Text>
        <Text style={styles.chev}>▼</Text>
      </TouchableOpacity>

      {Platform.OS === 'android' && androidOpen ? (
        <DateTimePicker
          value={baseDate}
          mode="date"
          display="default"
          onChange={onAndroidChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={iosOpen} transparent animationType="fade" onRequestClose={cancelIos}>
          <Pressable style={styles.backdrop} onPress={cancelIos}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.sheetTitle}>{label || 'Select date'}</Text>
              <DateTimePicker
                value={iosTemp}
                mode="date"
                display="spinner"
                onChange={(_, d) => {
                  if (d) setIosTemp(d);
                }}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                style={styles.iosPicker}
              />
              <View style={styles.sheetActions}>
                <TouchableOpacity style={styles.sheetBtnGhost} onPress={cancelIos}>
                  <Text style={styles.sheetBtnGhostTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sheetBtn} onPress={commitIos}>
                  <Text style={styles.sheetBtnTxt}>Done</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

/**
 * Month granularity; value / onChangeValue use YYYY-MM (first day of month in picker).
 */
export function MonthPickerField({ label, value, onChangeValue, allowClear }) {
  const [androidOpen, setAndroidOpen] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);
  const [iosTemp, setIosTemp] = useState(() => parseYMToDate(value));

  const baseDate = useMemo(() => parseYMToDate(value), [value]);
  const summary = value && /^\d{4}-\d{2}$/.test(String(value).trim()) ? value.trim() : null;

  const open = () => {
    setIosTemp(parseYMToDate(value));
    if (Platform.OS === 'android') setAndroidOpen(true);
    else setIosOpen(true);
  };

  const onAndroidChange = (event, selectedDate) => {
    setAndroidOpen(false);
    if (event?.type === 'dismissed') return;
    if (selectedDate) onChangeValue(formatLocalYM(selectedDate));
  };

  const commitIos = () => {
    onChangeValue(formatLocalYM(iosTemp));
    setIosOpen(false);
  };

  const cancelIos = () => {
    setIosTemp(baseDate);
    setIosOpen(false);
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.lbl}>{label}</Text> : null}
      <View style={styles.row}>
        <TouchableOpacity style={[styles.field, styles.fieldGrow]} onPress={open} accessibilityRole="button">
          <Text style={[styles.fieldTxt, !summary && styles.fieldPh]}>{summary || 'Select month'}</Text>
          <Text style={styles.chev}>▼</Text>
        </TouchableOpacity>
        {allowClear && summary ? (
          <TouchableOpacity style={styles.clearBtn} onPress={() => onChangeValue('')} accessibilityRole="button">
            <Text style={styles.clearTxt}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {Platform.OS === 'android' && androidOpen ? (
        <DateTimePicker value={baseDate} mode="date" display="default" onChange={onAndroidChange} />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={iosOpen} transparent animationType="fade" onRequestClose={cancelIos}>
          <Pressable style={styles.backdrop} onPress={cancelIos}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.sheetTitle}>{label || 'Select month'}</Text>
              <Text style={styles.sheetHint}>Pick any day in the month to filter by that month.</Text>
              <DateTimePicker
                value={iosTemp}
                mode="date"
                display="spinner"
                onChange={(_, d) => {
                  if (d) setIosTemp(d);
                }}
                style={styles.iosPicker}
              />
              <View style={styles.sheetActions}>
                <TouchableOpacity style={styles.sheetBtnGhost} onPress={cancelIos}>
                  <Text style={styles.sheetBtnGhostTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sheetBtn} onPress={commitIos}>
                  <Text style={styles.sheetBtnTxt}>Done</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  lbl: { fontSize: 13, fontWeight: '600', color: '#3730a3', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  fieldGrow: { flex: 1 },
  fieldTxt: { fontSize: 15, color: '#111827', flex: 1 },
  fieldPh: { color: '#9ca3af' },
  chev: { fontSize: 10, color: '#6b7280', marginLeft: 8 },
  clearBtn: { paddingVertical: 10, paddingHorizontal: 12 },
  clearTxt: { fontSize: 14, fontWeight: '600', color: '#4f46e5' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#3730a3', textAlign: 'center' },
  sheetHint: { fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 4, marginBottom: 4 },
  iosPicker: { alignSelf: 'stretch' },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  sheetBtn: {
    flex: 1,
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  sheetBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  sheetBtnGhost: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  sheetBtnGhostTxt: { color: '#374151', fontWeight: '600', fontSize: 16 },
});
