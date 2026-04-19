package com.E_Commerce.demo.controller;

import com.E_Commerce.demo.dto.request.ReviewRequest;
import com.E_Commerce.demo.dto.request.StoreReviewRequest;
import com.E_Commerce.demo.dto.response.PageResponse;
import com.E_Commerce.demo.dto.response.ReviewDto;
import com.E_Commerce.demo.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @GetMapping
    public ResponseEntity<List<ReviewDto>> getAll() {
        return ResponseEntity.ok(reviewService.getAll());
    }

    @GetMapping("/paged")
    public ResponseEntity<PageResponse<ReviewDto>> getAllPaged(
            @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        return ResponseEntity.ok(reviewService.getAllPaged(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReviewDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(reviewService.getById(id));
    }

    @GetMapping("/product/{productId}")
    public ResponseEntity<List<ReviewDto>> getByProduct(@PathVariable Long productId) {
        return ResponseEntity.ok(reviewService.getByProduct(productId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ReviewDto>> getByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(reviewService.getByUser(userId));
    }

    @GetMapping("/store/{storeId}")
    public ResponseEntity<List<ReviewDto>> getByStore(@PathVariable Long storeId) {
        return ResponseEntity.ok(reviewService.getByStore(storeId));
    }

    @PostMapping("/store")
    public ResponseEntity<ReviewDto> createStoreReview(
            @Valid @RequestBody StoreReviewRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reviewService.createStoreReview(request, userDetails.getUsername()));
    }

    @PostMapping
    public ResponseEntity<ReviewDto> create(
            @Valid @RequestBody ReviewRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reviewService.create(request, userDetails.getUsername()));
    }

    /**
     * Delete a review — permitted for:
     *   - the store owner of the product this review belongs to
     *   - admins (resolved inside service via role check)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        reviewService.deleteByOwner(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    /**
     * Toggle store-owner endorsement on a review.
     * 403 if caller is not the store owner of the product.
     */
    @PostMapping("/{id}/like")
    public ResponseEntity<ReviewDto> toggleOwnerLike(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(reviewService.toggleOwnerLike(id, userDetails.getUsername()));
    }
}
