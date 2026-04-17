package com.E_Commerce.demo.service;

import com.E_Commerce.demo.dto.request.CategoryRequest;
import com.E_Commerce.demo.dto.response.CategoryDto;
import com.E_Commerce.demo.entity.Category;
import com.E_Commerce.demo.repository.CategoryRepository;
import com.E_Commerce.demo.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    public List<CategoryDto> getAll() {
        return categoryRepository.findAll().stream().map(CategoryDto::from).toList();
    }

    public List<CategoryDto> getRootCategories() {
        return categoryRepository.findByParentIsNull().stream().map(CategoryDto::from).toList();
    }

    public List<CategoryDto> getChildren(Long parentId) {
        return categoryRepository.findByParentId(parentId).stream().map(CategoryDto::from).toList();
    }

    public CategoryDto getById(Long id) {
        return CategoryDto.from(categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found: " + id)));
    }

    @Transactional
    public CategoryDto create(CategoryRequest request) {
        Category parent = request.getParentId() != null
                ? categoryRepository.findById(request.getParentId()).orElse(null)
                : null;
        Category category = Category.builder()
                .name(request.getName())
                .description(request.getDescription())
                .parent(parent)
                .build();
        return CategoryDto.from(categoryRepository.save(category));
    }

    @Transactional
    public CategoryDto update(Long id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found: " + id));
        category.setName(request.getName());
        if (request.getDescription() != null) category.setDescription(request.getDescription());
        if (request.getParentId() != null) {
            category.setParent(categoryRepository.findById(request.getParentId()).orElse(null));
        }
        return CategoryDto.from(categoryRepository.save(category));
    }

    @Transactional
    public void delete(Long id) {
        productRepository.nullifyCategoryId(id);
        categoryRepository.deleteById(id);
    }
}
