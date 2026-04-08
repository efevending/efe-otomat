import React from 'react';
import CrudListScreen from '../components/CrudListScreen';

export default function FirmaTanimlamaScreen() {
  return (
    <CrudListScreen
      title="Firma Tanımlama"
      endpoint="/firms"
      columns={[
        { key: 'firma_adi', label: 'Firma Adı', flex: 2 },
        { key: 'telefon', label: 'Telefon', flex: 1 },
        { key: 'vergi_no', label: 'Vergi No', flex: 1 },
      ]}
      fields={[
        { key: 'firma_adi', label: 'Firma Adı', required: true },
        { key: 'unvan', label: 'Ünvan' },
        { key: 'adres', label: 'Adres' },
        { key: 'telefon', label: 'Telefon' },
        { key: 'vergi_no', label: 'Vergi No' },
      ]}
      nameField="firma_adi"
    />
  );
}
