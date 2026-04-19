package com.E_Commerce.demo.controller;

import com.E_Commerce.demo.dto.request.ShipmentRequest;
import com.E_Commerce.demo.dto.response.ShipmentDto;
import com.E_Commerce.demo.service.ShipmentService;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/shipments")
@RequiredArgsConstructor
public class ShipmentController {

    private final ShipmentService shipmentService;

    @GetMapping
    public ResponseEntity<List<ShipmentDto>> getAll(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(shipmentService.getAll(userDetails.getUsername()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ShipmentDto> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(shipmentService.getById(id, userDetails.getUsername()));
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<ShipmentDto> getByOrder(
            @PathVariable Long orderId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(shipmentService.getByOrder(orderId, userDetails.getUsername()));
    }

    @GetMapping("/track/{trackingNumber}")
    public ResponseEntity<ShipmentDto> getByTracking(
            @PathVariable String trackingNumber,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(shipmentService.getByTracking(trackingNumber, userDetails.getUsername()));
    }

    @PostMapping
    public ResponseEntity<ShipmentDto> create(
            @Valid @RequestBody ShipmentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(shipmentService.create(request, userDetails.getUsername()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ShipmentDto> update(
            @PathVariable Long id,
            @Valid @RequestBody ShipmentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(shipmentService.update(id, request, userDetails.getUsername()));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ShipmentDto> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(shipmentService.updateStatus(id, body.get("status"), userDetails.getUsername()));
    }
}
