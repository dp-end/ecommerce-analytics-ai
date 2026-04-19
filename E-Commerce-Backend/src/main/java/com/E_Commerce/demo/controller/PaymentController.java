package com.E_Commerce.demo.controller;

import com.E_Commerce.demo.dto.request.OrderRequest;
import com.E_Commerce.demo.entity.Product;
import com.E_Commerce.demo.repository.ProductRepository;
import com.E_Commerce.demo.service.NotificationService;
import com.E_Commerce.demo.service.OrderService;
import com.E_Commerce.demo.service.StripePaymentService;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final StripePaymentService stripeService;
    private final OrderService orderService;
    private final ProductRepository productRepository;
    private final NotificationService notificationService;

    @Value("${stripe.webhook.secret:}")
    private String webhookSecret;

    @PostMapping("/stripe/create-session")
    public ResponseEntity<Map<String, String>> createStripeSession(
            @RequestBody StripeSessionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            // Build order items for DB order creation
            List<OrderRequest.OrderItemRequest> orderItems = new ArrayList<>();
            List<SessionCreateParams.LineItem> lineItems = new ArrayList<>();

            for (StripeSessionRequest.ItemRequest item : request.getItems()) {
                Product product = productRepository.findById(item.getProductId())
                        .orElseThrow(() -> new RuntimeException("Product not found: " + item.getProductId()));

                // Stripe line item
                lineItems.add(SessionCreateParams.LineItem.builder()
                        .setQuantity((long) item.getQuantity())
                        .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                .setCurrency("usd")
                                .setUnitAmount((long) (product.getUnitPrice() * 100))
                                .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                        .setName(product.getName())
                                        .build())
                                .build())
                        .build());

                // DB order item
                OrderRequest.OrderItemRequest orderItem = new OrderRequest.OrderItemRequest();
                orderItem.setProductId(item.getProductId());
                orderItem.setQuantity(item.getQuantity());
                orderItems.add(orderItem);
            }

            // Create a pending order in DB
            OrderRequest orderRequest = new OrderRequest();
            orderRequest.setItems(orderItems);
            orderRequest.setPaymentMethod("stripe");
            var orderDto = orderService.create(orderRequest, userDetails.getUsername());

            // Create Stripe checkout session
            String successUrl = request.getSuccessUrl() != null
                    ? request.getSuccessUrl()
                    : "http://localhost:4200/individual/orders?payment=success";
            String cancelUrl = request.getCancelUrl() != null
                    ? request.getCancelUrl()
                    : "http://localhost:4200/individual/checkout?payment=cancelled";

            Session session = stripeService.createCheckoutSession(lineItems, successUrl, cancelUrl, orderDto.getId());

            return ResponseEntity.ok(Map.of(
                    "sessionId", session.getId(),
                    "checkoutUrl", session.getUrl()
            ));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage() != null ? e.getMessage() : "Stripe session creation failed"));
        }
    }

    @PostMapping("/stripe/webhook")
    public ResponseEntity<String> handleWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {

        if (webhookSecret == null || webhookSecret.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Webhook secret not configured");
        }

        com.stripe.model.Event event;
        try {
            event = stripeService.constructWebhookEvent(payload, sigHeader, webhookSecret);
        } catch (SignatureVerificationException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid signature");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Webhook error: " + e.getMessage());
        }

        switch (event.getType()) {
            case "checkout.session.completed" -> {
                var dataObject = event.getDataObjectDeserializer().getObject();
                if (dataObject.isPresent() && dataObject.get() instanceof Session session) {
                    String orderIdStr = session.getMetadata().get("orderId");
                    if (orderIdStr != null) {
                        Long orderId = Long.parseLong(orderIdStr);
                        orderService.updateStatus(orderId, "COMPLETED");
                        notificationService.sendAdminNotification(
                                "Payment completed for order #" + orderId, "success");
                    }
                }
            }
            case "payment_intent.payment_failed" -> {
                notificationService.sendAdminNotification("A payment has failed", "error");
            }
        }

        return ResponseEntity.ok("Received");
    }

    // ── inner request DTO ────────────────────────────────────────────────────
    public static class StripeSessionRequest {
        private List<ItemRequest> items;
        private String successUrl;
        private String cancelUrl;

        public List<ItemRequest> getItems() { return items; }
        public void setItems(List<ItemRequest> items) { this.items = items; }
        public String getSuccessUrl() { return successUrl; }
        public void setSuccessUrl(String successUrl) { this.successUrl = successUrl; }
        public String getCancelUrl() { return cancelUrl; }
        public void setCancelUrl(String cancelUrl) { this.cancelUrl = cancelUrl; }

        public static class ItemRequest {
            private Long productId;
            private int quantity;

            public Long getProductId() { return productId; }
            public void setProductId(Long productId) { this.productId = productId; }
            public int getQuantity() { return quantity; }
            public void setQuantity(int quantity) { this.quantity = quantity; }
        }
    }
}
