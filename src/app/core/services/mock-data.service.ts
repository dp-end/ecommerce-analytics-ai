import { Injectable } from '@angular/core';

export interface MockUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'corporate' | 'individual';
  status: 'active' | 'suspended';
  joinedDate: string;
  avatar: string;
}

export interface MockStore {
  id: number;
  name: string;
  owner: string;
  status: 'open' | 'closed';
  revenue: number;
  orders: number;
  category: string;
  rating: number;
}

export interface MockProduct {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
  emoji: string;
  rating: number;
  reviews: number;
  description: string;
}

export interface MockOrder {
  id: string;
  customer: string;
  products: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';
  date: string;
  items: string[];
}

export interface MockCustomer {
  id: number;
  name: string;
  email: string;
  city: string;
  membership: 'gold' | 'silver' | 'bronze';
  totalSpend: number;
  orders: number;
  status: 'active' | 'inactive';
  joinedDate: string;
}

export interface MockShipment {
  id: string;
  orderId: string;
  customer: string;
  carrier: string;
  destination: string;
  status: 'pending' | 'in-transit' | 'delivered' | 'returned';
  eta: string;
}

export interface MockReview {
  id: number;
  customer: string;
  product: string;
  stars: number;
  text: string;
  date: string;
  helpful: number;
}

export interface AnalyticsData {
  labels: string[];
  revenue: number[];
  orders: number[];
  customers: number[];
}

@Injectable({ providedIn: 'root' })
export class MockDataService {
  getUsers(): MockUser[] {
    return [
      { id: 1, name: 'Alex Thompson', email: 'alex@example.com', role: 'admin', status: 'active', joinedDate: '2024-01-15', avatar: 'AT' },
      { id: 2, name: 'Sarah Connor', email: 'sarah@techcorp.com', role: 'corporate', status: 'active', joinedDate: '2024-02-20', avatar: 'SC' },
      { id: 3, name: 'John Smith', email: 'john@gmail.com', role: 'individual', status: 'active', joinedDate: '2024-03-05', avatar: 'JS' },
      { id: 4, name: 'Maria Garcia', email: 'maria@store.com', role: 'corporate', status: 'active', joinedDate: '2024-03-12', avatar: 'MG' },
      { id: 5, name: 'David Lee', email: 'david@example.com', role: 'individual', status: 'suspended', joinedDate: '2024-04-01', avatar: 'DL' },
      { id: 6, name: 'Emma Wilson', email: 'emma@shop.com', role: 'corporate', status: 'active', joinedDate: '2024-04-18', avatar: 'EW' },
      { id: 7, name: 'Michael Brown', email: 'mike@example.com', role: 'individual', status: 'active', joinedDate: '2024-05-02', avatar: 'MB' },
      { id: 8, name: 'Lisa Anderson', email: 'lisa@business.com', role: 'corporate', status: 'active', joinedDate: '2024-05-20', avatar: 'LA' },
      { id: 9, name: 'Ryan Martinez', email: 'ryan@test.com', role: 'individual', status: 'active', joinedDate: '2024-06-08', avatar: 'RM' },
      { id: 10, name: 'Jennifer Davis', email: 'jennifer@co.com', role: 'corporate', status: 'suspended', joinedDate: '2024-06-25', avatar: 'JD' },
    ];
  }

  getStores(): MockStore[] {
    return [
      { id: 1, name: 'TechVault Electronics', owner: 'Sarah Connor', status: 'open', revenue: 245000, orders: 1823, category: 'Electronics', rating: 4.8 },
      { id: 2, name: 'Green Garden Co.', owner: 'Maria Garcia', status: 'open', revenue: 89000, orders: 654, category: 'Home & Garden', rating: 4.5 },
      { id: 3, name: 'Fashion Forward', owner: 'Emma Wilson', status: 'open', revenue: 178000, orders: 2341, category: 'Fashion', rating: 4.6 },
      { id: 4, name: 'Gourmet Kitchen', owner: 'Lisa Anderson', status: 'closed', revenue: 56000, orders: 423, category: 'Food & Kitchen', rating: 4.2 },
      { id: 5, name: 'Sport Zone Pro', owner: 'Ryan Martinez', status: 'open', revenue: 134000, orders: 987, category: 'Sports', rating: 4.7 },
      { id: 6, name: 'Book Haven', owner: 'Jennifer Davis', status: 'closed', revenue: 34000, orders: 892, category: 'Books', rating: 4.9 },
      { id: 7, name: 'Pet Paradise', owner: 'Michael Brown', status: 'open', revenue: 67000, orders: 512, category: 'Pet Supplies', rating: 4.4 },
      { id: 8, name: 'Beauty Essentials', owner: 'Alex Thompson', status: 'open', revenue: 112000, orders: 1654, category: 'Beauty', rating: 4.3 },
    ];
  }

