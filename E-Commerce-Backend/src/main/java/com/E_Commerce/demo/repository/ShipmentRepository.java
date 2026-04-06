package com.E_Commerce.demo.repository;

import com.E_Commerce.demo.entity.Shipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShipmentRepository extends JpaRepository<Shipment, Long> {
    Optional<Shipment> findByOrderId(Long orderId);
    List<Shipment> findByStatus(Shipment.ShipmentStatus status);
    Optional<Shipment> findByTrackingNumber(String trackingNumber);
}
