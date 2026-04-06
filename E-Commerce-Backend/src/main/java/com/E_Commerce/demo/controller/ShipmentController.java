package com.E_Commerce.demo.controller;

import com.E_Commerce.demo.dto.request.ShipmentRequest;
import com.E_Commerce.demo.dto.response.ShipmentDto;
import com.E_Commerce.demo.service.ShipmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/shipments")
@RequiredArgsConstructor
public class ShipmentController {

    private final ShipmentService shipmentService;

    @GetMapping
    public ResponseEntity<List<ShipmentDto>> getAll() {
        return ResponseEntity.ok(shipmentService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ShipmentDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(shipmentService.getById(id));
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<ShipmentDto> getByOrder(@PathVariable Long orderId) {
        return ResponseEntity.ok(shipmentService.getByOrder(orderId));
    }

    @GetMapping("/track/{trackingNumber}")
    public ResponseEntity<ShipmentDto> getByTracking(@PathVariable String trackingNumber) {
        return ResponseEntity.ok(shipmentService.getByTracking(trackingNumber));
    }

    @PostMapping
    public ResponseEntity<ShipmentDto> create(@RequestBody ShipmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(shipmentService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ShipmentDto> update(
            @PathVariable Long id,
            @RequestBody ShipmentRequest request) {
        return ResponseEntity.ok(shipmentService.update(id, request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ShipmentDto> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(shipmentService.updateStatus(id, body.get("status")));
    }
}
