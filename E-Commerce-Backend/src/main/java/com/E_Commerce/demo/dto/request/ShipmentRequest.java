package com.E_Commerce.demo.dto.request;

import lombok.Data;

import java.time.LocalDate;

@Data
public class ShipmentRequest {
    private Long orderId;
    private String warehouse;
    private String modeOfShipment;
    private String carrier;
    private String destination;
    private LocalDate eta;
}
