package com.E_Commerce.demo.dto.response;

import com.E_Commerce.demo.entity.Review;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data @Builder
public class ReviewDto {
    private Long id;
    private Long userId;
    private String customerName;
    private Long productId;
    private String productName;
    private Integer starRating;
    private String reviewText;
    private Integer helpful;
    private Integer helpfulVotes;
    private Integer totalVotes;
    private String sentiment;
    private String marketplace;
    private String reviewHeadline;
    private Boolean verifiedPurchase;
    private Boolean vine;
    private Boolean ownerLiked;
    private LocalDateTime createdAt;

    public static ReviewDto from(Review r) {
        return ReviewDto.builder()
                .id(r.getId())
                .userId(r.getUser().getId())
                .customerName(r.getUser().getName())
                .productId(r.getProduct().getId())
                .productName(r.getProduct().getName())
                .starRating(r.getStarRating())
                .reviewText(r.getReviewText())
                .helpful(r.getHelpful())
                .helpfulVotes(r.getHelpfulVotes())
                .totalVotes(r.getTotalVotes())
                .sentiment(r.getSentiment())
                .marketplace(r.getMarketplace())
                .reviewHeadline(r.getReviewHeadline())
                .verifiedPurchase(r.getVerifiedPurchase())
                .vine(r.getVine())
                .ownerLiked(r.getOwnerLiked() != null ? r.getOwnerLiked() : false)
                .createdAt(r.getCreatedAt())
                .build();
    }
}
