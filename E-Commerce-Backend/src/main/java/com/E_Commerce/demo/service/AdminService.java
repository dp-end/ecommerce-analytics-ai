package com.E_Commerce.demo.service;

import com.E_Commerce.demo.dto.request.StoreAccountRequest;
import com.E_Commerce.demo.dto.response.StoreAccountDto;
import com.E_Commerce.demo.entity.CustomerProfile;
import com.E_Commerce.demo.entity.Store;
import com.E_Commerce.demo.entity.User;
import com.E_Commerce.demo.repository.CustomerProfileRepository;
import com.E_Commerce.demo.repository.StoreRepository;
import com.E_Commerce.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final StoreRepository storeRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public StoreAccountDto createStoreAccount(StoreAccountRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Bu e-posta zaten kullanımda: " + request.getEmail());
        }

        User owner = User.builder()
                .name(request.getOwnerName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .roleType(User.RoleType.CORPORATE)
                .build();
        userRepository.save(owner);
        customerProfileRepository.save(CustomerProfile.builder().user(owner).build());

        Store store = Store.builder()
                .name(request.getStoreName())
                .owner(owner)
                .category(request.getCategory())
                .build();
        storeRepository.save(store);

        return StoreAccountDto.builder()
                .userId(owner.getId())
                .ownerName(owner.getName())
                .email(owner.getEmail())
                .storeId(store.getId())
                .storeName(store.getName())
                .status(store.getStatus().name())
                .createdAt(store.getCreatedAt() != null ? store.getCreatedAt().toString() : null)
                .build();
    }
}
