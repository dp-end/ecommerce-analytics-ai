package com.E_Commerce.demo.controller;

import com.E_Commerce.demo.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard() {
        return ResponseEntity.ok(analyticsService.getDashboardStats());
    }

    @GetMapping("/revenue-by-store")
    public ResponseEntity<List<Map<String, Object>>> getRevenueByStore() {
        return ResponseEntity.ok(analyticsService.getRevenueByStore());
    }

    @GetMapping("/low-stock")
    public ResponseEntity<List<Map<String, Object>>> getLowStock(
            @RequestParam(defaultValue = "10") Integer threshold) {
        return ResponseEntity.ok(analyticsService.getLowStockProducts(threshold));
    }

    @GetMapping("/orders")
    public ResponseEntity<Map<String, Object>> getOrderAnalytics() {
        return ResponseEntity.ok(analyticsService.getOrderAnalytics());
    }

    @GetMapping("/customers")
    public ResponseEntity<Map<String, Object>> getCustomerAnalytics() {
        return ResponseEntity.ok(analyticsService.getCustomerAnalytics());
    }
}
