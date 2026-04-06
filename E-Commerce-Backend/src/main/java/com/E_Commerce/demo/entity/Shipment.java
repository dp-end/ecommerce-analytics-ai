package com.E_Commerce.demo.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "shipments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Shipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    private Order order;

    private String warehouse;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode_of_shipment")
    private ShipmentMode modeOfShipment;

    private String carrier;
    private String destination;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ShipmentStatus status = ShipmentStatus.PENDING;

    private String trackingNumber;
    private LocalDate eta;

    @Column(name = "customer_care_calls")
    private Integer customerCareCalls;

    @Column(name = "customer_rating")
    private Integer customerRating;

    @Column(name = "discount_offered")
    private Double discountOffered;

    public enum ShipmentMode { SHIP, FLIGHT, ROAD }
    public enum ShipmentStatus { PENDING, IN_TRANSIT, DELIVERED, RETURNED }
}
