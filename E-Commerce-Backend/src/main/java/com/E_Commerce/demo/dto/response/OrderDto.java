package com.E_Commerce.demo.dto.response;

import com.E_Commerce.demo.entity.Order;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data @Builder
public class OrderDto {
    private Long id;
    private Long userId;
    private String customerName;
    private Long storeId;
    private String storeName;
    private String status;
    private Double grandTotal;
    private Double discount;
    private Double tax;
    private Double shippingCost;
    private String paymentMethod;
    private String city;
    private String state;
    private String country;
    private LocalDateTime createdAt;
    private List<OrderItemDto> items;
    private Integer productCount;

    @Data @Builder
    public static class OrderItemDto {
        private Long id;
        private Long productId;
        private String productName;
        private Integer quantity;
        private Double price;
        private Double discount;
    }

    public static OrderDto from(Order o) {
        List<OrderItemDto> itemDtos = null;
        if (o.getItems() != null) {
            itemDtos = o.getItems().stream().map(i -> OrderItemDto.builder()
                    .id(i.getId())
                    .productId(i.getProduct().getId())
                    .productName(i.getProduct().getName())
                    .quantity(i.getQuantity())
                    .price(i.getPrice())
                    .discount(i.getDiscount())
                    .build()).collect(Collectors.toList());
        }
        return OrderDto.builder()
                .id(o.getId())
                .userId(o.getUser().getId())
                .customerName(o.getUser().getName())
                .storeId(o.getStore() != null ? o.getStore().getId() : null)
                .storeName(o.getStore() != null ? o.getStore().getName() : null)
                .status(o.getStatus().name())
                .grandTotal(o.getGrandTotal())
                .discount(o.getDiscount())
                .tax(o.getTax())
                .shippingCost(o.getShippingCost())
                .paymentMethod(o.getPaymentMethod())
                .city(o.getCity())
                .state(o.getState())
                .country(o.getCountry())
                .createdAt(o.getCreatedAt())
                .items(itemDtos)
                .productCount(itemDtos != null ? itemDtos.size() : 0)
                .build();
    }
}
