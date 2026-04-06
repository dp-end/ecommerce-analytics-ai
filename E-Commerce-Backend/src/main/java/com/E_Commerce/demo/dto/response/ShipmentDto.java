package com.E_Commerce.demo.dto.response;

import com.E_Commerce.demo.entity.Shipment;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data @Builder
public class ShipmentDto {
    private Long id;
    private Long orderId;
    private String customerName;
    private String warehouse;
    private String modeOfShipment;
    private String carrier;
    private String destination;
    private String status;
    private String trackingNumber;
    private LocalDate eta;

    public static ShipmentDto from(Shipment s) {
        return ShipmentDto.builder()
                .id(s.getId())
                .orderId(s.getOrder().getId())
                .customerName(s.getOrder().getUser().getName())
                .warehouse(s.getWarehouse())
                .modeOfShipment(s.getModeOfShipment() != null ? s.getModeOfShipment().name() : null)
                .carrier(s.getCarrier())
                .destination(s.getDestination())
                .status(s.getStatus().name())
                .trackingNumber(s.getTrackingNumber())
                .eta(s.getEta())
                .build();
    }
}
