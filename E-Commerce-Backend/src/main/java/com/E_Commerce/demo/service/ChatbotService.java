package com.E_Commerce.demo.service;

import com.E_Commerce.demo.config.AiServiceProperties;
import com.E_Commerce.demo.config.GeminiProperties;
import com.E_Commerce.demo.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Chatbot orchestration service.
 *
 * Request flow:
 *  1. If ai.service.enabled=true → try Python LangGraph service (localhost:8000)
 *  2. On any failure or if disabled → fall back to Google Gemini REST API
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatbotService {

    private final GeminiProperties gemini;
    private final AiServiceProperties aiService;

    private static final String GEMINI_BASE_URL = "https://generativelanguage.googleapis.com";

    private static final List<String> FALLBACK_MODELS = List.of(
            "gemini-2.0-flash-lite",
            "gemini-2.0-flash",
            "gemini-2.5-flash",
            "gemini-flash-lite-latest",
            "gemini-flash-latest"
    );

    private static final String SYSTEM_PROMPT =
            "You are a friendly AI assistant for DataPulse e-commerce platform. " +
            "Answer the user's questions in plain conversational language. " +
            "NEVER show SQL code, code blocks, or technical query syntax in your response. " +
            "Use the current user's id/email from the context prefix to answer personal questions like 'my orders'. " +
            "Tables (internal, do not mention): users, stores, products, orders, order_items, shipments, reviews, customer_profiles, audit_logs. " +
            "Be concise and friendly. Respond in the same language the user writes in.";

    // ── Public entry point ────────────────────────────────────────────────────

    public Map<String, Object> ask(String question, User currentUser) {
        // 1. Try Python LangGraph service
        if (aiService.isEnabled()) {
            Map<String, Object> pyResult = tryPythonService(question, currentUser);
            if (pyResult != null) {
                return pyResult;
            }
            log.warn("Python AI service unavailable — falling back to Gemini");
        }

        // 2. Fall back to Gemini
        return askGemini(question, currentUser);
    }

    // ── Python LangGraph service ──────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private Map<String, Object> tryPythonService(String question, User currentUser) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("question", question);

            if (currentUser != null) {
                body.put("user_context", Map.of(
                        "id",    currentUser.getId(),
                        "name",  currentUser.getName(),
                        "email", currentUser.getEmail(),
                        "role",  currentUser.getRoleType().name()
                ));
            }

            RestClient client = RestClient.builder()
                    .baseUrl(aiService.getUrl())
                    .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .build();

            Map<String, Object> response = client.post()
                    .uri("/chat/ask")
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            if (response == null) return null;

            return Map.of(
                    "question",           question,
                    "answer",             response.getOrDefault("answer", ""),
                    "sql",                response.getOrDefault("sql_query", ""),
                    "agent",              "langgraph",
                    "visualizationData",  response.getOrDefault("visualization_data", Map.of()),
                    "agentTrace",         response.getOrDefault("agent_trace", List.of())
            );

        } catch (ResourceAccessException e) {
            // Service not running — expected when Python service is down
            log.debug("Python AI service not reachable: {}", e.getMessage());
            return null;
        } catch (Exception e) {
            log.warn("Python AI service error: {}", e.getMessage());
            return null;
        }
    }

    // ── Gemini fallback ───────────────────────────────────────────────────────

    private Map<String, Object> askGemini(String question, User currentUser) {
        if (gemini.getApiKey() == null || gemini.getApiKey().isBlank()) {
            return Map.of(
                    "question", question,
                    "answer", "AI chatbot yapılandırılmamış. application.properties dosyasında ai.gemini.api-key değerini ayarlayın.",
                    "sql", "",
                    "agent", "gemini"
            );
        }

        String contextualQuestion = question;
        if (currentUser != null) {
            contextualQuestion = "[Current user: id=" + currentUser.getId()
                    + ", name=" + currentUser.getName()
                    + ", email=" + currentUser.getEmail()
                    + ", role=" + currentUser.getRoleType().name()
                    + "] User question: " + question;
        }

        String configuredModel = (gemini.getModel() != null && !gemini.getModel().isBlank())
                ? gemini.getModel()
                : FALLBACK_MODELS.get(0);

        List<String> modelsToTry = Stream.concat(
                Stream.of(configuredModel),
                FALLBACK_MODELS.stream().filter(m -> !m.equals(configuredModel))
        ).collect(Collectors.toList());

        RestClient client = RestClient.builder()
                .baseUrl(GEMINI_BASE_URL)
                .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .build();

        final String finalQuestion = contextualQuestion;
        Map<String, Object> requestBody = Map.of(
                "system_instruction", Map.of(
                        "parts", List.of(Map.of("text", SYSTEM_PROMPT))
                ),
                "contents", List.of(
                        Map.of("parts", List.of(Map.of("text", finalQuestion)))
                )
        );

        final String apiKey = gemini.getApiKey();

        for (String model : modelsToTry) {
            final String modelPath = "/v1beta/models/" + model + ":generateContent";
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> response = client.post()
                        .uri(uriBuilder -> uriBuilder
                                .path(modelPath)
                                .queryParam("key", apiKey)
                                .build())
                        .body(requestBody)
                        .retrieve()
                        .body(Map.class);

                return Map.of(
                        "question", question,
                        "answer",   extractText(response),
                        "agent",    "gemini/" + model
                );

            } catch (HttpClientErrorException.NotFound | HttpClientErrorException.TooManyRequests e) {
                // Model not found or quota exceeded — try next
            } catch (HttpClientErrorException.BadRequest e) {
                String body = e.getResponseBodyAsString();
                String msg = body.contains("API_KEY_INVALID") || body.contains("key expired")
                        ? "Gemini API anahtarı geçersiz veya süresi dolmuş. Lütfen application.properties dosyasındaki ai.gemini.api-key değerini güncelleyin."
                        : "Geçersiz istek (400): " + body;
                return Map.of("question", question, "answer", msg, "sql", "", "agent", "gemini");
            } catch (HttpClientErrorException e) {
                return Map.of("question", question,
                        "answer", "Gemini API hatası (" + e.getStatusCode().value() + "): " + e.getResponseBodyAsString(),
                        "sql", "", "agent", "gemini");
            } catch (Exception e) {
                return Map.of("question", question,
                        "answer", "Gemini ile bağlantı kurulamadı: " + e.getMessage(),
                        "sql", "", "agent", "gemini");
            }
        }

        return Map.of("question", question,
                "answer", "Tüm modeller kota limitine ulaştı veya bulunamadı. Birkaç dakika bekleyip tekrar deneyin ya da yeni bir API anahtarı edinin: https://aistudio.google.com/apikey",
                "sql", "", "agent", "gemini");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private String extractText(Map<String, Object> response) {
        try {
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            if (candidates == null || candidates.isEmpty()) return "Gemini'den yanıt gelmedi.";
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            if (parts == null || parts.isEmpty()) return "Gemini boş yanıt döndürdü.";
            return (String) parts.get(0).get("text");
        } catch (Exception e) {
            return "Gemini yanıtı ayrıştırılamadı.";
        }
    }
}
