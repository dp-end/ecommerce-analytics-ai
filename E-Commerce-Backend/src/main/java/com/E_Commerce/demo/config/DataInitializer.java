package com.E_Commerce.demo.config;

import com.E_Commerce.demo.entity.Category;
import com.E_Commerce.demo.entity.CustomerProfile;
import com.E_Commerce.demo.entity.Store;
import com.E_Commerce.demo.entity.User;
import com.E_Commerce.demo.repository.CategoryRepository;
import com.E_Commerce.demo.repository.CustomerProfileRepository;
import com.E_Commerce.demo.repository.StoreRepository;
import com.E_Commerce.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final CategoryRepository categoryRepository;
    private final StoreRepository storeRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        createUserIfNotExists("Admin User",     "admin@datapulse.com",     "admin123",     User.RoleType.ADMIN);
        createUserIfNotExists("Corporate User", "corporate@datapulse.com", "corporate123", User.RoleType.CORPORATE);
        createUserIfNotExists("John Doe",       "user@datapulse.com",      "user123",      User.RoleType.INDIVIDUAL);

        createCategories();

        // Mevcut ya da yeni oluşturulan corporate kullanıcıya mağaza ekle
        userRepository.findByEmail("corporate@datapulse.com")
                .ifPresent(this::createDefaultStore);

        log.info("─────────────────────────────────────────────────");
        log.info("  Test kullanıcıları:");
        log.info("  ADMIN      → admin@datapulse.com      / admin123");
        log.info("  CORPORATE  → corporate@datapulse.com  / corporate123");
        log.info("  INDIVIDUAL → user@datapulse.com       / user123");
        log.info("─────────────────────────────────────────────────");
    }

    private void createCategories() {
        List<String[]> cats = List.of(
            new String[]{"Electronics",  "Phones, computers, gadgets"},
            new String[]{"Fashion",      "Clothing, shoes, accessories"},
            new String[]{"Food",         "Groceries and beverages"},
            new String[]{"Furniture",    "Home and office furniture"},
            new String[]{"Sports",       "Sports equipment and apparel"},
            new String[]{"Beauty",       "Cosmetics and personal care"},
            new String[]{"Home",         "Home appliances and decor"},
            new String[]{"Books",        "Books, magazines and stationery"},
            new String[]{"Toys",         "Toys and games"},
            new String[]{"Automotive",   "Car accessories and parts"}
        );
        for (String[] cat : cats) {
            if (categoryRepository.findByName(cat[0]).isEmpty()) {
                categoryRepository.save(Category.builder().name(cat[0]).description(cat[1]).build());
            }
        }
    }

    private void createDefaultStore(User owner) {
        if (owner == null) return;
        if (!storeRepository.findByOwnerId(owner.getId()).isEmpty()) return;
        storeRepository.save(Store.builder()
                .name("DataPulse Store")
                .owner(owner)
                .category("Electronics")
                .build());
    }

    /** Returns existing or newly created user */
    private User createUserIfNotExists(String name, String email, String password, User.RoleType role) {
        return userRepository.findByEmail(email).orElseGet(() -> {
            User user = userRepository.save(User.builder()
                    .name(name).email(email)
                    .passwordHash(passwordEncoder.encode(password))
                    .roleType(role).build());
            customerProfileRepository.save(CustomerProfile.builder().user(user).build());
            return user;
        });
    }
}
