package com.E_Commerce.demo.service;

import com.E_Commerce.demo.dto.request.ProductRequest;
import com.E_Commerce.demo.dto.response.ProductDto;
import com.E_Commerce.demo.entity.Category;
import com.E_Commerce.demo.entity.Product;
import com.E_Commerce.demo.entity.Store;
import com.E_Commerce.demo.repository.CategoryRepository;
import com.E_Commerce.demo.repository.FavoriteRepository;
import com.E_Commerce.demo.repository.ProductRepository;
import com.E_Commerce.demo.repository.ReviewRepository;
import com.E_Commerce.demo.repository.StoreRepository;
import com.E_Commerce.demo.repository.UserRepository;
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
    private final UserRepository userRepository;
    private final FavoriteRepository favoriteRepository;
    private final ReviewRepository reviewRepository;

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

    public List<ProductDto> getMyProducts(String email) {
        var owner = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        List<Long> storeIds = storeRepository.findByOwnerId(owner.getId())
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
                .brand(request.getBrand())
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
        if (request.getBrand() != null) product.setBrand(request.getBrand());
        if (request.getCategoryId() != null) {
            product.setCategory(categoryRepository.findById(request.getCategoryId()).orElse(null));
        }
        return ProductDto.from(productRepository.save(product));
    }

    @Transactional
    public void delete(Long id) {
        favoriteRepository.deleteAll(favoriteRepository.findByProductId(id));
        reviewRepository.deleteAll(reviewRepository.findByProductId(id));
        productRepository.deleteById(id);
    }
}
