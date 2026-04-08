import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const menuItems = [
  { label: 'Firma Tanımlama', screen: 'FirmaTanimlama', color: '#3b82f6' },
  { label: 'Personel Tanımlama', screen: 'PersonelTanimlama', color: '#3b82f6' },
  { label: 'Otomat Tanımlama', screen: 'OtomatTanimlama', color: '#3b82f6' },
  { label: 'Ürün Tanımlama', screen: 'UrunTanimlama', color: '#3b82f6' },
  { label: 'Tedarikçi Tanımlama', screen: 'TedarikciTanimlama', color: '#3b82f6' },
  { label: 'Depo Tanımlama', screen: 'DepoTanimlama', color: '#3b82f6' },
  { label: 'Depo Transfer İşlemleri', screen: 'DepoTransfer', color: '#059669' },
  { label: 'Otomat Ürün Haritaları', screen: 'OtomatUrunHaritalari', color: '#059669' },
  { label: 'Ürün Fiyat Tanımlama', screen: 'UrunFiyatTanimlama', color: '#059669' },
];

export default function DashboardScreen({ navigation }: any) {
  const { user, logout } = useAuth();

  const roleLabels: Record<string, string> = {
    admin: 'Yönetici',
    warehouse_manager: 'Depo Sorumlusu',
    field_worker: 'Saha Çalışanı',
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Hoş Geldiniz,</Text>
          <Text style={styles.name}>{user?.full_name}</Text>
          <Text style={styles.role}>{roleLabels[user?.role || '']}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Çıkış</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Modüller</Text>

      {menuItems.map((item) => (
        <TouchableOpacity
          key={item.screen}
          style={[styles.menuItem, { borderLeftColor: item.color }]}
          onPress={() => navigation.navigate(item.screen)}
        >
          <Text style={styles.menuLabel}>{item.label}</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  welcome: { fontSize: 14, color: '#6b7280' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  role: { fontSize: 12, color: '#2563eb', marginTop: 2 },
  logoutBtn: { backgroundColor: '#fee2e2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  logoutText: { color: '#dc2626', fontWeight: '600', fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151', padding: 16, paddingBottom: 8 },
  menuItem: { backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 4, padding: 16, borderRadius: 10, borderLeftWidth: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  menuLabel: { fontSize: 15, fontWeight: '500', color: '#1f2937' },
  arrow: { fontSize: 22, color: '#9ca3af' },
});
