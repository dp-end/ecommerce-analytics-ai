package com.E_Commerce.demo.service;

import com.E_Commerce.demo.dto.request.ReviewRequest;
import com.E_Commerce.demo.dto.request.StoreReviewRequest;
import com.E_Commerce.demo.dto.response.PageResponse;
import com.E_Commerce.demo.dto.response.ReviewDto;
import com.E_Commerce.demo.entity.Product;
import com.E_Commerce.demo.entity.Review;
import com.E_Commerce.demo.entity.ReviewType;
import com.E_Commerce.demo.entity.Store;
import com.E_Commerce.demo.entity.User;
import com.E_Commerce.demo.repository.ProductRepository;
import com.E_Commerce.demo.repository.ReviewRepository;
import com.E_Commerce.demo.repository.StoreRepository;
import com.E_Commerce.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final StoreRepository storeRepository;

    public List<ReviewDto> getAll() {
        return reviewRepository.findAll().stream().map(ReviewDto::from).toList();
    }

    public PageResponse<ReviewDto> getAllPaged(Pageable pageable) {
        Page<Review> page = reviewRepository.findAll(pageable);
        return new PageResponse<>(
                page.getContent().stream().map(ReviewDto::from).toList(),
                page.getTotalPages(),
                page.getTotalElements(),
                page.getNumber(),
                page.getSize()
        );
    }

    public ReviewDto getById(Long id) {
        return ReviewDto.from(reviewRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found: " + id)));
    }

    public List<ReviewDto> getByProduct(Long productId) {
        if (!productRepository.existsById(productId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found: " + productId);
        }
        return reviewRepository.findByProductId(productId).stream().map(ReviewDto::from).toList();
    }

    public List<ReviewDto> getByUser(Long userId) {
        return reviewRepository.findByUserId(userId).stream().map(ReviewDto::from).toList();
    }

    public List<ReviewDto> getByStore(Long storeId) {
        List<Review> productReviews = reviewRepository.findByProductStoreId(storeId);
        List<Review> storeReviews   = reviewRepository.findByStoreId(storeId);
        return java.util.stream.Stream.concat(productReviews.stream(), storeReviews.stream())
                .distinct()
                .map(ReviewDto::from)
                .toList();
    }

    @Transactional
    public ReviewDto create(ReviewRequest request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found: " + request.getProductId()));

        Review review = Review.builder()
                .user(user)
                .product(product)
                .reviewType(ReviewType.PRODUCT)
                .starRating(request.getStarRating())
                .reviewText(request.getReviewText())
                .reviewHeadline(request.getReviewHeadline())
                .marketplace(request.getMarketplace())
                .verifiedPurchase(request.getVerifiedPurchase())
                .vine(request.getVine())
                .ownerLiked(false)
                .build();
        ReviewDto saved = ReviewDto.from(reviewRepository.save(review));

        Double avgRating = reviewRepository.avgRatingByProduct(product.getId());
        product.setRating(avgRating != null ? avgRating : 0.0);
        productRepository.save(product);

        return saved;
    }

    @Transactional
    public ReviewDto createStoreReview(StoreReviewRequest request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        Store store = storeRepository.findById(request.getStoreId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Store not found: " + request.getStoreId()));

        Review review = Review.builder()
                .user(user)
                .store(store)
                .reviewType(ReviewType.STORE)
                .starRating(request.getStarRating())
                .reviewText(request.getReviewText())
                .reviewHeadline(request.getReviewHeadline())
                .ownerLiked(false)
                .build();
        ReviewDto saved = ReviewDto.from(reviewRepository.save(review));

        Double avgRating = reviewRepository.avgRatingByStore(store.getId());
        store.setRating(avgRating != null ? avgRating : 0.0);
        storeRepository.save(store);

        return saved;
    }

    /** Admin-only hard delete */
    @Transactional
    public void delete(Long id) {
        reviewRepository.deleteById(id);
    }

    /**
     * Delete a review as the store owner of the product.
     * Also allowed by admins (checked separately via @PreAuthorize).
     */
    @Transactional
    public void deleteByOwner(Long reviewId, String callerEmail) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found: " + reviewId));

        User caller = userRepository.findByEmail(callerEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        boolean isAdmin = caller.getRoleType() == User.RoleType.ADMIN;
        Store owningStore = review.getStore() != null
                ? review.getStore()
                : (review.getProduct() != null ? review.getProduct().getStore() : null);
        boolean isOwner = owningStore != null
                && owningStore.getOwner().getId().equals(caller.getId());

        if (!isAdmin && !isOwner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only the store owner or an admin can delete this review");
        }

        reviewRepository.deleteById(reviewId);
    }

    /**
     * Toggle owner endorsement on a review.
     * Only the store owner of the product may call this.
     */
    @Transactional
    public ReviewDto toggleOwnerLike(Long reviewId, String callerEmail) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found: " + reviewId));

        User caller = userRepository.findByEmail(callerEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Store owningStore = review.getStore() != null
                ? review.getStore()
                : (review.getProduct() != null ? review.getProduct().getStore() : null);
        if (owningStore == null || !owningStore.getOwner().getId().equals(caller.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only the store owner can endorse this review");
        }

        review.setOwnerLiked(!Boolean.TRUE.equals(review.getOwnerLiked()));
        return ReviewDto.from(reviewRepository.save(review));
    }
}
