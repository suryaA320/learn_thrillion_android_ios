import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function KeyboardDismissBar({ visible, onDismiss }) {
  if (!visible) return null;

  return (
    <View style={styles.bar}>
      <TouchableOpacity
        style={styles.btn}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Hide keyboard"
      >
        <Text style={styles.btnText}>Hide keyboard</Text>
        <Text style={styles.chevron}>⌄</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
  },
  chevron: {
    fontSize: 16,
    color: '#4f46e5',
    marginTop: -2,
  },
});
