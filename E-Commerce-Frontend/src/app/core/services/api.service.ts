import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  UserDto,
  StoreDto,
  ProductDto,
  OrderDto,
  ShipmentDto,
  ReviewDto,
  CategoryDto,
  AuditLogDto,
  CustomerProfileDto,
  DashboardStats,
  StoreRevenueItem,
  OrderAnalytics,
  CustomerAnalytics,
  ChatResponse,
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ─── Auth ──────────────────────────────────────────────────────────────────
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/api/auth/login`, { email, password });
  }

  register(name: string, email: string, password: string, roleType?: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/api/auth/register`, { name, email, password, roleType });
  }

  // ─── Users ─────────────────────────────────────────────────────────────────
  getUsers(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(`${this.base}/api/users`);
  }

  getMe(): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.base}/api/users/me`);
  }

  getUserById(id: number): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.base}/api/users/${id}`);
  }

  updateUserStatus(id: number, status: string): Observable<UserDto> {
    return this.http.patch<UserDto>(`${this.base}/api/users/${id}/status`, { status });
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/users/${id}`);
  }

  getUserProfile(userId: number): Observable<CustomerProfileDto> {
    return this.http.get<CustomerProfileDto>(`${this.base}/api/users/${userId}/profile`);
  }

  // ─── Stores ────────────────────────────────────────────────────────────────
  getStores(): Observable<StoreDto[]> {
    return this.http.get<StoreDto[]>(`${this.base}/api/stores`);
  }

  getMyStores(): Observable<StoreDto[]> {
    return this.http.get<StoreDto[]>(`${this.base}/api/stores/my`);
  }

  getStoreById(id: number): Observable<StoreDto> {
    return this.http.get<StoreDto>(`${this.base}/api/stores/${id}`);
  }

  createStore(name: string, category?: string): Observable<StoreDto> {
    return this.http.post<StoreDto>(`${this.base}/api/stores`, { name, category });
  }

  updateStoreStatus(id: number, status: string): Observable<StoreDto> {
    return this.http.patch<StoreDto>(`${this.base}/api/stores/${id}/status`, { status });
  }

  deleteStore(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/stores/${id}`);
  }

  // ─── Products ──────────────────────────────────────────────────────────────
  getProducts(params?: { search?: string; storeId?: number; categoryId?: number }): Observable<ProductDto[]> {
    let url = `${this.base}/api/products`;
    const query: string[] = [];
    if (params?.search) query.push(`search=${encodeURIComponent(params.search)}`);
    if (params?.storeId) query.push(`storeId=${params.storeId}`);
    if (params?.categoryId) query.push(`categoryId=${params.categoryId}`);
    if (query.length) url += '?' + query.join('&');
    return this.http.get<ProductDto[]>(url);
  }

  getProductById(id: number): Observable<ProductDto> {
    return this.http.get<ProductDto>(`${this.base}/api/products/${id}`);
  }

  createProduct(data: {
    name: string; unitPrice: number; stock?: number;
    description?: string; emoji?: string; storeId?: number; categoryId?: number; sku?: string;
  }): Observable<ProductDto> {
    return this.http.post<ProductDto>(`${this.base}/api/products`, data);
  }

  updateProduct(id: number, data: Partial<{ name: string; unitPrice: number; stock: number; description: string; emoji: string; }>): Observable<ProductDto> {
    return this.http.put<ProductDto>(`${this.base}/api/products/${id}`, data);
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/products/${id}`);
  }

  // ─── Orders ────────────────────────────────────────────────────────────────
  getOrders(): Observable<OrderDto[]> {
    return this.http.get<OrderDto[]>(`${this.base}/api/orders`);
  }

  getMyOrders(): Observable<OrderDto[]> {
    return this.http.get<OrderDto[]>(`${this.base}/api/orders/my`);
  }

  getOrdersByStore(storeId: number): Observable<OrderDto[]> {
    return this.http.get<OrderDto[]>(`${this.base}/api/orders/store/${storeId}`);
  }

  updateOrderStatus(id: number, status: string): Observable<OrderDto> {
    return this.http.patch<OrderDto>(`${this.base}/api/orders/${id}/status`, { status });
  }

  createOrder(data: { storeId?: number; paymentMethod?: string; items: { productId: number; quantity: number }[] }): Observable<OrderDto> {
    return this.http.post<OrderDto>(`${this.base}/api/orders`, data);
  }

  // ─── Shipments ─────────────────────────────────────────────────────────────
  getShipments(): Observable<ShipmentDto[]> {
    return this.http.get<ShipmentDto[]>(`${this.base}/api/shipments`);
  }

  updateShipmentStatus(id: number, status: string): Observable<ShipmentDto> {
    return this.http.patch<ShipmentDto>(`${this.base}/api/shipments/${id}/status`, { status });
  }

  // ─── Reviews ───────────────────────────────────────────────────────────────
  getReviews(): Observable<ReviewDto[]> {
    return this.http.get<ReviewDto[]>(`${this.base}/api/reviews`);
  }

  getReviewsByStore(storeId: number): Observable<ReviewDto[]> {
    return this.http.get<ReviewDto[]>(`${this.base}/api/reviews/store/${storeId}`);
  }

  deleteReview(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/reviews/${id}`);
  }

  // ─── Categories ────────────────────────────────────────────────────────────
  getCategories(): Observable<CategoryDto[]> {
    return this.http.get<CategoryDto[]>(`${this.base}/api/categories`);
  }

  createCategory(name: string, description?: string, parentId?: number): Observable<CategoryDto> {
    return this.http.post<CategoryDto>(`${this.base}/api/categories`, { name, description, parentId });
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/categories/${id}`);
  }

  // ─── Audit Logs ────────────────────────────────────────────────────────────
  getAuditLogs(): Observable<AuditLogDto[]> {
    return this.http.get<AuditLogDto[]>(`${this.base}/api/admin/audit-logs`);
  }

  // ─── Analytics ─────────────────────────────────────────────────────────────
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.base}/api/analytics/dashboard`);
  }

  getRevenueByStore(): Observable<StoreRevenueItem[]> {
    return this.http.get<StoreRevenueItem[]>(`${this.base}/api/analytics/revenue-by-store`);
  }

  getOrderAnalytics(): Observable<OrderAnalytics> {
    return this.http.get<OrderAnalytics>(`${this.base}/api/analytics/orders`);
  }

  getCustomerAnalytics(): Observable<CustomerAnalytics> {
    return this.http.get<CustomerAnalytics>(`${this.base}/api/analytics/customers`);
  }

  // ─── Chatbot ───────────────────────────────────────────────────────────────
  askChatbot(question: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.base}/api/chat/ask`, { question });
  }
}
