import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import api from '../api/client';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Bekliyor', color: '#f59e0b' },
  approved: { label: 'Onaylandı', color: '#3b82f6' },
  completed: { label: 'Tamamlandı', color: '#16a34a' },
  rejected: { label: 'Reddedildi', color: '#ef4444' },
};

export default function DepoTransferScreen() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/transfers');
      setTransfers(res.data);
    } catch {
      Alert.alert('Hata', 'Transferler yüklenemedi');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleSelect = async (t: any) => {
    try {
      const res = await api.get(`/transfers/${t.id}`);
      setSelected(res.data);
    } catch {
      setSelected(t);
    }
  };

  const handleAction = async (action: string) => {
    if (!selected) return;
    const messages: Record<string, string> = {
      approve: 'Transfer onaylansın mı?',
      reject: 'Transfer reddedilsin mi?',
      complete: 'Transfer tamamlansın mı? Stoklar güncellenecektir.',
    };

    Alert.alert('Onay', messages[action], [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Evet', onPress: async () => {
          try {
            await api.post(`/transfers/${selected.id}/${action}`);
            load();
            setSelected(null);
          } catch (err: any) {
            Alert.alert('Hata', err.response?.data?.error || 'İşlem başarısız');
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={transfers}
        keyExtractor={item => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => {
          const s = STATUS_LABELS[item.status] || { label: item.status, color: '#6b7280' };
          return (
            <TouchableOpacity
              style={[styles.card, selected?.id === item.id && styles.selectedCard]}
              onPress={() => handleSelect(item)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardId}>#{item.id}</Text>
                <View style={[styles.badge, { backgroundColor: s.color + '20' }]}>
                  <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
                </View>
              </View>
              <Text style={styles.cardFrom}>📤 {item.from_warehouse_name}</Text>
              <Text style={styles.cardTo}>📥 {item.to_warehouse_name}</Text>
              <Text style={styles.cardMeta}>{item.requested_by_name} • {item.created_at}</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Henüz transfer yok</Text>}
      />

      {selected && (
        <View style={styles.detail}>
          <Text style={styles.detailTitle}>Transfer #{selected.id}</Text>
          {selected.items?.map((item: any, i: number) => (
            <Text key={i} style={styles.detailItem}>• {item.product_name} x{item.quantity}</Text>
          ))}
          {selected.notes ? <Text style={styles.detailNotes}>Not: {selected.notes}</Text> : null}

          <View style={styles.actions}>
            {selected.status === 'pending' && (
              <>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2563eb' }]} onPress={() => handleAction('approve')}>
                  <Text style={styles.actionText}>ONAYLA</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f59e0b' }]} onPress={() => handleAction('reject')}>
                  <Text style={styles.actionText}>REDDET</Text>
                </TouchableOpacity>
              </>
            )}
            {selected.status === 'approved' && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#16a34a' }]} onPress={() => handleAction('complete')}>
                <Text style={styles.actionText}>TAMAMLA</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  card: { backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 4, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#f3f4f6' },
  selectedCard: { backgroundColor: '#dbeafe', borderColor: '#93c5fd' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardId: { fontSize: 14, fontWeight: 'bold', color: '#374151' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cardFrom: { fontSize: 13, color: '#dc2626', marginBottom: 2 },
  cardTo: { fontSize: 13, color: '#16a34a', marginBottom: 4 },
  cardMeta: { fontSize: 11, color: '#9ca3af' },
  empty: { textAlign: 'center', color: '#9ca3af', padding: 40 },
  detail: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', padding: 16 },
  detailTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#111827' },
  detailItem: { fontSize: 13, color: '#374151', marginBottom: 2 },
  detailNotes: { fontSize: 12, color: '#6b7280', marginTop: 6, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
});
