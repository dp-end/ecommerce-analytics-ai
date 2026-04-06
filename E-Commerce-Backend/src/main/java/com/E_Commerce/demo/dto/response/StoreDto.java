package com.E_Commerce.demo.dto.response;

import com.E_Commerce.demo.entity.Store;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data @Builder
public class StoreDto {
    private Long id;
    private String name;
    private Long ownerId;
    private String ownerName;
    private String status;
    private String category;
    private Double rating;
    private LocalDateTime createdAt;

    public static StoreDto from(Store s) {
        return StoreDto.builder()
                .id(s.getId())
                .name(s.getName())
                .ownerId(s.getOwner().getId())
                .ownerName(s.getOwner().getName())
                .status(s.getStatus().name())
                .category(s.getCategory())
                .rating(s.getRating())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
