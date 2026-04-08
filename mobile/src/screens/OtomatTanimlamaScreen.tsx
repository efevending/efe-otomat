import React from 'react';
import CrudListScreen from '../components/CrudListScreen';

export default function OtomatTanimlamaScreen() {
  return (
    <CrudListScreen
      title="Otomat Tanımlama"
      endpoint="/machines"
      columns={[
        { key: 'machine_no', label: 'Otomat No', flex: 1 },
        { key: 'name', label: 'Otomat Adı', flex: 2 },
        { key: 'status', label: 'Durum', flex: 1 },
      ]}
      fields={[
        { key: 'machine_no', label: 'Otomat No', required: true },
        { key: 'name', label: 'Otomat Adı', required: true },
        { key: 'location_description', label: 'Konum' },
        { key: 'address', label: 'Adres' },
      ]}
    />
  );
}
