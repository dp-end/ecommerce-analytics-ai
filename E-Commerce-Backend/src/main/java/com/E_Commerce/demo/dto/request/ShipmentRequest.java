package com.E_Commerce.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.time.LocalDate;

@Data
public class ShipmentRequest {
    @NotNull(message = "Order ID is required")
    private Long orderId;

    @NotBlank(message = "Warehouse is required")
    private String warehouse;

    @NotBlank(message = "Mode of shipment is required")
    private String modeOfShipment;

    @NotBlank(message = "Carrier is required")
    private String carrier;

    @NotBlank(message = "Destination is required")
    private String destination;

    @NotNull(message = "ETA is required")
    private LocalDate eta;

    @NotNull(message = "Weight is required")
    @Positive(message = "Weight must be positive")
    private Double weightInGms;

    private String productImportance;
    private Boolean reachedOnTime;
    private Integer priorPurchases;
}
