import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import api from '../api/client';

interface Column {
  key: string;
  label: string;
  flex?: number;
}

interface Field {
  key: string;
  label: string;
  type?: 'text' | 'select';
  options?: { value: any; label: string }[];
  required?: boolean;
}

interface CrudListScreenProps {
  title: string;
  endpoint: string;
  columns: Column[];
  fields: Field[];
  nameField?: string;
  filterKeys?: string[];
}

export default function CrudListScreen({ title, endpoint, columns, fields, nameField = 'name', filterKeys }: CrudListScreenProps) {
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [isNew, setIsNew] = useState(true);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(endpoint);
      setItems(res.data);
    } catch (err: any) {
      Alert.alert('Hata', 'Veriler yüklenemedi');
    }
  }, [endpoint]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleNew = () => {
    setSelected(null);
    setIsNew(true);
    const empty: Record<string, any> = {};
    fields.forEach(f => { empty[f.key] = ''; });
    setForm(empty);
  };

  const handleSelect = (item: any) => {
    setSelected(item);
    setIsNew(false);
    const f: Record<string, any> = {};
    fields.forEach(field => { f[field.key] = item[field.key] ?? ''; });
    setForm(f);
  };

  const handleSave = async () => {
    const requiredField = fields.find(f => f.required && !form[f.key]?.toString().trim());
    if (requiredField) {
      Alert.alert('Hata', `${requiredField.label} zorunlu`);
      return;
    }
    try {
      if (isNew) {
        await api.post(endpoint, form);
      } else if (selected) {
        await api.put(`${endpoint}/${selected.id}`, form);
      }
      load();
      handleNew();
    } catch (err: any) {
      Alert.alert('Hata', err.response?.data?.error || 'İşlem başarısız');
    }
  };

  const handleDelete = () => {
    if (!selected) return;
    Alert.alert('Silme Onayı', 'Bu kaydı silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`${endpoint}/${selected.id}`);
            load();
            handleNew();
          } catch (err: any) {
            Alert.alert('Hata', err.response?.data?.error || 'Silinemedi');
          }
        }
      }
    ]);
  };

  const keys = filterKeys || columns.map(c => c.key);
  const filtered = items.filter(item => {
    if (!search) return true;
    const s = search.toLowerCase();
    return keys.some(k => (item[k] || '').toString().toLowerCase().includes(s));
  });

  useEffect(() => { handleNew(); }, []);

  return (
    <View style={styles.container}>
      {/* Search */}
      <TextInput
        style={styles.search}
        placeholder="Ara..."
        value={search}
        onChangeText={setSearch}
      />

      {/* List */}
      <View style={styles.listContainer}>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id?.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.row, selected?.id === item.id && styles.selectedRow]}
              onPress={() => handleSelect(item)}
            >
              {columns.map(col => (
                <Text key={col.key} style={[styles.cell, { flex: col.flex || 1 }]} numberOfLines={1}>
                  {item[col.key] ?? ''}
                </Text>
              ))}
            </TouchableOpacity>
          )}
          ListHeaderComponent={
            <View style={styles.headerRow}>
              {columns.map(col => (
                <Text key={col.key} style={[styles.headerCell, { flex: col.flex || 1 }]}>{col.label}</Text>
              ))}
            </View>
          }
          ListEmptyComponent={<Text style={styles.empty}>Kayıt bulunamadı</Text>}
          stickyHeaderIndices={[0]}
        />
      </View>

      {/* Form */}
      <View style={styles.form}>
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={handleNew} style={[styles.modeBtn, isNew && styles.modeBtnActive]}>
            <Text style={[styles.modeBtnText, isNew && styles.modeBtnTextActive]}>Yeni</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeBtn, !isNew && styles.modeBtnActive]}>
            <Text style={[styles.modeBtnText, !isNew && styles.modeBtnTextActive]}>Güncelle</Text>
          </TouchableOpacity>
        </View>

        {fields.map(field => (
          <View key={field.key} style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <TextInput
              style={styles.fieldInput}
              value={form[field.key]?.toString() || ''}
              onChangeText={v => setForm({ ...form, [field.key]: v })}
              placeholder={field.label}
            />
          </View>
        ))}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>{isNew ? 'KAYDET' : 'GÜNCELLE'}</Text>
          </TouchableOpacity>
          {!isNew && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>SİL</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  search: { margin: 12, padding: 12, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', fontSize: 14 },
  listContainer: { flex: 1, marginHorizontal: 12 },
  headerRow: { flexDirection: 'row', backgroundColor: '#fef3c7', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginBottom: 4 },
  headerCell: { fontSize: 11, fontWeight: 'bold', color: '#374151' },
  row: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8, marginBottom: 2, borderWidth: 1, borderColor: '#f3f4f6' },
  selectedRow: { backgroundColor: '#dbeafe', borderColor: '#93c5fd' },
  cell: { fontSize: 13, color: '#1f2937' },
  empty: { textAlign: 'center', color: '#9ca3af', padding: 30 },
  form: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', padding: 16 },
  formHeader: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6, backgroundColor: '#f3f4f6' },
  modeBtnActive: { backgroundColor: '#2563eb' },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  modeBtnTextActive: { color: '#fff' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  fieldLabel: { width: 100, fontSize: 12, fontWeight: '600', color: '#4b5563' },
  fieldInput: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: '#f9fafb' },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  saveBtn: { flex: 1, backgroundColor: '#16a34a', borderRadius: 10, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  deleteBtn: { backgroundColor: '#ef4444', borderRadius: 10, padding: 14, paddingHorizontal: 24, alignItems: 'center' },
  deleteBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
