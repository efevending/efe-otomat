import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import api from '../api/client';

export default function OtomatUrunHaritalariScreen() {
  const [machines, setMachines] = useState<any[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [spirals, setSpirals] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadMachines(); }, []);

  const loadMachines = async () => {
    try {
      const res = await api.get('/machines');
      setMachines(res.data);
    } catch {
      Alert.alert('Hata', 'Otomatlar yüklenemedi');
    }
  };

  const loadSpirals = async (machineId: number) => {
    try {
      const res = await api.get(`/product-maps/${machineId}`);
      setSpirals(res.data);
    } catch {
      Alert.alert('Hata', 'Spiral haritası yüklenemedi');
    }
  };

  const handleSelectMachine = (m: any) => {
    setSelectedMachine(m);
    loadSpirals(m.id);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMachines();
    if (selectedMachine) await loadSpirals(selectedMachine.id);
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {!selectedMachine ? (
        <FlatList
          data={machines}
          keyExtractor={item => item.id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.machineCard} onPress={() => handleSelectMachine(item)}>
              <Text style={styles.machineNo}>{item.machine_no}</Text>
              <Text style={styles.machineName}>{item.name}</Text>
              <Text style={styles.machineArrow}>›</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Otomat bulunamadı</Text>}
        />
      ) : (
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedMachine(null)}>
            <Text style={styles.backText}>← Otomatlara Dön</Text>
          </TouchableOpacity>
          <Text style={styles.machineTitle}>{selectedMachine.name} - Spiral Haritası</Text>
          <FlatList
            data={spirals}
            keyExtractor={item => item.spiral_number?.toString()}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => (
              <View style={[styles.spiralRow, item.product_name ? styles.spiralFull : styles.spiralEmpty]}>
                <Text style={styles.spiralNo}>S{item.spiral_number}</Text>
                <Text style={styles.spiralProduct}>{item.product_name || 'Boş'}</Text>
                <Text style={styles.spiralCapacity}>{item.capacity}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>Spiral haritası boş</Text>}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  machineCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 3, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#f3f4f6' },
  machineNo: { fontSize: 14, fontWeight: 'bold', color: '#2563eb', width: 70 },
  machineName: { flex: 1, fontSize: 14, color: '#1f2937' },
  machineArrow: { fontSize: 22, color: '#9ca3af' },
  backBtn: { padding: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backText: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
  machineTitle: { fontSize: 16, fontWeight: 'bold', padding: 14, color: '#111827' },
  spiralRow: { flexDirection: 'row', marginHorizontal: 12, marginVertical: 2, padding: 12, borderRadius: 8, alignItems: 'center' },
  spiralFull: { backgroundColor: '#dcfce7' },
  spiralEmpty: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  spiralNo: { width: 50, fontSize: 13, fontWeight: 'bold', color: '#374151' },
  spiralProduct: { flex: 1, fontSize: 13, color: '#1f2937' },
  spiralCapacity: { fontSize: 12, color: '#6b7280', width: 30, textAlign: 'right' },
  empty: { textAlign: 'center', color: '#9ca3af', padding: 40 },
});
