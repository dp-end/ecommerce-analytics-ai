package com.E_Commerce.demo.repository;

import com.E_Commerce.demo.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserId(Long userId);
    List<Order> findByStoreId(Long storeId);
    List<Order> findByStatus(Order.OrderStatus status);
    List<Order> findByUserIdAndStatus(Long userId, Order.OrderStatus status);

    @Query("SELECT o FROM Order o WHERE o.store.id = :storeId AND o.createdAt BETWEEN :start AND :end")
    List<Order> findByStoreIdAndDateRange(@Param("storeId") Long storeId,
                                          @Param("start") LocalDateTime start,
                                          @Param("end") LocalDateTime end);

    @Query("SELECT SUM(o.grandTotal) FROM Order o WHERE o.store.id = :storeId")
    Double sumRevenueByStore(@Param("storeId") Long storeId);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.store.id = :storeId")
    Long countByStore(@Param("storeId") Long storeId);
}
