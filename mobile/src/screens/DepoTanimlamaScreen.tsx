import React from 'react';
import CrudListScreen from '../components/CrudListScreen';

const typeLabels: Record<string, string> = {
  sanal: 'HAREKETLİ DEPO',
  sabit: 'SABİT DEPO',
};

export default function DepoTanimlamaScreen() {
  return (
    <CrudListScreen
      title="Depo Tanımlama"
      endpoint="/warehouses"
      columns={[
        { key: 'name', label: 'Depo Adı', flex: 2 },
        { key: 'type', label: 'Tip', flex: 1 },
        { key: 'special_code', label: 'Özel Kod', flex: 1 },
      ]}
      fields={[
        { key: 'name', label: 'Depo Adı', required: true },
        { key: 'type', label: 'Depo Tipi' },
        { key: 'special_code', label: 'Özel Kod' },
      ]}
    />
  );
}
