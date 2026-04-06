package com.E_Commerce.demo.repository;

import com.E_Commerce.demo.entity.CustomerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerProfileRepository extends JpaRepository<CustomerProfile, Long> {
    Optional<CustomerProfile> findByUserId(Long userId);
    List<CustomerProfile> findByMembershipType(CustomerProfile.MembershipType membershipType);
    List<CustomerProfile> findByCity(String city);
}
