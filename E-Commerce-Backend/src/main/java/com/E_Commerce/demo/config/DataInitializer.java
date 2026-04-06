package com.E_Commerce.demo.config;

import com.E_Commerce.demo.entity.CustomerProfile;
import com.E_Commerce.demo.entity.User;
import com.E_Commerce.demo.repository.CustomerProfileRepository;
import com.E_Commerce.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        createUserIfNotExists("Admin User",     "admin@datapulse.com",     "admin123",     User.RoleType.ADMIN);
        createUserIfNotExists("Corporate User", "corporate@datapulse.com", "corporate123", User.RoleType.CORPORATE);
        createUserIfNotExists("John Doe",       "user@datapulse.com",      "user123",      User.RoleType.INDIVIDUAL);
        log.info("─────────────────────────────────────────────────");
        log.info("  Test kullanıcıları:");
        log.info("  ADMIN      → admin@datapulse.com      / admin123");
        log.info("  CORPORATE  → corporate@datapulse.com  / corporate123");
        log.info("  INDIVIDUAL → user@datapulse.com       / user123");
        log.info("─────────────────────────────────────────────────");
    }

    private void createUserIfNotExists(String name, String email, String password, User.RoleType role) {
        if (userRepository.existsByEmail(email)) return;

        User user = User.builder()
                .name(name)
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .roleType(role)
                .build();
        userRepository.save(user);

        CustomerProfile profile = CustomerProfile.builder()
                .user(user)
                .build();
        customerProfileRepository.save(profile);
    }
}
