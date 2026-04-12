package com.E_Commerce.demo.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class OrderRequest {
    private Long storeId;
    private String paymentMethod;
    private Double discount;
    private Double tax;
    private Double shippingCost;
    private String city;
    private String state;
    private String country;

    @NotEmpty
    private List<OrderItemRequest> items;

    @Data
    public static class OrderItemRequest {
        private Long productId;
        private Integer quantity;
        private Double discount;
    }
}
