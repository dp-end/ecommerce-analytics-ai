package com.E_Commerce.demo.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ProductRequest {
    private Long storeId;
    private Long categoryId;
    private String sku;

    @NotBlank(message = "Ürün adı boş olamaz")
    private String name;

    @NotNull(message = "Fiyat zorunludur")
    @DecimalMin(value = "0.01", message = "Fiyat 0.01'den büyük olmalıdır")
    private Double unitPrice;

    private Integer stock = 0;
    private String description;
    private String emoji;
    private String imageUrl;
}