  getProducts(): MockProduct[] {
    return [
      { id: 1, name: 'Wireless Noise-Canceling Headphones', price: 299.99, stock: 145, category: 'Electronics', emoji: '🎧', rating: 4.8, reviews: 234, description: 'Premium audio experience with 30h battery life' },
      { id: 2, name: 'Ergonomic Office Chair', price: 549.00, stock: 32, category: 'Furniture', emoji: '🪑', rating: 4.6, reviews: 89, description: 'Lumbar support and adjustable armrests' },
      { id: 3, name: 'Smart Watch Series 5', price: 399.00, stock: 78, category: 'Electronics', emoji: '⌚', rating: 4.7, reviews: 412, description: 'Health tracking with GPS and cellular' },
      { id: 4, name: 'Organic Coffee Blend', price: 24.99, stock: 500, category: 'Food', emoji: '☕', rating: 4.9, reviews: 1023, description: '100% organic Ethiopian single origin' },
      { id: 5, name: 'Yoga Mat Pro', price: 89.00, stock: 200, category: 'Sports', emoji: '🧘', rating: 4.5, reviews: 167, description: 'Non-slip 6mm thick with alignment guides' },
      { id: 6, name: 'Portable Bluetooth Speaker', price: 129.00, stock: 89, category: 'Electronics', emoji: '🔊', rating: 4.4, reviews: 321, description: 'Waterproof IPX7, 20h playtime' },
      { id: 7, name: 'Running Shoes Elite', price: 179.00, stock: 234, category: 'Fashion', emoji: '👟', rating: 4.7, reviews: 543, description: 'Carbon fiber plate for maximum propulsion' },
      { id: 8, name: 'Vitamin C Serum', price: 45.00, stock: 312, category: 'Beauty', emoji: '✨', rating: 4.6, reviews: 789, description: '20% Vitamin C with hyaluronic acid' },
      { id: 9, name: 'Mechanical Keyboard', price: 219.00, stock: 67, category: 'Electronics', emoji: '⌨️', rating: 4.8, reviews: 198, description: 'Cherry MX switches, RGB backlit' },
      { id: 10, name: 'Ceramic Plant Pot Set', price: 39.99, stock: 156, category: 'Home', emoji: '🪴', rating: 4.3, reviews: 112, description: 'Set of 3 handcrafted ceramic pots' },
    ];
  }

  getOrders(): MockOrder[] {
    return [
      { id: '#ORD-7841', customer: 'John Smith', products: 3, total: 459.97, status: 'completed', date: '2025-03-28', items: ['Headphones', 'Phone Case', 'Charger'] },
      { id: '#ORD-7842', customer: 'Emma Johnson', products: 1, total: 549.00, status: 'shipped', date: '2025-03-29', items: ['Office Chair'] },
      { id: '#ORD-7843', customer: 'Michael Chen', products: 2, total: 524.00, status: 'processing', date: '2025-03-30', items: ['Smart Watch', 'Watch Band'] },
      { id: '#ORD-7844', customer: 'Sarah Williams', products: 5, total: 124.95, status: 'pending', date: '2025-03-31', items: ['Coffee Beans x5'] },
      { id: '#ORD-7845', customer: 'David Brown', products: 2, total: 268.00, status: 'cancelled', date: '2025-04-01', items: ['Yoga Mat', 'Resistance Bands'] },
      { id: '#ORD-7846', customer: 'Lisa Anderson', products: 1, total: 129.00, status: 'shipped', date: '2025-04-01', items: ['Bluetooth Speaker'] },
      { id: '#ORD-7847', customer: 'Ryan Martinez', products: 4, total: 892.00, status: 'completed', date: '2025-04-02', items: ['Keyboard', 'Mouse', 'Monitor Stand', 'Cable'] },
      { id: '#ORD-7848', customer: 'Jennifer Davis', products: 2, total: 224.00, status: 'processing', date: '2025-04-02', items: ['Running Shoes', 'Socks'] },
      { id: '#ORD-7849', customer: 'Mark Wilson', products: 3, total: 134.97, status: 'pending', date: '2025-04-03', items: ['Serum x3'] },
      { id: '#ORD-7850', customer: 'Amy Taylor', products: 1, total: 39.99, status: 'completed', date: '2025-04-03', items: ['Plant Pot Set'] },
    ];
  }

