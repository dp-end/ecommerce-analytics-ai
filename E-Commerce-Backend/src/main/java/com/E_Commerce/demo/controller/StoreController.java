package com.E_Commerce.demo.controller;

import com.E_Commerce.demo.dto.request.StoreRequest;
import com.E_Commerce.demo.dto.response.StoreDto;
import com.E_Commerce.demo.service.StoreService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stores")
@RequiredArgsConstructor
public class StoreController {

    private final StoreService storeService;

    @GetMapping
    public ResponseEntity<List<StoreDto>> getAll(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(storeService.getAll(userDetails.getUsername()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<StoreDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(storeService.getById(id));
    }

    @GetMapping("/owner/{ownerId}")
    public ResponseEntity<List<StoreDto>> getByOwner(
            @PathVariable Long ownerId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(storeService.getByOwner(ownerId, userDetails.getUsername()));
    }

    @GetMapping("/my")
    public ResponseEntity<List<StoreDto>> getMyStores(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(storeService.getByOwnerEmail(userDetails.getUsername()));
    }

    @PostMapping
    public ResponseEntity<StoreDto> create(
            @Valid @RequestBody StoreRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(storeService.create(request, userDetails.getUsername()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<StoreDto> update(
            @PathVariable Long id,
            @Valid @RequestBody StoreRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(storeService.update(id, request, userDetails.getUsername()));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<StoreDto> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(storeService.updateStatus(id, body.get("status")));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        storeService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
