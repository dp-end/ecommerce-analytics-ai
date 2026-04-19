import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import {
  AuthResponse,
  PageResponse,
  UserDto,
  StoreDto,
  ProductDto,
  OrderDto,
  ShipmentDto,
  ReviewDto,
  ReviewRequest,
  StoreReviewRequest,
  CategoryDto,
  AuditLogDto,
  CustomerProfileDto,
  DashboardStats,
  StoreRevenueItem,
  OrderAnalytics,
  CustomerAnalytics,
  ChatResponse,
  FavoriteDto,
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = environment.apiUrl;

  // ─── Auth ──────────────────────────────────────────────────────────────────
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/api/auth/login`, { email, password });
  }

  register(name: string, email: string, password: string, roleType?: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/api/auth/register`, { name, email, password, roleType });
  }

  // ─── Users ─────────────────────────────────────────────────────────────────
  getUsers(page = 0, size = 50, search = '', role = ''): Observable<PageResponse<UserDto>> {
    return this.http.get<PageResponse<UserDto>>(`${this.base}/api/users`, {
      params: { page, size, search, role },
    });
  }

  getMe(): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.base}/api/users/me`);
  }

  getUserById(id: number): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.base}/api/users/${id}`);
  }

  updateUser(id: number, data: { name?: string; email?: string; gender?: string; avatar?: string }): Observable<UserDto> {
    return this.http.patch<UserDto>(`${this.base}/api/users/${id}`, data);
  }

  changePassword(id: number, currentPassword: string, newPassword: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/api/users/${id}/password`, { currentPassword, newPassword });
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

  createStoreAccount(data: { storeName: string; ownerName: string; email: string; password: string; category?: string }): Observable<any> {
    return this.http.post(`${this.base}/api/admin/store-accounts`, data);
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

  getMyProducts(): Observable<ProductDto[]> {
    return this.http.get<ProductDto[]>(`${this.base}/api/products/my`);
  }

  getProductById(id: number): Observable<ProductDto> {
    return this.http.get<ProductDto>(`${this.base}/api/products/${id}`);
  }

  createProduct(data: {
    name: string; unitPrice: number; stock?: number;
    description?: string; emoji?: string; imageUrl?: string;
    storeId?: number; categoryId?: number; sku?: string;
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

  // ─── Reviews (by product) ──────────────────────────────────────────────────
  getReviewsByProduct(productId: number): Observable<ReviewDto[]> {
    return this.http.get<ReviewDto[]>(`${this.base}/api/reviews/product/${productId}`);
  }

  createReview(request: ReviewRequest): Observable<ReviewDto> {
    return this.http.post<ReviewDto>(`${this.base}/api/reviews`, request);
  }

  createStoreReview(request: StoreReviewRequest): Observable<ReviewDto> {
    return this.http.post<ReviewDto>(`${this.base}/api/reviews/store`, request);
  }

  deleteReview(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/reviews/${id}`);
  }

  likeReview(id: number): Observable<ReviewDto> {
    return this.http.post<ReviewDto>(`${this.base}/api/reviews/${id}/like`, {});
  }

  // ─── Favorites ─────────────────────────────────────────────────────────────
  getFavorites(): Observable<FavoriteDto[]> {
    return this.http.get<FavoriteDto[]>(`${this.base}/api/favorites`);
  }

  getFavoriteIds(): Observable<number[]> {
    return this.http.get<number[]>(`${this.base}/api/favorites/ids`);
  }

  addFavorite(productId: number): Observable<FavoriteDto> {
    return this.http.post<FavoriteDto>(`${this.base}/api/favorites/${productId}`, {});
  }

  removeFavorite(productId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/favorites/${productId}`);
  }

  // ─── Stripe ────────────────────────────────────────────────────────────────
  createStripeSession(data: {
    items: { productId: number; quantity: number }[];
    successUrl?: string;
    cancelUrl?: string;
  }): Observable<{ sessionId: string; checkoutUrl: string }> {
    return this.http.post<{ sessionId: string; checkoutUrl: string }>(
      `${this.base}/api/payments/stripe/create-session`,
      data
    );
  }

  // ─── Chatbot ───────────────────────────────────────────────────────────────
  askChatbot(question: string): Observable<ChatResponse> {
    const user = this.auth.currentUser();
    const body: Record<string, unknown> = { question };

    if (user) {
      body['user_context'] = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.toUpperCase(),
      };
    }

    return this.http.post<ChatResponse>(`${this.base}/api/chat/ask`, body);
  }
}
