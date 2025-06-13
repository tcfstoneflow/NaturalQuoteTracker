// Script to export current products as CSV for bulk editing
const fs = require('fs');

// Mock data representing the current 7 bundles from the API response
const products = [
  {
    id: 29,
    bundleId: "Alaska White",
    name: "Alaska White Granite",
    description: "Premium white granite with subtle veining",
    supplier: "Stone World",
    category: "Granite",
    grade: "Premium",
    thickness: "3cm",
    finish: "Polished",
    price: "85.00",
    unit: "sq ft",
    stockQuantity: 150,
    slabLength: "130",
    slabWidth: "75",
    location: "Warehouse A",
    imageUrl: null,
    barcodes: ["AW001", "AW002"]
  },
  // Add other products here based on actual API data
];

// Convert to CSV format with headers matching Stone Slab Bundles format
const headers = [
  'id', 'bundleId', 'name', 'description', 'supplier', 'category', 
  'grade', 'thickness', 'finish', 'price', 'unit', 'stockQuantity',
  'slabLength', 'slabWidth', 'location', 'imageUrl', 'barcodes'
];

const csvContent = [
  headers.join(','),
  ...products.map(product => [
    product.id,
    `"${product.bundleId}"`,
    `"${product.name}"`,
    `"${product.description || ''}"`,
    `"${product.supplier}"`,
    `"${product.category}"`,
    `"${product.grade}"`,
    `"${product.thickness}"`,
    `"${product.finish}"`,
    product.price,
    `"${product.unit}"`,
    product.stockQuantity,
    product.slabLength || '',
    product.slabWidth || '',
    `"${product.location || ''}"`,
    `"${product.imageUrl || ''}"`,
    `"${(product.barcodes || []).join(';')}"`
  ].join(','))
].join('\n');

fs.writeFileSync('current_bundles_for_editing.csv', csvContent);
console.log('CSV export created: current_bundles_for_editing.csv');