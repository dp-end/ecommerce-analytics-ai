package com.E_Commerce.demo.dto.response;

import com.E_Commerce.demo.entity.Category;
import lombok.Builder;
import lombok.Data;

@Data @Builder
public class CategoryDto {
    private Long id;
    private String name;
    private String description;
    private Long parentId;
    private String parentName;

    public static CategoryDto from(Category c) {
        return CategoryDto.builder()
                .id(c.getId())
                .name(c.getName())
                .description(c.getDescription())
                .parentId(c.getParent() != null ? c.getParent().getId() : null)
                .parentName(c.getParent() != null ? c.getParent().getName() : null)
                .build();
    }
}
