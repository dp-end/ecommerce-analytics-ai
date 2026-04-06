package com.E_Commerce.demo.controller;

import com.E_Commerce.demo.dto.response.AuditLogDto;
import com.E_Commerce.demo.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/audit-logs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    public ResponseEntity<List<AuditLogDto>> getAll() {
        return ResponseEntity.ok(auditLogService.getAll());
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<AuditLogDto>> getByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(auditLogService.getByUser(userId));
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<List<AuditLogDto>> getByType(@PathVariable String type) {
        return ResponseEntity.ok(auditLogService.getByType(type));
    }

    @PostMapping
    public ResponseEntity<AuditLogDto> create(@RequestBody Map<String, Object> body) {
        String action = (String) body.get("action");
        String type = body.getOrDefault("type", "INFO").toString();
        Long userId = body.get("userId") != null ? Long.valueOf(body.get("userId").toString()) : null;
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(auditLogService.create(action, type, userId));
    }
}
