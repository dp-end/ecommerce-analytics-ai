package com.E_Commerce.demo.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class StoreReviewRequest {

    @NotNull
    private Long storeId;

    @NotNull @Min(1) @Max(5)
    private Integer starRating;

    @NotBlank(message = "Review text cannot be empty")
    @Size(max = 2000, message = "Review must be at most 2000 characters")
    private String reviewText;

    @Size(max = 200)
    private String reviewHeadline;
}
