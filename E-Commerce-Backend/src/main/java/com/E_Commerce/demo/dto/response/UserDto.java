package com.E_Commerce.demo.dto.response;

import com.E_Commerce.demo.entity.User;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data @Builder
public class UserDto {
    private Long id;
    private String name;
    private String email;
    private String roleType;
    private String gender;
    private String avatar;
    private String status;
    private LocalDateTime createdAt;

    public static UserDto from(User u) {
        return UserDto.builder()
                .id(u.getId())
                .name(u.getName())
                .email(u.getEmail())
                .roleType(u.getRoleType().name())
                .gender(u.getGender())
                .avatar(u.getAvatar())
                .status(u.getStatus().name())
                .createdAt(u.getCreatedAt())
                .build();
    }
}
