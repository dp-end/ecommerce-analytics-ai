package com.E_Commerce.demo.service;

import com.E_Commerce.demo.dto.response.CustomerProfileDto;
import com.E_Commerce.demo.dto.response.PageResponse;
import com.E_Commerce.demo.dto.response.UserDto;
import com.E_Commerce.demo.entity.CustomerProfile;
import com.E_Commerce.demo.entity.User;
import com.E_Commerce.demo.repository.CustomerProfileRepository;
import com.E_Commerce.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final CustomerProfileRepository customerProfileRepository;

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
    public UserDto updateUser(Long id, String name, String avatar, String gender) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));
        if (name != null) user.setName(name);
        if (avatar != null) user.setAvatar(avatar);
        if (gender != null) user.setGender(gender);
        return UserDto.from(userRepository.save(user));
    }

    @Transactional
    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }

    public CustomerProfileDto getProfile(Long userId) {
        return CustomerProfileDto.from(
                customerProfileRepository.findByUserId(userId)
                        .orElseThrow(() -> new RuntimeException("Profile not found for user: " + userId))
        );
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
}
