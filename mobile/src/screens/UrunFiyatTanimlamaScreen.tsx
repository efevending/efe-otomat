import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, RefreshControl } from 'react-native';
import api from '../api/client';

export default function UrunFiyatTanimlamaScreen() {
  const [firms, setFirms] = useState<any[]>([]);
  const [selectedFirm, setSelectedFirm] = useState<any>(null);
  const [prices, setPrices] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadFirms(); }, []);

  const loadFirms = async () => {
    try {
      const res = await api.get('/firms');
      setFirms(res.data);
    } catch {
      Alert.alert('Hata', 'Firmalar yüklenemedi');
    }
  };

  const loadPrices = async (firmId: number) => {
    try {
      const res = await api.get(`/prices/firm/${firmId}`);
      setPrices(res.data);
    } catch {
      Alert.alert('Hata', 'Fiyatlar yüklenemedi');
    }
  };

  const handleSelectFirm = (f: any) => {
    setSelectedFirm(f);
    loadPrices(f.id);
  };

  const handlePriceChange = (productId: number, value: string) => {
    setPrices(prices.map(p => p.product_id === productId ? { ...p, sale_price: value } : p));
  };

  const handleSave = async () => {
    if (!selectedFirm) return;
    try {
      const items = prices.filter(p => p.sale_price).map(p => ({
        product_id: p.product_id,
        sale_price: parseFloat(p.sale_price) || 0,
      }));
      await api.post(`/prices/firm/${selectedFirm.id}`, { items });
      Alert.alert('Başarılı', 'Fiyatlar kaydedildi');
    } catch (err: any) {
      Alert.alert('Hata', err.response?.data?.error || 'Kayıt başarısız');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFirms();
    if (selectedFirm) await loadPrices(selectedFirm.id);
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {!selectedFirm ? (
        <FlatList
          data={firms}
          keyExtractor={item => item.id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.firmCard} onPress={() => handleSelectFirm(item)}>
              <Text style={styles.firmName}>{item.firma_adi}</Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Firma bulunamadı</Text>}
        />
      ) : (
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedFirm(null)}>
            <Text style={styles.backText}>← Firmalara Dön</Text>
          </TouchableOpacity>
          <Text style={styles.firmTitle}>{selectedFirm.firma_adi} - Fiyat Listesi</Text>
          <FlatList
            data={prices}
            keyExtractor={item => item.product_id?.toString()}
            renderItem={({ item }) => (
              <View style={styles.priceRow}>
                <Text style={styles.productName} numberOfLines={1}>{item.product_name}</Text>
                <TextInput
                  style={styles.priceInput}
                  value={item.sale_price?.toString() || ''}
                  onChangeText={v => handlePriceChange(item.product_id, v)}
                  keyboardType="numeric"
                  placeholder="0.00"
                />
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>Ürün bulunamadı</Text>}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveText}>FİYATLARI KAYDET</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  firmCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 3, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#f3f4f6' },
  firmName: { fontSize: 15, fontWeight: '500', color: '#1f2937' },
  arrow: { fontSize: 22, color: '#9ca3af' },
  backBtn: { padding: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backText: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
  firmTitle: { fontSize: 16, fontWeight: 'bold', padding: 14, color: '#111827' },
  priceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 2, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#f3f4f6' },
  productName: { flex: 1, fontSize: 13, color: '#1f2937' },
  priceInput: { width: 80, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, padding: 8, textAlign: 'center', fontSize: 14, backgroundColor: '#f9fafb' },
  saveBtn: { margin: 12, backgroundColor: '#16a34a', borderRadius: 10, padding: 16, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  empty: { textAlign: 'center', color: '#9ca3af', padding: 40 },
});
