package com.E_Commerce.demo.dto.response;

import com.E_Commerce.demo.entity.Product;
import lombok.Builder;
import lombok.Data;

@Data @Builder
public class ProductDto {
    private Long id;
    private Long storeId;
    private String storeName;
    private Long categoryId;
    private String categoryName;
    private String sku;
    private String name;
    private Double unitPrice;
    private Integer stock;
    private String description;
    private String emoji;
    private Double rating;

    public static ProductDto from(Product p) {
        return ProductDto.builder()
                .id(p.getId())
                .storeId(p.getStore() != null ? p.getStore().getId() : null)
                .storeName(p.getStore() != null ? p.getStore().getName() : null)
                .categoryId(p.getCategory() != null ? p.getCategory().getId() : null)
                .categoryName(p.getCategory() != null ? p.getCategory().getName() : null)
                .sku(p.getSku())
                .name(p.getName())
                .unitPrice(p.getUnitPrice())
                .stock(p.getStock())
                .description(p.getDescription())
                .emoji(p.getEmoji())
                .rating(p.getRating())
                .build();
    }
}
