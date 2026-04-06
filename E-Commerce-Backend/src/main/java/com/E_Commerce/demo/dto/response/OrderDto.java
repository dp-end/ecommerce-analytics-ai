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
    private String paymentMethod;
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
                .paymentMethod(o.getPaymentMethod())
                .createdAt(o.getCreatedAt())
                .items(itemDtos)
                .productCount(itemDtos != null ? itemDtos.size() : 0)
                .build();
    }
}
