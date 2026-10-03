import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from './AppText';
import { colors } from '../theme/colors';

export function Accordion({ items }) {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <View style={styles.container}>
      {items.map((item, index) => {
        const open = openIndex === index;
        return (
          <View key={item.question} style={[styles.item, index > 0 && styles.itemDivider]}>
            <TouchableOpacity
              onPress={() => setOpenIndex(open ? null : index)}
              style={styles.trigger}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
            >
              <Text style={styles.question}>{item.question}</Text>
              <Text style={styles.chevron}>{open ? '−' : '+'}</Text>
            </TouchableOpacity>
            {open ? <Text style={styles.answer}>{item.answer}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    shadowColor: '#11181A',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
    paddingHorizontal: 16,
  },
  item: {
    paddingVertical: 4,
  },
  itemDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  trigger: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  question: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  chevron: {
    color: colors.green,
    fontSize: 20,
    fontWeight: '600',
  },
  answer: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    paddingBottom: 14,
  },
});
