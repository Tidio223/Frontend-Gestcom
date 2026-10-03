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
  typeVente?: 'gros' | 'detail';
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
  profit: number;
  orders: number;
}

export const products: Product[] = [];

export const invoices: Invoice[] = [];

export const salesData: SalesData[] = [
  { month: "08/07", revenue: 1200000, profit: 348000, orders: 18 },
  { month: "09/07", revenue: 980000, profit: 284200, orders: 14 },
  { month: "10/07", revenue: 1450000, profit: 420500, orders: 22 },
  { month: "11/07", revenue: 890000, profit: 258100, orders: 12 },
  { month: "12/07", revenue: 1100000, profit: 319000, orders: 16 },
  { month: "13/07", revenue: 1680000, profit: 487200, orders: 24 },
  { month: "14/07", revenue: 789000, profit: 228810, orders: 10 },
];

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", minimumFractionDigits: 0 }).format(amount);
};
