import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { useParentPortal } from '../context/ParentPortalContext';

function childLabel(c) {
  const name = [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || 'Student';
  const meta = [c.class_name, c.section_name].filter(Boolean).join(' · ');
  return meta ? `${name} (${meta})` : name;
}

export default function ParentChildPicker() {
  const { childrenList, selectedStudentId, setSelectedStudentId, loading, error } =
    useParentPortal();

  const items = useMemo(
    () =>
      childrenList.map((c) => ({
        label: childLabel(c),
        value: String(c.id),
      })),
    [childrenList]
  );

  if (loading) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>Select child</Text>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#4f46e5" />
          <Text style={styles.loadingText}>Loading linked children…</Text>
        </View>
      </View>
    );
  }

  if (error && childrenList.length === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>Select child</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (childrenList.length === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>Select child</Text>
        <Text style={styles.mutedText}>No students linked to your parent account yet.</Text>
      </View>
    );
  }

  if (childrenList.length === 1) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>Viewing</Text>
        <Text style={styles.singleName}>{childLabel(childrenList[0])}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Select child</Text>
      <View style={styles.dropdownHost}>
        <Dropdown
          style={styles.dropdown}
          placeholderStyle={styles.placeholder}
          selectedTextStyle={styles.selectedText}
          containerStyle={styles.dropdownContainer}
          itemTextStyle={styles.itemText}
          activeColor="#e0e7ff"
          data={items}
          labelField="label"
          valueField="value"
          placeholder="Choose a child"
          value={selectedStudentId || null}
          maxHeight={280}
          onChange={(item) => {
            if (item?.value) {
              setSelectedStudentId(String(item.value));
            }
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    zIndex: 50,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdownHost: {
    zIndex: 100,
    elevation: 8,
  },
  dropdown: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#a5b4fc',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 12,
  },
  dropdownContainer: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    marginTop: 4,
  },
  placeholder: {
    fontSize: 15,
    color: '#64748b',
  },
  selectedText: {
    fontSize: 15,
    color: '#3730a3',
    fontWeight: '600',
  },
  itemText: {
    fontSize: 14,
    color: '#3730a3',
  },
  singleName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3730a3',
    lineHeight: 22,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  mutedText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#b45309',
    lineHeight: 20,
  },
});
