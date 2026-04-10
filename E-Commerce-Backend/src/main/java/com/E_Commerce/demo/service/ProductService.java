package com.E_Commerce.demo.service;

import com.E_Commerce.demo.dto.request.ProductRequest;
import com.E_Commerce.demo.dto.response.ProductDto;
import com.E_Commerce.demo.entity.Category;
import com.E_Commerce.demo.entity.Product;
import com.E_Commerce.demo.entity.Store;
import com.E_Commerce.demo.entity.User;
import com.E_Commerce.demo.repository.CategoryRepository;
import com.E_Commerce.demo.repository.ProductRepository;
import com.E_Commerce.demo.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository productRepository;
    private final StoreRepository storeRepository;
    private final CategoryRepository categoryRepository;

    public List<ProductDto> getAll() {
        return productRepository.findAll().stream().map(ProductDto::from).toList();
    }

    public ProductDto getById(Long id) {
        return ProductDto.from(productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found: " + id)));
    }

    public List<ProductDto> getByStore(Long storeId) {
        return productRepository.findByStoreId(storeId).stream().map(ProductDto::from).toList();
    }

    public List<ProductDto> getByCategory(Long categoryId) {
        return productRepository.findByCategoryId(categoryId).stream().map(ProductDto::from).toList();
    }

    public List<ProductDto> search(String keyword) {
        return productRepository.searchByName(keyword).stream().map(ProductDto::from).toList();
    }

    public List<ProductDto> getMyProducts(User currentUser) {
        List<Long> storeIds = storeRepository.findByOwnerId(currentUser.getId())
                .stream().map(Store::getId).toList();
        if (storeIds.isEmpty()) return List.of();
        return productRepository.findByStoreIdIn(storeIds).stream().map(ProductDto::from).toList();
    }

    public List<ProductDto> getLowStock(Integer threshold) {
        return productRepository.findByStockLessThanEqual(threshold != null ? threshold : 10)
                .stream().map(ProductDto::from).toList();
    }

    @Transactional
    public ProductDto create(ProductRequest request) {
        Store store = request.getStoreId() != null
                ? storeRepository.findById(request.getStoreId())
                        .orElseThrow(() -> new RuntimeException("Store not found: " + request.getStoreId()))
                : null;
        Category category = request.getCategoryId() != null
                ? categoryRepository.findById(request.getCategoryId())
                        .orElseThrow(() -> new RuntimeException("Category not found: " + request.getCategoryId()))
                : null;

        Product product = Product.builder()
                .name(request.getName())
                .store(store)
                .category(category)
                .sku(request.getSku())
                .unitPrice(request.getUnitPrice())
                .stock(request.getStock() != null ? request.getStock() : 0)
                .description(request.getDescription())
                .emoji(request.getEmoji())
                .imageUrl(request.getImageUrl())
                .build();
        return ProductDto.from(productRepository.save(product));
    }

    @Transactional
    public ProductDto update(Long id, ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found: " + id));
        product.setName(request.getName());
        product.setUnitPrice(request.getUnitPrice());
        if (request.getStock() != null) product.setStock(request.getStock());
        if (request.getDescription() != null) product.setDescription(request.getDescription());
        if (request.getEmoji() != null) product.setEmoji(request.getEmoji());
        if (request.getSku() != null) product.setSku(request.getSku());
        if (request.getCategoryId() != null) {
            product.setCategory(categoryRepository.findById(request.getCategoryId()).orElse(null));
        }
        return ProductDto.from(productRepository.save(product));
    }

    @Transactional
    public void delete(Long id) {
        productRepository.deleteById(id);
    }
}
