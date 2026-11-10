import React, {useState} from 'react';
import {ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const AssignmentField = ({label, required, items, value, onValueChange, disabled, loading}) => {
  const [open, setOpen] = useState(false);
  const selected = items.find(item => item.value === value);
  const unavailable = disabled || loading;
  const select = nextValue => {
    setOpen(false);
    onValueChange(nextValue);
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}{required && <Text style={styles.required}> *</Text>}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Select ${label}`}
        accessibilityState={{disabled: !!unavailable, expanded: open}}
        disabled={unavailable}
        onPress={() => setOpen(true)}
        style={[styles.input, unavailable && styles.disabled]}>
        <Text style={selected ? styles.pickerText : styles.placeholder} numberOfLines={1}>
          {selected ? selected.label : `Select ${label}`}
        </Text>
        {loading ? <ActivityIndicator size="small" color="#07583C" /> : <Icon name="chevron-down" size={18} color="#75827A" />}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close selection" accessibilityRole="button" onPress={() => setOpen(false)} />
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Select {label}</Text>
            <FlatList
              data={items}
              keyExtractor={item => String(item.value)}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={!required && value != null ? <Pressable accessibilityRole="button" onPress={() => select(null)} style={styles.option}><Text style={styles.optionText}>All</Text></Pressable> : null}
              ListEmptyComponent={<Text style={styles.empty}>No options available.</Text>}
              renderItem={({item}) => (
                <Pressable accessibilityRole="button" accessibilityState={{selected: item.value === value}} onPress={() => select(item.value)} style={styles.option}>
                  <Text style={styles.optionText}>{item.label}</Text>
                  {item.value === value && <Icon name="checkmark" size={20} color="#07583C" />}
                </Pressable>
              )}
            />
            <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.close}><Text style={styles.closeText}>Cancel</Text></Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};
const styles = StyleSheet.create({
  field: {marginBottom: 16}, label: {color: '#344D40', fontSize: 13, fontWeight: '700', marginBottom: 8},
  required: {color: '#DC5959'}, input: {minHeight: 46, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D6E3DA', backgroundColor: '#FAFCFA', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8},
  disabled: {opacity: 0.6}, pickerText: {color: '#153C2D', fontSize: 13, flex: 1}, placeholder: {color: '#89978F', fontSize: 13, flex: 1},
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24},
  dialog: {backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, maxHeight: '70%'}, dialogTitle: {color: '#153C2D', fontWeight: '700', fontSize: 17, marginBottom: 12},
  option: {minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#DFEEE5'}, optionText: {color: '#344D40', fontSize: 14, flex: 1}, empty: {color: '#718078', paddingVertical: 16}, close: {alignSelf: 'flex-end', paddingTop: 16, paddingHorizontal: 4}, closeText: {color: '#07583C', fontWeight: '700'},
});
export default AssignmentField;
