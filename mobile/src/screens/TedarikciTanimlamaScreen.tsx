import React from 'react';
import CrudListScreen from '../components/CrudListScreen';

export default function TedarikciTanimlamaScreen() {
  return (
    <CrudListScreen
      title="Tedarikçi Tanımlama"
      endpoint="/suppliers"
      columns={[
        { key: 'name', label: 'Tedarikçi Adı', flex: 2 },
        { key: 'phone', label: 'Telefon', flex: 1 },
        { key: 'tax_no', label: 'Vergi No', flex: 1 },
      ]}
      fields={[
        { key: 'name', label: 'Tedarikçi Adı', required: true },
        { key: 'address', label: 'Adres' },
        { key: 'phone', label: 'Telefon' },
        { key: 'tax_no', label: 'Vergi No' },
        { key: 'tax_office', label: 'Vergi Dairesi' },
        { key: 'notes', label: 'Not' },
      ]}
    />
  );
}
