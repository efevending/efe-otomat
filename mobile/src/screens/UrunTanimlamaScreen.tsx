import React from 'react';
import CrudListScreen from '../components/CrudListScreen';

export default function UrunTanimlamaScreen() {
  return (
    <CrudListScreen
      title="Ürün Tanımlama"
      endpoint="/products"
      columns={[
        { key: 'name', label: 'Ürün Adı', flex: 2 },
        { key: 'barcode', label: 'Barkod', flex: 1 },
        { key: 'sale_price', label: 'Satış', flex: 1 },
      ]}
      fields={[
        { key: 'name', label: 'Ürün Adı', required: true },
        { key: 'barcode', label: 'Barkod' },
        { key: 'cost_price', label: 'Alış Fiyatı' },
        { key: 'sale_price', label: 'Satış Fiyatı' },
        { key: 'category', label: 'Kategori' },
      ]}
    />
  );
}
