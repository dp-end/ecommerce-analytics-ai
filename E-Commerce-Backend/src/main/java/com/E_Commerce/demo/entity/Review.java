package com.E_Commerce.demo.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "reviews")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "star_rating", nullable = false)
    private Integer starRating;

    @Column(name = "review_text", length = 2000)
    private String reviewText;

    @Builder.Default
    private Integer helpful = 0;

    private String sentiment;

    @Column(name = "helpful_votes")
    private Integer helpfulVotes;

    @Column(name = "total_votes")
    private Integer totalVotes;

    private String marketplace;

    @Column(name = "review_headline", length = 500)
    private String reviewHeadline;

    @Column(name = "verified_purchase")
    private Boolean verifiedPurchase;

    private Boolean vine;

    @Builder.Default
    @Column(name = "owner_liked", nullable = false)
    private Boolean ownerLiked = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