  getCustomers(): MockCustomer[] {
    return [
      { id: 1, name: 'John Smith', email: 'john@gmail.com', city: 'New York', membership: 'gold', totalSpend: 4521.50, orders: 34, status: 'active', joinedDate: '2023-06-15' },
      { id: 2, name: 'Emma Johnson', email: 'emma@mail.com', city: 'Los Angeles', membership: 'silver', totalSpend: 1892.00, orders: 12, status: 'active', joinedDate: '2024-01-22' },
      { id: 3, name: 'Michael Chen', email: 'mchen@work.com', city: 'Chicago', membership: 'gold', totalSpend: 7234.80, orders: 67, status: 'active', joinedDate: '2023-03-10' },
      { id: 4, name: 'Sarah Williams', email: 'swilliams@example.com', city: 'Houston', membership: 'bronze', totalSpend: 342.95, orders: 5, status: 'active', joinedDate: '2024-11-05' },
      { id: 5, name: 'David Brown', email: 'dbrown@test.com', city: 'Phoenix', membership: 'silver', totalSpend: 2156.00, orders: 18, status: 'inactive', joinedDate: '2024-02-28' },
      { id: 6, name: 'Lisa Anderson', email: 'lisa.a@shop.com', city: 'Philadelphia', membership: 'gold', totalSpend: 9870.20, orders: 94, status: 'active', joinedDate: '2022-12-01' },
      { id: 7, name: 'Ryan Martinez', email: 'ryan.m@mail.com', city: 'San Antonio', membership: 'silver', totalSpend: 1543.00, orders: 23, status: 'active', joinedDate: '2024-05-17' },
      { id: 8, name: 'Jennifer Davis', email: 'jen.d@example.com', city: 'San Diego', membership: 'bronze', totalSpend: 567.50, orders: 8, status: 'active', joinedDate: '2024-08-30' },
    ];
  }

  getShipments(): MockShipment[] {
    return [
      { id: 'SHIP-001', orderId: '#ORD-7841', customer: 'John Smith', carrier: 'FedEx', destination: 'New York, NY', status: 'delivered', eta: '2025-03-30' },
      { id: 'SHIP-002', orderId: '#ORD-7842', customer: 'Emma Johnson', carrier: 'UPS', destination: 'Los Angeles, CA', status: 'in-transit', eta: '2025-04-05' },
      { id: 'SHIP-003', orderId: '#ORD-7843', customer: 'Michael Chen', carrier: 'DHL', destination: 'Chicago, IL', status: 'in-transit', eta: '2025-04-06' },
      { id: 'SHIP-004', orderId: '#ORD-7844', customer: 'Sarah Williams', carrier: 'USPS', destination: 'Houston, TX', status: 'pending', eta: '2025-04-08' },
      { id: 'SHIP-005', orderId: '#ORD-7846', customer: 'Lisa Anderson', carrier: 'FedEx', destination: 'Philadelphia, PA', status: 'in-transit', eta: '2025-04-04' },
      { id: 'SHIP-006', orderId: '#ORD-7847', customer: 'Ryan Martinez', carrier: 'UPS', destination: 'San Antonio, TX', status: 'delivered', eta: '2025-04-03' },
      { id: 'SHIP-007', orderId: '#ORD-7848', customer: 'Jennifer Davis', carrier: 'DHL', destination: 'San Diego, CA', status: 'pending', eta: '2025-04-09' },
      { id: 'SHIP-008', orderId: '#ORD-7845', customer: 'David Brown', carrier: 'FedEx', destination: 'Phoenix, AZ', status: 'returned', eta: '2025-04-02' },
    ];
  }

