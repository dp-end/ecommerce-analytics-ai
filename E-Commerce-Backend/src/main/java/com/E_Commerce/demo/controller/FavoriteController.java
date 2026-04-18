package com.E_Commerce.demo.controller;

import com.E_Commerce.demo.dto.response.FavoriteDto;
import com.E_Commerce.demo.service.FavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

    @GetMapping
    public ResponseEntity<List<FavoriteDto>> getFavorites(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(favoriteService.getFavorites(userDetails.getUsername()));
    }

    @GetMapping("/ids")
    public ResponseEntity<List<Long>> getFavoriteIds(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(favoriteService.getFavoriteProductIds(userDetails.getUsername()));
    }

    @PostMapping("/{productId}")
    public ResponseEntity<FavoriteDto> addFavorite(
            @PathVariable Long productId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(favoriteService.addFavorite(userDetails.getUsername(), productId));
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<Void> removeFavorite(
            @PathVariable Long productId,
            @AuthenticationPrincipal UserDetails userDetails) {
        favoriteService.removeFavorite(userDetails.getUsername(), productId);
        return ResponseEntity.noContent().build();
    }
}
