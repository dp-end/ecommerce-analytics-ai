package com.E_Commerce.demo.service;

import com.E_Commerce.demo.config.GeminiProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ChatbotService {

    private final GeminiProperties gemini;

    private static final String GEMINI_BASE_URL = "https://generativelanguage.googleapis.com";

    private static final String SCHEMA_CONTEXT = """
            Database schema for an e-commerce platform:

            users(id, email, password_hash, name, role_type[ADMIN/CORPORATE/INDIVIDUAL], gender, avatar, status[ACTIVE/SUSPENDED], created_at)
            customer_profiles(id, user_id, age, city, membership_type[GOLD/SILVER/BRONZE], total_spend, items_purchased, avg_rating, discount_applied, satisfaction_level)
            stores(id, name, owner_id->users.id, status[OPEN/CLOSED], category, rating, created_at)
            categories(id, name, description, parent_id->categories.id)
            products(id, store_id->stores.id, category_id->categories.id, sku, name, unit_price, stock, description, emoji, rating, created_at)
            orders(id, user_id->users.id, store_id->stores.id, status[PENDING/PROCESSING/SHIPPED/COMPLETED/CANCELLED], grand_total, payment_method, created_at)
            order_items(id, order_id->orders.id, product_id->products.id, quantity, price)
            shipments(id, order_id->orders.id, warehouse, mode_of_shipment[SHIP/FLIGHT/ROAD], carrier, destination, status[PENDING/IN_TRANSIT/DELIVERED/RETURNED], tracking_number, eta)
            reviews(id, user_id->users.id, product_id->products.id, star_rating, review_text, helpful, sentiment, created_at)
            audit_logs(id, action, user_id->users.id, user_name, type[INFO/WARNING/SUCCESS/ERROR], created_at)
            """;

    private static final String SYSTEM_PROMPT = """
            You are a helpful AI assistant for an e-commerce analytics platform called DataPulse.
            You can answer questions about the business data and also convert natural language questions into SQL queries.

            When the user asks a data question, provide:
            1. A clear plain-English answer or explanation
            2. The corresponding SQL query if applicable

            Database Schema:
            """ + SCHEMA_CONTEXT + """

            Always be concise, helpful, and accurate. Only generate SELECT queries for SQL.
            """;

    public Map<String, Object> ask(String question) {
        if (gemini.getApiKey() == null || gemini.getApiKey().isBlank()) {
            return Map.of(
                    "question", question,
                    "answer", "AI chatbot is not configured. Please set the GEMINI_API_KEY environment variable.",
                    "sql", "",
                    "agent", "gemini"
            );
        }

        String model = gemini.getModel() != null ? gemini.getModel() : "gemini-2.0-flash";
        String uri = "/v1beta/models/" + model + ":generateContent?key=" + gemini.getApiKey();

        Map<String, Object> requestBody = Map.of(
                "system_instruction", Map.of(
                        "parts", List.of(Map.of("text", SYSTEM_PROMPT))
                ),
                "contents", List.of(
                        Map.of("parts", List.of(Map.of("text", question)))
                )
        );

        try {
            RestClient client = RestClient.builder()
                    .baseUrl(GEMINI_BASE_URL)
                    .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .build();

            @SuppressWarnings("unchecked")
            Map<String, Object> response = client.post()
                    .uri(uri)
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            String text = extractText(response);

            return Map.of(
                    "question", question,
                    "answer", text,
                    "agent", "gemini"
            );
        } catch (org.springframework.web.client.HttpClientErrorException.TooManyRequests e) {
            return Map.of(
                    "question", question,
                    "answer", "API kota limiti aşıldı (429). Lütfen birkaç dakika bekleyip tekrar deneyin.",
                    "sql", "",
                    "agent", "gemini"
            );
        } catch (org.springframework.web.client.HttpClientErrorException.BadRequest e) {
            String body = e.getResponseBodyAsString();
            String msg = body.contains("API_KEY_INVALID") || body.contains("key expired")
                    ? "Gemini API anahtarı geçersiz veya süresi dolmuş. Lütfen application.properties dosyasındaki ai.gemini.api-key değerini güncelleyin."
                    : "Geçersiz istek (400): " + body;
            return Map.of("question", question, "answer", msg, "sql", "", "agent", "gemini");
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            return Map.of(
                    "question", question,
                    "answer", "Gemini API hatası (" + e.getStatusCode().value() + "): " + e.getResponseBodyAsString(),
                    "sql", "",
                    "agent", "gemini"
            );
        } catch (Exception e) {
            return Map.of(
                    "question", question,
                    "answer", "Gemini ile bağlantı kurulamadı: " + e.getMessage(),
                    "sql", "",
                    "agent", "gemini"
            );
        }
    }

    @SuppressWarnings("unchecked")
    private String extractText(Map<String, Object> response) {
        try {
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            if (candidates == null || candidates.isEmpty()) return "No response from Gemini.";
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            if (parts == null || parts.isEmpty()) return "Empty response from Gemini.";
            return (String) parts.get(0).get("text");
        } catch (Exception e) {
            return "Could not parse Gemini response.";
        }
    }
}
