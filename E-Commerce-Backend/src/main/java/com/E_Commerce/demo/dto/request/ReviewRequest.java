package com.E_Commerce.demo.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ReviewRequest {
    @NotNull
    private Long productId;

    @NotNull @Min(1) @Max(5)
    private Integer starRating;

    @NotBlank(message = "Comment text cannot be empty")
    @Size(max = 2000, message = "Comment must be at most 2000 characters")
    private String reviewText;

    private String reviewHeadline;
    private String marketplace;
    private Boolean verifiedPurchase;
    private Boolean vine;
}
