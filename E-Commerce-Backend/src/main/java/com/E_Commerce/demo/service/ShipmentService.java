package com.E_Commerce.demo.service;

import com.E_Commerce.demo.dto.request.ShipmentRequest;
import com.E_Commerce.demo.dto.response.ShipmentDto;
import com.E_Commerce.demo.entity.Order;
import com.E_Commerce.demo.entity.Shipment;
import com.E_Commerce.demo.repository.OrderRepository;
import com.E_Commerce.demo.repository.ShipmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ShipmentService {

    private final ShipmentRepository shipmentRepository;
    private final OrderRepository orderRepository;

    public List<ShipmentDto> getAll() {
        return shipmentRepository.findAll().stream().map(ShipmentDto::from).toList();
    }

    public ShipmentDto getById(Long id) {
        return ShipmentDto.from(shipmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Shipment not found: " + id)));
    }

    public ShipmentDto getByOrder(Long orderId) {
        return ShipmentDto.from(shipmentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Shipment not found for order: " + orderId)));
    }

    public ShipmentDto getByTracking(String trackingNumber) {
        return ShipmentDto.from(shipmentRepository.findByTrackingNumber(trackingNumber)
                .orElseThrow(() -> new RuntimeException("Shipment not found for tracking: " + trackingNumber)));
    }

    @Transactional
    public ShipmentDto create(ShipmentRequest request) {
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new RuntimeException("Order not found: " + request.getOrderId()));

        Shipment.ShipmentMode mode = null;
        if (request.getModeOfShipment() != null) {
            mode = Shipment.ShipmentMode.valueOf(request.getModeOfShipment());
        }

        String trackingNumber = UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();

        Shipment shipment = Shipment.builder()
                .order(order)
                .warehouse(request.getWarehouse())
                .modeOfShipment(mode)
                .carrier(request.getCarrier())
                .destination(request.getDestination())
                .eta(request.getEta())
                .trackingNumber(trackingNumber)
                .build();
        return ShipmentDto.from(shipmentRepository.save(shipment));
    }

    @Transactional
    public ShipmentDto updateStatus(Long id, String status) {
        Shipment shipment = shipmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Shipment not found: " + id));
        shipment.setStatus(Shipment.ShipmentStatus.valueOf(status));
        return ShipmentDto.from(shipmentRepository.save(shipment));
    }

    @Transactional
    public ShipmentDto update(Long id, ShipmentRequest request) {
        Shipment shipment = shipmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Shipment not found: " + id));
        if (request.getWarehouse() != null) shipment.setWarehouse(request.getWarehouse());
        if (request.getCarrier() != null) shipment.setCarrier(request.getCarrier());
        if (request.getDestination() != null) shipment.setDestination(request.getDestination());
        if (request.getEta() != null) shipment.setEta(request.getEta());
        if (request.getModeOfShipment() != null) {
            shipment.setModeOfShipment(Shipment.ShipmentMode.valueOf(request.getModeOfShipment()));
        }
        return ShipmentDto.from(shipmentRepository.save(shipment));
    }
}
