package com.E_Commerce.demo.service;

import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StripePaymentService {

    @Value("${stripe.api.key:}")
    private String apiKey;

    @PostConstruct
    public void init() {
        if (apiKey != null && !apiKey.isBlank()) {
            Stripe.apiKey = apiKey;
        }
    }

    public Session createCheckoutSession(
            List<SessionCreateParams.LineItem> lineItems,
            String successUrl,
            String cancelUrl,
            Long orderId) throws StripeException {

        SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(successUrl)
                .setCancelUrl(cancelUrl)
                .addAllLineItem(lineItems)
                .putMetadata("orderId", String.valueOf(orderId))
                .build();

        return Session.create(params);
    }

    public com.stripe.model.Event constructWebhookEvent(
            String payload, String sigHeader, String webhookSecret) throws StripeException {
        return com.stripe.net.Webhook.constructEvent(payload, sigHeader, webhookSecret);
    }
}
