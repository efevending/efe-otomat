import React from 'react';
import CrudListScreen from '../components/CrudListScreen';

export default function PersonelTanimlamaScreen() {
  return (
    <CrudListScreen
      title="Personel Tanımlama"
      endpoint="/users"
      columns={[
        { key: 'full_name', label: 'Ad Soyad', flex: 2 },
        { key: 'username', label: 'Kullanıcı', flex: 1 },
        { key: 'role', label: 'Rol', flex: 1 },
      ]}
      fields={[
        { key: 'full_name', label: 'Ad Soyad', required: true },
        { key: 'username', label: 'Kullanıcı Adı', required: true },
        { key: 'phone', label: 'Telefon' },
        { key: 'address', label: 'Adres' },
      ]}
    />
  );
}
