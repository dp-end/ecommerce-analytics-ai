package com.E_Commerce.demo.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ChatbotService {

    @Value("${ai.anthropic.api-key:}")
    private String apiKey;

    @Value("${ai.anthropic.model:claude-haiku-4-5-20251001}")
    private String model;

    private static final String SCHEMA_CONTEXT = """
            Database schema for an e-commerce platform:

            users(id, email, password_hash, name, role_type[ADMIN/CORPORATE/INDIVIDUAL], gender, avatar, status[ACTIVE/SUSPENDED], created_at)
            customer_profiles(id, user_id, age, city, membership_type[GOLD/SILVER/BRONZE], total_spend, items_purchased, avg_rating, discount_applied, satisfaction_level)
            stores(id, name, owner_id->users.id, status[OPEN/CLOSED], category, rating, created_at)
            categories(id, name, description, parent_id->categories.id)
            products(id, store_id->stores.id, category_id->categories.id, sku, name, unit_price, stock, description, emoji, rating, created_at)
            orders(id, user_id->users.id, store_id->stores.id, status[PENDING/PROCESSING/SHIPPED/COMPLETED/CANCELLED], grand_total, payment_method, created_at)
            order_items(id, order_id->orders.id, product_id->products.id, quantity, price)
            shipments(id, order_id->orders.id, warehouse, mode_of_shipment[SHIP/FLIGHT/ROAD], carrier, destination, status[PENDING/IN_TRANSIT/DELIVERED/RETURNED], tracking_number, eta, customer_care_calls, customer_rating, discount_offered)
            reviews(id, user_id->users.id, product_id->products.id, star_rating, review_text, helpful, sentiment, helpful_votes, total_votes, created_at)
            audit_logs(id, action, user_id->users.id, user_name, type[INFO/WARNING/SUCCESS/ERROR], created_at)
            """;

    public Map<String, Object> ask(String question) {
        if (apiKey == null || apiKey.isBlank()) {
            return Map.of(
                    "question", question,
                    "answer", "AI chatbot is not configured. Please set the ANTHROPIC_API_KEY environment variable.",
                    "sql", "",
                    "agent", "text2sql"
            );
        }

        String systemPrompt = """
                You are a Text2SQL AI assistant for an e-commerce analytics platform.
                Given the following database schema, convert the user's natural language question into a SQL query.
                Only generate SELECT queries. Respond in JSON format with fields: "sql" (the SQL query), "explanation" (plain English explanation of the query), "agent" (always "text2sql").

                Schema:
                """ + SCHEMA_CONTEXT;

        RestClient client = RestClient.builder()
                .baseUrl("https://api.anthropic.com")
                .defaultHeader("x-api-key", apiKey)
                .defaultHeader("anthropic-version", "2023-06-01")
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();

        Map<String, Object> requestBody = Map.of(
                "model", model,
                "max_tokens", 1024,
                "system", systemPrompt,
                "messages", List.of(
                        Map.of("role", "user", "content", question)
                )
        );

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = client.post()
                    .uri("/v1/messages")
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> content = (List<Map<String, Object>>) response.get("content");
            String text = content != null && !content.isEmpty()
                    ? (String) content.get(0).get("text")
                    : "No response from AI.";

            return Map.of(
                    "question", question,
                    "answer", text,
                    "agent", "text2sql"
            );
        } catch (Exception e) {
            return Map.of(
                    "question", question,
                    "answer", "Error communicating with AI service: " + e.getMessage(),
                    "sql", "",
                    "agent", "text2sql"
            );
        }
    }
}