  getReviews(): MockReview[] {
    return [
      { id: 1, customer: 'John Smith', product: 'Wireless Headphones', stars: 5, text: 'Absolutely amazing sound quality! The noise cancellation is top-notch, perfect for my home office.', date: '2025-03-28', helpful: 34 },
      { id: 2, customer: 'Emma Johnson', product: 'Ergonomic Chair', stars: 4, text: 'Very comfortable after long hours of work. Assembly was a bit tricky but worth it.', date: '2025-03-29', helpful: 21 },
      { id: 3, customer: 'Michael Chen', product: 'Smart Watch', stars: 5, text: 'Best smartwatch I have owned. The health tracking features are incredibly accurate.', date: '2025-03-30', helpful: 45 },
      { id: 4, customer: 'Sarah Williams', product: 'Organic Coffee', stars: 3, text: 'Good taste but a bit pricey for the quantity. Would buy again on sale.', date: '2025-03-31', helpful: 12 },
      { id: 5, customer: 'David Brown', product: 'Yoga Mat', stars: 4, text: 'Great grip and cushioning. The alignment guides are very helpful for beginners.', date: '2025-04-01', helpful: 18 },
      { id: 6, customer: 'Lisa Anderson', product: 'Bluetooth Speaker', stars: 5, text: 'Incredible sound for the size! Takes it everywhere, waterproofing is legit.', date: '2025-04-01', helpful: 67 },
      { id: 7, customer: 'Ryan Martinez', product: 'Running Shoes', stars: 2, text: 'Sizing runs small, had to return for a larger size. Otherwise decent quality.', date: '2025-04-02', helpful: 8 },
      { id: 8, customer: 'Jennifer Davis', product: 'Vitamin C Serum', stars: 5, text: 'My skin is glowing! Noticed a difference within 2 weeks. Repurchasing for sure.', date: '2025-04-02', helpful: 92 },
    ];
  }

  getAnalyticsData(): AnalyticsData {
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      revenue: [42000, 58000, 51000, 73000, 68000, 89000, 95000, 87000, 102000, 115000, 98000, 134000],
      orders: [420, 580, 510, 730, 680, 890, 950, 870, 1020, 1150, 980, 1340],
      customers: [120, 180, 160, 240, 220, 310, 340, 290, 380, 420, 360, 510],
    };
  }

  getWeeklyRevenue(): { labels: string[]; data: number[] } {
    return {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      data: [8200, 9400, 7800, 11200, 13400, 15600, 12100],
    };
  }

  getCategoryBreakdown(): { labels: string[]; data: number[] } {
    return {
      labels: ['Electronics', 'Fashion', 'Food', 'Sports', 'Beauty', 'Home'],
      data: [35, 22, 15, 12, 10, 6],
    };
  }

  getStoreRevenue(): { labels: string[]; data: number[] } {
    return {
      labels: ['TechVault', 'Fashion Fwd', 'Sport Zone', 'Beauty Ess.', 'Green Garden', 'Pet Paradise'],
      data: [245000, 178000, 134000, 112000, 89000, 67000],
    };
  }

  getActivityLog(): { id: number; action: string; user: string; time: string; type: 'info' | 'warning' | 'success' | 'error' }[] {
    return [
      { id: 1, action: 'New corporate account registered', user: 'Emma Wilson', time: '2 min ago', type: 'success' },
      { id: 2, action: 'Store "Book Haven" temporarily suspended', user: 'Admin', time: '15 min ago', type: 'warning' },
      { id: 3, action: 'Product added to TechVault store', user: 'Sarah Connor', time: '34 min ago', type: 'info' },
      { id: 4, action: 'Failed login attempt detected', user: 'Unknown', time: '1h ago', type: 'error' },
      { id: 5, action: 'Bulk order processed successfully', user: 'Maria Garcia', time: '2h ago', type: 'success' },
      { id: 6, action: 'System backup completed', user: 'System', time: '4h ago', type: 'info' },
      { id: 7, action: 'New category "Smart Home" added', user: 'Admin', time: '6h ago', type: 'info' },
      { id: 8, action: 'User David Lee suspended', user: 'Admin', time: '1d ago', type: 'warning' },
    ];
  }
}
