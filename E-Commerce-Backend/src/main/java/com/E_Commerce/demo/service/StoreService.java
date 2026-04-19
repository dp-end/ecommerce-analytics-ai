package com.E_Commerce.demo.service;

import com.E_Commerce.demo.dto.request.StoreRequest;
import com.E_Commerce.demo.dto.response.StoreDto;
import com.E_Commerce.demo.entity.Store;
import com.E_Commerce.demo.entity.User;
import com.E_Commerce.demo.repository.StoreRepository;
import com.E_Commerce.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StoreService {

    private final StoreRepository storeRepository;
    private final UserRepository userRepository;

    public List<StoreDto> getAll() {
        return storeRepository.findAll().stream().map(StoreDto::from).toList();
    }

    public List<StoreDto> getAll(String callerEmail) {
        User caller = getCaller(callerEmail);
        if (caller.getRoleType() == User.RoleType.ADMIN) {
            return getAll();
        }
        return storeRepository.findByOwnerId(caller.getId()).stream().map(StoreDto::from).toList();
    }

    public StoreDto getById(Long id) {
        return StoreDto.from(storeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Store not found: " + id)));
    }

    public StoreDto getById(Long id, String callerEmail) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Store not found: " + id));
        ensureAdminOrOwner(getCaller(callerEmail), store);
        return StoreDto.from(store);
    }

    public List<StoreDto> getByOwner(Long ownerId) {
        return storeRepository.findByOwnerId(ownerId).stream().map(StoreDto::from).toList();
    }

    public List<StoreDto> getByOwner(Long ownerId, String callerEmail) {
        User caller = getCaller(callerEmail);
        if (caller.getRoleType() != User.RoleType.ADMIN && !caller.getId().equals(ownerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only access your own stores");
        }
        return getByOwner(ownerId);
    }

    public List<StoreDto> getByOwnerEmail(String email) {
        User owner = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
        return storeRepository.findByOwnerId(owner.getId()).stream().map(StoreDto::from).toList();
    }

    @Transactional
    public StoreDto create(StoreRequest request, String ownerEmail) {
        User owner = userRepository.findByEmail(ownerEmail)
                .orElseThrow(() -> new RuntimeException("User not found: " + ownerEmail));
        Store store = Store.builder()
                .name(request.getName())
                .owner(owner)
                .category(request.getCategory())
                .build();
        return StoreDto.from(storeRepository.save(store));
    }

    @Transactional
    public StoreDto update(Long id, StoreRequest request) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Store not found: " + id));
        store.setName(request.getName());
        if (request.getCategory() != null) store.setCategory(request.getCategory());
        return StoreDto.from(storeRepository.save(store));
    }

    @Transactional
    public StoreDto update(Long id, StoreRequest request, String callerEmail) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Store not found: " + id));
        ensureAdminOrOwner(getCaller(callerEmail), store);
        store.setName(request.getName());
        if (request.getCategory() != null) store.setCategory(request.getCategory());
        return StoreDto.from(storeRepository.save(store));
    }

    @Transactional
    public StoreDto updateStatus(Long id, String status) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Store not found: " + id));
        store.setStatus(Store.StoreStatus.valueOf(status));
        return StoreDto.from(storeRepository.save(store));
    }

    @Transactional
    public void delete(Long id) {
        storeRepository.deleteById(id);
    }

    private User getCaller(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));
    }

    private void ensureAdminOrOwner(User caller, Store store) {
        if (caller.getRoleType() == User.RoleType.ADMIN
                || (store.getOwner() != null && store.getOwner().getId().equals(caller.getId()))) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only access your own store");
    }
}
