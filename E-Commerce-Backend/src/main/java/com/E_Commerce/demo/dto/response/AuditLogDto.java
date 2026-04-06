package com.E_Commerce.demo.dto.response;

import com.E_Commerce.demo.entity.AuditLog;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data @Builder
public class AuditLogDto {
    private Long id;
    private String action;
    private Long userId;
    private String userName;
    private String type;
    private LocalDateTime createdAt;

    public static AuditLogDto from(AuditLog log) {
        return AuditLogDto.builder()
                .id(log.getId())
                .action(log.getAction())
                .userId(log.getUser() != null ? log.getUser().getId() : null)
                .userName(log.getUserName())
                .type(log.getType().name())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
