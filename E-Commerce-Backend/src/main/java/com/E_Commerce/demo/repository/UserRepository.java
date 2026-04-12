package com.E_Commerce.demo.repository;

import com.E_Commerce.demo.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findByRoleType(User.RoleType roleType);
    List<User> findByStatus(User.UserStatus status);

    @Query("SELECT u FROM User u WHERE " +
           "(:search = '' OR LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:role IS NULL OR u.roleType = :role)")
    Page<User> searchUsers(@Param("search") String search,
                           @Param("role") User.RoleType role,
                           Pageable pageable);
}
