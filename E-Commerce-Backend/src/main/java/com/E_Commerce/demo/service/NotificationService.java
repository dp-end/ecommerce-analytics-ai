package com.E_Commerce.demo.service;

import com.E_Commerce.demo.entity.Notification;
import com.E_Commerce.demo.entity.User;
import com.E_Commerce.demo.repository.NotificationRepository;
import com.E_Commerce.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Transactional
    public void sendOrderStatusUpdate(Long orderId, String status, String userEmail) {
        Map<String, Object> payload = Map.of(
                "orderId", orderId,
                "status", status,
                "type", "order_update",
                "text", "Order #" + orderId + " status changed to " + status
        );

        userRepository.findByEmail(userEmail).ifPresent(user ->
                persist(user, "Order #" + orderId + " status changed to " + status, "order_update")
        );

        messagingTemplate.convertAndSendToUser(userEmail, "/queue/notifications", (Object) payload);
        messagingTemplate.convertAndSend("/topic/admin/notifications", (Object) payload);
    }

    @Transactional
    public void sendAdminNotification(String text, String type) {
        Map<String, Object> payload = Map.of("text", text, "type", type);
        messagingTemplate.convertAndSend("/topic/admin/notifications", (Object) payload);
    }

    @Transactional
    public void sendUserNotification(User user, String text, String type) {
        persist(user, text, type);
        Map<String, Object> payload = Map.of("text", text, "type", type);
        messagingTemplate.convertAndSendToUser(user.getEmail(), "/queue/notifications", (Object) payload);
    }

    public List<Notification> getByUser(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Notification> getUnreadByUser(Long userId) {
        return notificationRepository.findByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markAllRead(Long userId) {
        List<Notification> unread = notificationRepository.findByUserIdAndIsReadFalse(userId);
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }

    private void persist(User user, String message, String type) {
        notificationRepository.save(Notification.builder()
                .user(user)
                .message(message)
                .type(type)
                .build());
    }
}
