package com.E_Commerce.demo.service;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public void sendOrderStatusUpdate(Long orderId, String status, String userEmail) {
        Map<String, Object> payload = Map.of(
                "orderId", orderId,
                "status", status,
                "type", "order_update",
                "text", "Order #" + orderId + " status changed to " + status
        );

        // IDE'nin belirsizlik yaşamasını önlemek için (Object) cast'i eklendi
        messagingTemplate.convertAndSendToUser(userEmail, "/queue/notifications", (Object) payload);
        messagingTemplate.convertAndSend("/topic/admin/notifications", (Object) payload);
    }

    public void sendAdminNotification(String text, String type) {
        Map<String, Object> payload = Map.of("text", text, "type", type);

        // IDE'nin belirsizlik yaşamasını önlemek için (Object) cast'i eklendi
        messagingTemplate.convertAndSend("/topic/admin/notifications", (Object) payload);
    }
}
