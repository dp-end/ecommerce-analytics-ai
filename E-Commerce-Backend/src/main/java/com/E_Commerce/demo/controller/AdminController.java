package com.E_Commerce.demo.controller;

import com.E_Commerce.demo.dto.request.StoreAccountRequest;
import com.E_Commerce.demo.dto.response.StoreAccountDto;
import com.E_Commerce.demo.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @PostMapping("/store-accounts")
    public ResponseEntity<StoreAccountDto> createStoreAccount(
            @Valid @RequestBody StoreAccountRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(adminService.createStoreAccount(request));
    }
}
