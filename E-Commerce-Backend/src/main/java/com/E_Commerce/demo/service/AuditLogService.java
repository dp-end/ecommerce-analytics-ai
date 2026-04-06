package com.E_Commerce.demo.service;

import com.E_Commerce.demo.dto.response.AuditLogDto;
import com.E_Commerce.demo.entity.AuditLog;
import com.E_Commerce.demo.entity.User;
import com.E_Commerce.demo.repository.AuditLogRepository;
import com.E_Commerce.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public List<AuditLogDto> getAll() {
        return auditLogRepository.findTop50ByOrderByCreatedAtDesc().stream().map(AuditLogDto::from).toList();
    }

    public List<AuditLogDto> getByUser(Long userId) {
        return auditLogRepository.findByUserId(userId).stream().map(AuditLogDto::from).toList();
    }

    public List<AuditLogDto> getByType(String type) {
        return auditLogRepository.findByType(AuditLog.LogType.valueOf(type)).stream().map(AuditLogDto::from).toList();
    }

    @Transactional
    public AuditLogDto log(String action, AuditLog.LogType type, String userEmail) {
        User user = userEmail != null ? userRepository.findByEmail(userEmail).orElse(null) : null;
        AuditLog log = AuditLog.builder()
                .action(action)
                .type(type)
                .user(user)
                .userName(user != null ? user.getName() : "System")
                .build();
        return AuditLogDto.from(auditLogRepository.save(log));
    }

    @Transactional
    public AuditLogDto create(String action, String type, Long userId) {
        User user = userId != null ? userRepository.findById(userId).orElse(null) : null;
        AuditLog log = AuditLog.builder()
                .action(action)
                .type(AuditLog.LogType.valueOf(type))
                .user(user)
                .userName(user != null ? user.getName() : "System")
                .build();
        return AuditLogDto.from(auditLogRepository.save(log));
    }
}
