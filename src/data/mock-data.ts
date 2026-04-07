export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  unit: string;
}

export interface Invoice {
  id: string;
  number: string;
  client: string;
  date: string;
  items: InvoiceItem[];
  total: number;
  status: "paid" | "pending" | "overdue";
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface SalesData {
  month: string;
  revenue: number;
  orders: number;
}

export const products: Product[] = [
  { id: "1", name: "Ciment Portland 50kg", category: "Matériaux", price: 8500, stock: 120, minStock: 30, unit: "sac" },
  { id: "2", name: "Fer à béton 10mm", category: "Métaux", price: 4200, stock: 8, minStock: 20, unit: "barre" },
  { id: "3", name: "Peinture Acrylique 20L", category: "Peinture", price: 18000, stock: 45, minStock: 10, unit: "bidon" },
  { id: "4", name: "Tuyau PVC 110mm", category: "Plomberie", price: 3500, stock: 60, minStock: 15, unit: "tube" },
  { id: "5", name: "Câble électrique 2.5mm²", category: "Électricité", price: 950, stock: 5, minStock: 25, unit: "mètre" },
  { id: "6", name: "Carrelage 40x40cm", category: "Revêtement", price: 6800, stock: 200, minStock: 50, unit: "m²" },
  { id: "7", name: "Plaque de plâtre BA13", category: "Matériaux", price: 5200, stock: 35, minStock: 20, unit: "plaque" },
  { id: "8", name: "Vis inox 5x50mm (boîte)", category: "Quincaillerie", price: 2800, stock: 90, minStock: 30, unit: "boîte" },
];

export const invoices: Invoice[] = [
  {
    id: "1", number: "FAC-2026-001", client: "Entreprise BTP Alpha", date: "2026-04-05",
    items: [
      { productId: "1", productName: "Ciment Portland 50kg", quantity: 20, unitPrice: 8500, total: 170000 },
      { productId: "4", productName: "Tuyau PVC 110mm", quantity: 10, unitPrice: 3500, total: 35000 },
    ],
    total: 205000, status: "paid",
  },
  {
    id: "2", number: "FAC-2026-002", client: "Construction Moderne SARL", date: "2026-04-03",
    items: [
      { productId: "3", productName: "Peinture Acrylique 20L", quantity: 5, unitPrice: 18000, total: 90000 },
    ],
    total: 90000, status: "pending",
  },
  {
    id: "3", number: "FAC-2026-003", client: "Habitat Plus", date: "2026-03-28",
    items: [
      { productId: "6", productName: "Carrelage 40x40cm", quantity: 50, unitPrice: 6800, total: 340000 },
      { productId: "8", productName: "Vis inox 5x50mm (boîte)", quantity: 10, unitPrice: 2800, total: 28000 },
    ],
    total: 368000, status: "paid",
  },
  {
    id: "4", number: "FAC-2026-004", client: "Résidences du Sud", date: "2026-03-15",
    items: [
      { productId: "2", productName: "Fer à béton 10mm", quantity: 30, unitPrice: 4200, total: 126000 },
    ],
    total: 126000, status: "overdue",
  },
];

export const salesData: SalesData[] = [
  { month: "Oct", revenue: 1200000, orders: 18 },
  { month: "Nov", revenue: 980000, orders: 14 },
  { month: "Déc", revenue: 1450000, orders: 22 },
  { month: "Jan", revenue: 890000, orders: 12 },
  { month: "Fév", revenue: 1100000, orders: 16 },
  { month: "Mar", revenue: 1680000, orders: 24 },
  { month: "Avr", revenue: 789000, orders: 10 },
];

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", minimumFractionDigits: 0 }).format(amount);
};
