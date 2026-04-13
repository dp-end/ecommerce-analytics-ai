package com.E_Commerce.demo.service;

import com.E_Commerce.demo.entity.Order;
import com.E_Commerce.demo.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AnalyticsService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final ReviewRepository reviewRepository;
    private final CustomerProfileRepository customerProfileRepository;

    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalOrders", orderRepository.count());
        stats.put("totalProducts", productRepository.count());
        stats.put("totalUsers", userRepository.count());
        stats.put("totalStores", storeRepository.count());
        stats.put("totalReviews", reviewRepository.count());
        stats.put("totalRevenue", orderRepository.sumTotalRevenue());
        stats.put("ordersByStatus", getOrdersByStatus());
        return stats;
    }

    public List<Map<String, Object>> getRevenueByStore() {
        return storeRepository.findAll().stream().map(store -> {
            Map<String, Object> data = new HashMap<>();
            data.put("storeId", store.getId());
            data.put("storeName", store.getName());
            Double revenue = orderRepository.sumRevenueByStore(store.getId());
            data.put("revenue", revenue != null ? revenue : 0.0);
            Long count = orderRepository.countByStore(store.getId());
            data.put("orderCount", count != null ? count : 0L);
            data.put("rating", store.getRating());
            return data;
        }).toList();
    }

    public List<Map<String, Object>> getLowStockProducts(Integer threshold) {
        int t = threshold != null ? threshold : 10;
        return productRepository.findByStockLessThanEqual(t).stream().map(p -> {
            Map<String, Object> data = new HashMap<>();
            data.put("id", p.getId());
            data.put("name", p.getName());
            data.put("sku", p.getSku());
            data.put("stock", p.getStock());
            data.put("unitPrice", p.getUnitPrice());
            data.put("storeId", p.getStore() != null ? p.getStore().getId() : null);
            data.put("storeName", p.getStore() != null ? p.getStore().getName() : null);
            return data;
        }).toList();
    }

    public Map<String, Object> getOrderAnalytics() {
        long totalOrders = orderRepository.count();
        double totalRevenue = orderRepository.sumTotalRevenue();

        Map<String, Object> data = new HashMap<>();
        data.put("totalOrders", totalOrders);
        data.put("totalRevenue", totalRevenue);
        data.put("avgOrderValue", totalOrders > 0 ? totalRevenue / totalOrders : 0.0);
        data.put("byStatus", getOrdersByStatus());
        return data;
    }

    public Map<String, Object> getCustomerAnalytics() {
        Map<String, Long> byMembership = new HashMap<>();
        for (com.E_Commerce.demo.entity.CustomerProfile.MembershipType type :
                com.E_Commerce.demo.entity.CustomerProfile.MembershipType.values()) {
            byMembership.put(type.name(), (long) customerProfileRepository.findByMembershipType(type).size());
        }

        Map<String, Object> data = new HashMap<>();
        data.put("totalCustomers", userRepository.count());
        data.put("byMembership", byMembership);
        return data;
    }

    private Map<String, Long> getOrdersByStatus() {
        Map<String, Long> byStatus = new HashMap<>();
        for (Order.OrderStatus status : Order.OrderStatus.values()) {
            byStatus.put(status.name(), orderRepository.countByStatus(status));
        }
        return byStatus;
    }
}
