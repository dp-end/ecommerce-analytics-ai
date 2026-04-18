// ─── Pagination ──────────────────────────────────────────────────────────────
export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
  pageSize: number;
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export interface AuthResponse {
  token: string;
  tokenType: string;
  id: number;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

// ─── User ────────────────────────────────────────────────────────────────────
export interface UserDto {
  id: number;
  name: string;
  email: string;
  roleType: string;
  gender?: string;
  avatar?: string;
  status: string;
  createdAt: string;
}

// ─── Store ───────────────────────────────────────────────────────────────────
export interface StoreDto {
  id: number;
  name: string;
  ownerId: number;
  ownerName: string;
  status: string;
  category?: string;
  rating: number;
  createdAt: string;
}

// ─── Product ─────────────────────────────────────────────────────────────────
export interface ProductDto {
  id: number;
  storeId?: number;
  storeName?: string;
  storeOwnerId?: number;
  categoryId?: number;
  categoryName?: string;
  sku?: string;
  brand?: string;
  name: string;
  unitPrice: number;
  stock: number;
  description?: string;
  emoji?: string;
  imageUrl?: string;
  rating: number;
}

// ─── Favorite ────────────────────────────────────────────────────────────────
export interface FavoriteDto {
  id: number;
  productId: number;
  productName: string;
  productEmoji?: string;
  productImageUrl?: string;
  productPrice: number;
  productRating: number;
  productStock: number;
  categoryName?: string;
  storeName?: string;
  createdAt: string;
}

// ─── Order ───────────────────────────────────────────────────────────────────
export interface OrderItemDto {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  price: number;
}

export interface OrderDto {
  id: number;
  userId: number;
  customerName: string;
  storeId?: number;
  storeName?: string;
  status: string;
  grandTotal: number;
  paymentMethod?: string;
  createdAt: string;
  items: OrderItemDto[];
}

// ─── Shipment ────────────────────────────────────────────────────────────────
export interface ShipmentDto {
  id: number;
  orderId: number;
  customerName: string;
  warehouse?: string;
  modeOfShipment?: string;
  carrier?: string;
  destination?: string;
  status: string;
  trackingNumber?: string;
  eta?: string;
}

// ─── Review ──────────────────────────────────────────────────────────────────
export interface ReviewDto {
  id: number;
  userId: number;
  customerName: string;
  productId: number;
  productName: string;
  starRating: number;
  reviewText?: string;
  reviewHeadline?: string;
  helpful: number;
  sentiment?: string;
  ownerLiked: boolean;
  createdAt: string;
}

export interface ReviewRequest {
  productId: number;
  starRating: number;
  reviewText: string;
  reviewHeadline?: string;
}

// ─── Category ────────────────────────────────────────────────────────────────
export interface CategoryDto {
  id: number;
  name: string;
  description?: string;
  parentId?: number;
  parentName?: string;
}

// ─── Audit Log ───────────────────────────────────────────────────────────────
export interface AuditLogDto {
  id: number;
  action: string;
  userId?: number;
  userName: string;
  type: string;
  createdAt: string;
}

// ─── Customer Profile ────────────────────────────────────────────────────────
export interface CustomerProfileDto {
  id: number;
  userId: number;
  userName: string;
  email: string;
  city?: string;
  age?: number;
  membershipType: string;
  totalSpend: number;
  itemsPurchased: number;
  avgRating?: number;
  satisfactionLevel?: string;
}

// ─── Analytics ───────────────────────────────────────────────────────────────
export interface DashboardStats {
  totalOrders: number;
  totalProducts: number;
  totalUsers: number;
  totalStores: number;
  totalRevenue: number;
  totalReviews: number;
  ordersByStatus: Record<string, number>;
}

export interface StoreRevenueItem {
  storeId: number;
  storeName: string;
  revenue: number;
  orderCount: number;
  rating: number;
}

export interface OrderAnalytics {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  byStatus: Record<string, number>;
}

export interface CustomerAnalytics {
  totalCustomers: number;
  byMembership: Record<string, number>;
}

// ─── Chatbot ─────────────────────────────────────────────────────────────────
export interface ChatResponse {
  question?: string;
  answer: string;
  sql?: string;
  sql_query?: string;
  agent?: string;
  // LangGraph multi-agent fields
  visualizationData?: PlotlyFigure | null;
  visualization_data?: PlotlyFigure | null;
  agentTrace?: string[];
  agent_trace?: string[];
  isSafe?: boolean;
  is_safe?: boolean;
  isInScope?: boolean;
  is_in_scope?: boolean;
  iterationCount?: number;
  iteration_count?: number;
  needsVisualization?: boolean;
  needs_visualization?: boolean;
}

export interface PlotlyFigure {
  data: PlotlyTrace[];
  layout: Record<string, unknown>;
}

export interface PlotlyTrace {
  type: string;
  x?: unknown[];
  y?: unknown[];
  labels?: unknown[];
  values?: unknown[];
  [key: string]: unknown;
}
