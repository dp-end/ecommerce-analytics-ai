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

        double totalRevenue = orderRepository.findAll().stream()
                .mapToDouble(o -> o.getGrandTotal() != null ? o.getGrandTotal() : 0.0)
                .sum();
        stats.put("totalRevenue", totalRevenue);

        Map<String, Long> ordersByStatus = new HashMap<>();
        for (Order.OrderStatus status : Order.OrderStatus.values()) {
            ordersByStatus.put(status.name(), (long) orderRepository.findByStatus(status).size());
        }
        stats.put("ordersByStatus", ordersByStatus);

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
        Map<String, Object> data = new HashMap<>();
        data.put("totalOrders", orderRepository.count());

        double totalRevenue = orderRepository.findAll().stream()
                .mapToDouble(o -> o.getGrandTotal() != null ? o.getGrandTotal() : 0.0)
                .sum();
        data.put("totalRevenue", totalRevenue);

        double avgOrderValue = orderRepository.count() > 0 ? totalRevenue / orderRepository.count() : 0.0;
        data.put("avgOrderValue", avgOrderValue);

        Map<String, Long> byStatus = new HashMap<>();
        for (Order.OrderStatus status : Order.OrderStatus.values()) {
            byStatus.put(status.name(), (long) orderRepository.findByStatus(status).size());
        }
        data.put("byStatus", byStatus);

        return data;
    }

    public Map<String, Object> getCustomerAnalytics() {
        Map<String, Object> data = new HashMap<>();
        data.put("totalCustomers", userRepository.count());

        long goldCount = customerProfileRepository.findByMembershipType(
                com.E_Commerce.demo.entity.CustomerProfile.MembershipType.GOLD).size();
        long silverCount = customerProfileRepository.findByMembershipType(
                com.E_Commerce.demo.entity.CustomerProfile.MembershipType.SILVER).size();
        long bronzeCount = customerProfileRepository.findByMembershipType(
                com.E_Commerce.demo.entity.CustomerProfile.MembershipType.BRONZE).size();

        Map<String, Long> byMembership = new HashMap<>();
        byMembership.put("GOLD", goldCount);
        byMembership.put("SILVER", silverCount);
        byMembership.put("BRONZE", bronzeCount);
        data.put("byMembership", byMembership);

        return data;
    }
}
