package com.E_Commerce.demo.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StoreAccountDto {
    private Long userId;
    private String ownerName;
    private String email;
    private Long storeId;
    private String storeName;
    private String status;
    private String createdAt;
}
