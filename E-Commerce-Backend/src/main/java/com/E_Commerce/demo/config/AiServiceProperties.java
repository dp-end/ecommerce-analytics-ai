package com.E_Commerce.demo.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Binding for the Python LangGraph AI service connection settings.
 *
 * application.properties keys:
 *   ai.service.url     — base URL of the FastAPI service  (default: http://localhost:8000)
 *   ai.service.enabled — set false to skip and use Gemini fallback directly
 */
@Configuration
@ConfigurationProperties(prefix = "ai.service")
@Getter
@Setter
public class AiServiceProperties {

    /** Base URL of the Python LangGraph/FastAPI service. */
    private String url = "http://localhost:8000";

    /**
     * When true, ChatbotService tries the Python service first and only
     * falls back to Gemini on failure or timeout.
     */
    private boolean enabled = true;

    /** Shared secret sent as X-Internal-Token header to the Python service. */
    private String internalSecret = "";
}
