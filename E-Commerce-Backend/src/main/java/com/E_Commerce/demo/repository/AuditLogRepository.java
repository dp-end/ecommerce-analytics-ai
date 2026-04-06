package com.E_Commerce.demo.repository;

import com.E_Commerce.demo.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByUserId(Long userId);
    List<AuditLog> findByType(AuditLog.LogType type);
    List<AuditLog> findTop50ByOrderByCreatedAtDesc();
}
