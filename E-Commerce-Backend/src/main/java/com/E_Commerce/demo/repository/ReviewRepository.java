package com.E_Commerce.demo.repository;

import com.E_Commerce.demo.entity.Review;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    @EntityGraph(attributePaths = {"user", "product", "product.store", "store"})
    List<Review> findByProductIdOrderByCreatedAtDesc(Long productId);

    @EntityGraph(attributePaths = {"user", "product", "product.store", "store"})
    List<Review> findByProductId(Long productId);

    @EntityGraph(attributePaths = {"user", "product", "product.store", "store"})
    List<Review> findByUserId(Long userId);

    @EntityGraph(attributePaths = {"user", "product", "product.store", "store"})
    List<Review> findByProductStoreId(Long storeId);

    @Query("SELECT AVG(r.starRating) FROM Review r WHERE r.product.id = :productId")
    Double avgRatingByProduct(@Param("productId") Long productId);

    @Query("SELECT AVG(r.starRating) FROM Review r WHERE r.product.store.id = :storeId OR r.store.id = :storeId")
    Double avgRatingByStore(@Param("storeId") Long storeId);

    @EntityGraph(attributePaths = {"user", "product", "product.store", "store"})
    List<Review> findByStoreId(Long storeId);
}
