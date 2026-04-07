package com.E_Commerce.demo.service;

import com.E_Commerce.demo.config.GeminiProperties;
import com.E_Commerce.demo.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class ChatbotService {

    private final GeminiProperties gemini;

    private static final String GEMINI_BASE_URL = "https://generativelanguage.googleapis.com";

    // Fallback sırası — ilk çalışan kullanılır
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

    public Map<String, Object> ask(String question, User currentUser) {
        if (gemini.getApiKey() == null || gemini.getApiKey().isBlank()) {
            return Map.of(
                    "question", question,
                    "answer", "AI chatbot yapılandırılmamış. application.properties dosyasında ai.gemini.api-key değerini ayarlayın.",
                    "sql", "",
                    "agent", "gemini"
            );
        }

        // Kullanıcı bağlamını soruya ekle
        String contextualQuestion = question;
        if (currentUser != null) {
            contextualQuestion = "[Current user: id=" + currentUser.getId()
                    + ", name=" + currentUser.getName()
                    + ", email=" + currentUser.getEmail()
                    + ", role=" + currentUser.getRoleType().name()
                    + "] User question: " + question;
        }

        // Önce ayarlanan modeli dene, 404/429 alırsa fallback listesini dene
        String configuredModel = (gemini.getModel() != null && !gemini.getModel().isBlank())
                ? gemini.getModel()
                : FALLBACK_MODELS.get(0);

        List<String> modelsToTry = Stream.concat(
                java.util.stream.Stream.of(configuredModel),
                FALLBACK_MODELS.stream().filter(m -> !m.equals(configuredModel))
        ).collect(java.util.stream.Collectors.toList());

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

        for (String model : modelsToTry) {
            String uri = "/v1beta/models/" + model + ":generateContent?key=" + gemini.getApiKey();
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> response = client.post()
                        .uri(uri)
                        .body(requestBody)
                        .retrieve()
                        .body(Map.class);

                return Map.of(
                        "question", question,
                        "answer", extractText(response),
                        "agent", "gemini/" + model
                );

            } catch (HttpClientErrorException.NotFound | HttpClientErrorException.TooManyRequests e) {
                // Model bulunamadı veya kota aşıldı — sıradakini dene
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
