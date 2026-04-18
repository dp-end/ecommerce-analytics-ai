package com.E_Commerce.demo.service;

import com.E_Commerce.demo.dto.response.FavoriteDto;
import com.E_Commerce.demo.entity.Favorite;
import com.E_Commerce.demo.entity.Product;
import com.E_Commerce.demo.entity.User;
import com.E_Commerce.demo.repository.FavoriteRepository;
import com.E_Commerce.demo.repository.ProductRepository;
import com.E_Commerce.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    public List<FavoriteDto> getFavorites(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        return favoriteRepository.findByUserId(user.getId())
                .stream().map(FavoriteDto::from).toList();
    }

    public List<Long> getFavoriteProductIds(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        return favoriteRepository.findByUserId(user.getId())
                .stream().map(f -> f.getProduct().getId()).toList();
    }

    @Transactional
    public FavoriteDto addFavorite(String email, Long productId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found: " + productId));
        if (favoriteRepository.existsByUserIdAndProductId(user.getId(), productId)) {
            return favoriteRepository.findByUserIdAndProductId(user.getId(), productId)
                    .map(FavoriteDto::from).orElseThrow();
        }
        return FavoriteDto.from(favoriteRepository.save(
                Favorite.builder().user(user).product(product).build()));
    }

    @Transactional
    public void removeFavorite(String email, Long productId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        favoriteRepository.deleteByUserIdAndProductId(user.getId(), productId);
    }
}
