package com.E_Commerce.demo.service;

import com.E_Commerce.demo.dto.request.ReviewRequest;
import com.E_Commerce.demo.dto.response.ReviewDto;
import com.E_Commerce.demo.entity.Product;
import com.E_Commerce.demo.entity.Review;
import com.E_Commerce.demo.entity.User;
import com.E_Commerce.demo.repository.ProductRepository;
import com.E_Commerce.demo.repository.ReviewRepository;
import com.E_Commerce.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    public List<ReviewDto> getAll() {
        return reviewRepository.findAll().stream().map(ReviewDto::from).toList();
    }

    public ReviewDto getById(Long id) {
        return ReviewDto.from(reviewRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Review not found: " + id)));
    }

    public List<ReviewDto> getByProduct(Long productId) {
        return reviewRepository.findByProductId(productId).stream().map(ReviewDto::from).toList();
    }

    public List<ReviewDto> getByUser(Long userId) {
        return reviewRepository.findByUserId(userId).stream().map(ReviewDto::from).toList();
    }

    public List<ReviewDto> getByStore(Long storeId) {
        return reviewRepository.findByProductStoreId(storeId).stream().map(ReviewDto::from).toList();
    }

    @Transactional
    public ReviewDto create(ReviewRequest request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found: " + userEmail));
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found: " + request.getProductId()));

        Review review = Review.builder()
                .user(user)
                .product(product)
                .starRating(request.getStarRating())
                .reviewText(request.getReviewText())
                .build();
        ReviewDto saved = ReviewDto.from(reviewRepository.save(review));

        Double avgRating = reviewRepository.avgRatingByProduct(product.getId());
        product.setRating(avgRating != null ? avgRating : 0.0);
        productRepository.save(product);

        return saved;
    }

    @Transactional
    public void delete(Long id) {
        reviewRepository.deleteById(id);
    }
}
