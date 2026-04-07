package com.E_Commerce.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class ProductRequest {
    private Long storeId;
    private Long categoryId;
    private String sku;

    @NotBlank
    private String name;

    @NotNull @Positive
    private Double unitPrice;

    private Integer stock = 0;
    private String description;
    private String emoji;
    private String imageUrl;
}
