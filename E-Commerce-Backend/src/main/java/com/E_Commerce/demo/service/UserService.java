package com.E_Commerce.demo.service;

import com.E_Commerce.demo.dto.response.CustomerProfileDto;
import com.E_Commerce.demo.dto.response.PageResponse;
import com.E_Commerce.demo.dto.response.UserDto;
import com.E_Commerce.demo.entity.CustomerProfile;
import com.E_Commerce.demo.entity.User;
import com.E_Commerce.demo.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ShipmentRepository shipmentRepository;
    private final ReviewRepository reviewRepository;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final FavoriteRepository favoriteRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final NotificationRepository notificationRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;

    public PageResponse<UserDto> getAll(int page, int size, String search, String role) {
        User.RoleType roleType = (role != null && !role.isBlank() && !role.equalsIgnoreCase("all"))
                ? User.RoleType.valueOf(role.toUpperCase())
                : null;
        Page<User> result = userRepository.searchUsers(
                search == null ? "" : search,
                roleType,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"))
        );
        return new PageResponse<>(
                result.getContent().stream().map(UserDto::from).toList(),
                result.getTotalPages(),
                result.getTotalElements(),
                result.getNumber(),
                result.getSize()
        );
    }

    public UserDto getById(Long id) {
        return UserDto.from(userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id)));
    }

    public UserDto getById(Long id, String callerEmail) {
        User caller = getCaller(callerEmail);
        ensureAdminOrSelf(caller, id);
        return getById(id);
    }

    public UserDto getByEmail(String email) {
        return UserDto.from(userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email)));
    }

    public List<UserDto> getByRole(String role) {
        return userRepository.findByRoleType(User.RoleType.valueOf(role)).stream().map(UserDto::from).toList();
    }

    @Transactional
    public UserDto updateStatus(Long id, String status) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));
        user.setStatus(User.UserStatus.valueOf(status));
        return UserDto.from(userRepository.save(user));
    }

    @Transactional
    public UserDto updateUser(Long id, String name, String email, String avatar, String gender) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));
        if (name != null) user.setName(name);
        if (email != null) user.setEmail(email);
        if (avatar != null) user.setAvatar(avatar);
        if (gender != null) user.setGender(gender);
        return UserDto.from(userRepository.save(user));
    }

    @Transactional
    public UserDto updateUser(Long id, String name, String email, String avatar, String gender, String callerEmail) {
        User caller = getCaller(callerEmail);
        ensureAdminOrSelf(caller, id);
        return updateUser(id, name, email, avatar, gender);
    }

    @Transactional
    public void changePassword(Long id, String currentPassword, String newPassword) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new RuntimeException("Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Transactional
    public void changePassword(Long id, String currentPassword, String newPassword, String callerEmail) {
        User caller = getCaller(callerEmail);
        ensureAdminOrSelf(caller, id);
        changePassword(id, currentPassword, newPassword);
    }

    @Transactional
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + id));

        // 1. Favorites by this user
        favoriteRepository.deleteAll(favoriteRepository.findByUserId(id));

        // 2. Reviews written by this user
        reviewRepository.deleteAll(reviewRepository.findByUserId(id));

        // 3. Auth/session and account-owned side data
        refreshTokenRepository.deleteByUser(user);
        notificationRepository.deleteByUserId(id);
        auditLogRepository.detachUser(id);

        // 2. Orders by this user → order_items + shipments first
        var userOrders = orderRepository.findByUserId(id);
        for (var order : userOrders) {
            orderItemRepository.deleteAll(orderItemRepository.findByOrderId(order.getId()));
            shipmentRepository.findByOrderId(order.getId()).ifPresent(shipmentRepository::delete);
        }
        orderRepository.deleteAll(userOrders);

        // 3. Stores owned by this user → products → order_items + reviews + favorites for those products
        var stores = storeRepository.findByOwnerId(id);
        for (var store : stores) {
            var products = productRepository.findByStoreId(store.getId());
            for (var product : products) {
                orderItemRepository.deleteAll(orderItemRepository.findByProductId(product.getId()));
                reviewRepository.deleteAll(reviewRepository.findByProductId(product.getId()));
                favoriteRepository.deleteAll(favoriteRepository.findByProductId(product.getId()));
            }
            productRepository.deleteAll(products);
            var storeOrders = orderRepository.findByStoreId(store.getId());
            for (var order : storeOrders) {
                order.setStore(null);
            }
            orderRepository.saveAll(storeOrders);
        }
        storeRepository.deleteAll(stores);

        // 4. User (customer_profile auto-cascaded via CascadeType.ALL)
        userRepository.delete(user);
    }

    @Transactional
    public void deleteCurrentUser(String callerEmail) {
        User caller = getCaller(callerEmail);
        deleteUser(caller.getId());
    }

    public CustomerProfileDto getProfile(Long userId) {
        return CustomerProfileDto.from(
                customerProfileRepository.findByUserId(userId)
                        .orElseThrow(() -> new RuntimeException("Profile not found for user: " + userId))
        );
    }

    public CustomerProfileDto getProfile(Long userId, String callerEmail) {
        User caller = getCaller(callerEmail);
        ensureAdminOrSelf(caller, userId);
        return getProfile(userId);
    }

    @Transactional
    public CustomerProfileDto updateProfile(Long userId, CustomerProfile updates) {
        CustomerProfile profile = customerProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Profile not found for user: " + userId));
        if (updates.getCity() != null) profile.setCity(updates.getCity());
        if (updates.getAge() != null) profile.setAge(updates.getAge());
        if (updates.getMembershipType() != null) profile.setMembershipType(updates.getMembershipType());
        if (updates.getTotalSpend() != null) profile.setTotalSpend(updates.getTotalSpend());
        if (updates.getSatisfactionLevel() != null) profile.setSatisfactionLevel(updates.getSatisfactionLevel());
        return CustomerProfileDto.from(customerProfileRepository.save(profile));
    }

    @Transactional
    public CustomerProfileDto updateProfile(Long userId, CustomerProfile updates, String callerEmail) {
        User caller = getCaller(callerEmail);
        ensureAdminOrSelf(caller, userId);
        return updateProfile(userId, updates);
    }

    private User getCaller(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));
    }

    private void ensureAdminOrSelf(User caller, Long targetUserId) {
        if (caller.getRoleType() == User.RoleType.ADMIN || caller.getId().equals(targetUserId)) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only access your own user data");
    }
}
