package com.E_Commerce.demo.dto.response;

import com.E_Commerce.demo.entity.CustomerProfile;
import lombok.Builder;
import lombok.Data;

@Data @Builder
public class CustomerProfileDto {
    private Long id;
    private Long userId;
    private String userName;
    private String email;
    private String city;
    private Integer age;
    private String membershipType;
    private Double totalSpend;
    private Integer itemsPurchased;
    private Double avgRating;
    private String satisfactionLevel;
    private Integer daysSinceLastPurchase;
    private String state;
    private String country;

    public static CustomerProfileDto from(CustomerProfile cp) {
        return CustomerProfileDto.builder()
                .id(cp.getId())
                .userId(cp.getUser().getId())
                .userName(cp.getUser().getName())
                .email(cp.getUser().getEmail())
                .city(cp.getCity())
                .age(cp.getAge())
                .membershipType(cp.getMembershipType().name())
                .totalSpend(cp.getTotalSpend())
                .itemsPurchased(cp.getItemsPurchased())
                .avgRating(cp.getAvgRating())
                .satisfactionLevel(cp.getSatisfactionLevel())
                .daysSinceLastPurchase(cp.getDaysSinceLastPurchase())
                .state(cp.getState())
                .country(cp.getCountry())
                .build();
    }
}
