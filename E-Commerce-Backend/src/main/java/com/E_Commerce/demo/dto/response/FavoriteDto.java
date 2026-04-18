package com.E_Commerce.demo.dto.response;

import com.E_Commerce.demo.entity.Favorite;
import com.E_Commerce.demo.entity.Product;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class FavoriteDto {

    private Long id;
    private Long productId;
    private String productName;
    private String productEmoji;
    private String productImageUrl;
    private Double productPrice;
    private Double productRating;
    private Integer productStock;
    private String categoryName;
    private String storeName;
    private LocalDateTime createdAt;

    public static FavoriteDto from(Favorite f) {
        Product p = f.getProduct();
        return FavoriteDto.builder()
                .id(f.getId())
                .productId(p.getId())
                .productName(p.getName())
                .productEmoji(p.getEmoji())
                .productImageUrl(p.getImageUrl())
                .productPrice(p.getUnitPrice())
                .productRating(p.getRating())
                .productStock(p.getStock())
                .categoryName(p.getCategory() != null ? p.getCategory().getName() : null)
                .storeName(p.getStore() != null ? p.getStore().getName() : null)
                .createdAt(f.getCreatedAt())
                .build();
    }
}
