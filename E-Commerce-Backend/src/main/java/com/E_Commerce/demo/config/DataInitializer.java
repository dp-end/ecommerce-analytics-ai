package com.E_Commerce.demo.config;

import com.E_Commerce.demo.entity.Category;
import com.E_Commerce.demo.entity.CustomerProfile;
import com.E_Commerce.demo.entity.Product;
import com.E_Commerce.demo.entity.Store;
import com.E_Commerce.demo.entity.User;
import com.E_Commerce.demo.repository.CategoryRepository;
import com.E_Commerce.demo.repository.CustomerProfileRepository;
import com.E_Commerce.demo.repository.ProductRepository;
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
    private final ProductRepository productRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        createUserIfNotExists("Admin User",     "admin@datapulse.com",     "admin123",     User.RoleType.ADMIN);
        createUserIfNotExists("Corporate User", "corporate@datapulse.com", "corporate123", User.RoleType.CORPORATE);
        createUserIfNotExists("John Doe",       "user@datapulse.com",      "user123",      User.RoleType.INDIVIDUAL);

        createCategories();

        // Mevcut ya da yeni oluşturulan corporate kullanıcıya mağaza ve ürün ekle
        userRepository.findByEmail("corporate@datapulse.com").ifPresent(corp -> {
            createDefaultStore(corp);
            storeRepository.findByOwnerId(corp.getId()).stream().findFirst()
                    .ifPresent(this::seedDemoProducts);
        });

        log.info("─────────────────────────────────────────────────");
        log.info("  Test kullanıcıları:");
        log.info("  ADMIN      → admin@datapulse.com      / admin123");
        log.info("  CORPORATE  → corporate@datapulse.com  / corporate123");
        log.info("  INDIVIDUAL → user@datapulse.com       / user123");
        log.info("─────────────────────────────────────────────────");
    }

    private void createCategories() {
        List<String[]> cats = List.of(
            new String[]{"Books",             "Books, magazines and stationery"},
            new String[]{"Clothing",          "Men's and women's apparel"},
            new String[]{"Home & Kitchen",    "Kitchen tools and home essentials"},
            new String[]{"Sports & Outdoors", "Outdoor gear, fitness and camping"},
            new String[]{"Toys & Games",      "Games and entertainment for all ages"}
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

    private void seedDemoProducts(Store store) {
        if (!productRepository.findByStoreId(store.getId()).isEmpty()) return;
        List<Object[]> items = List.of(
            new Object[]{"Wireless Headphones",  89.99,  "🎧", 120},
            new Object[]{"Smart Watch",          199.99, "⌚", 45},
            new Object[]{"USB-C Hub",            34.99,  "🔌", 200},
            new Object[]{"Mechanical Keyboard",  129.99, "⌨️", 60},
            new Object[]{"Laptop Stand",         49.99,  "💻", 80},
            new Object[]{"Webcam HD",            79.99,  "📷", 55}
        );
        for (Object[] item : items) {
            productRepository.save(Product.builder()
                    .name((String) item[0])
                    .unitPrice((Double) item[1])
                    .emoji((String) item[2])
                    .stock((Integer) item[3])
                    .store(store)
                    .build());
        }
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
