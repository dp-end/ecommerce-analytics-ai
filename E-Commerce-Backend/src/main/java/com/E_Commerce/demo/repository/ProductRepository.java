package com.E_Commerce.demo.repository;

import com.E_Commerce.demo.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByStoreId(Long storeId);
    List<Product> findByStoreIdIn(List<Long> storeIds);
    List<Product> findByCategoryId(Long categoryId);
    List<Product> findByStockLessThanEqual(Integer threshold);

    @Query("SELECT p FROM Product p WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Product> searchByName(@Param("keyword") String keyword);

    @Query("SELECT p FROM Product p WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Product> searchByName(@Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.category.id = :categoryId AND LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Product> searchByCategoryAndName(@Param("categoryId") Long categoryId, @Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.store.id = :storeId AND LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Product> searchByStoreAndName(@Param("storeId") Long storeId, @Param("keyword") String keyword, Pageable pageable);

    Page<Product> findByStoreId(Long storeId, Pageable pageable);
    Page<Product> findByCategoryId(Long categoryId, Pageable pageable);
    Page<Product> findByStoreIdIn(List<Long> storeIds, Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.store.id IN :storeIds AND LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Product> searchByStoreIdsAndName(@Param("storeIds") List<Long> storeIds, @Param("keyword") String keyword, Pageable pageable);

    Page<Product> findByStoreIdInAndCategoryId(List<Long> storeIds, Long categoryId, Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.store.id IN :storeIds AND p.category.id = :categoryId AND LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Product> searchByStoreIdsAndCategoryAndName(
            @Param("storeIds") List<Long> storeIds,
            @Param("categoryId") Long categoryId,
            @Param("keyword") String keyword,
            Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.store.id = :storeId AND LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Product> searchByStoreAndName(@Param("storeId") Long storeId, @Param("keyword") String keyword);

    @Modifying
    @Query("UPDATE Product p SET p.category = null WHERE p.category.id = :categoryId")
    void nullifyCategoryId(@Param("categoryId") Long categoryId);
}
