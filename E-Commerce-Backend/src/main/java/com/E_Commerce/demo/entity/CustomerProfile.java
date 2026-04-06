package com.E_Commerce.demo.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "customer_profiles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CustomerProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    private Integer age;
    private String city;

    @Enumerated(EnumType.STRING)
    @Column(name = "membership_type")
    @Builder.Default
    private MembershipType membershipType = MembershipType.BRONZE;

    @Column(name = "total_spend")
    @Builder.Default
    private Double totalSpend = 0.0;

    @Column(name = "items_purchased")
    @Builder.Default
    private Integer itemsPurchased = 0;

    @Column(name = "avg_rating")
    private Double avgRating;

    @Column(name = "discount_applied")
    private Boolean discountApplied;

    @Column(name = "satisfaction_level")
    private String satisfactionLevel;

    public enum MembershipType { GOLD, SILVER, BRONZE }
}
