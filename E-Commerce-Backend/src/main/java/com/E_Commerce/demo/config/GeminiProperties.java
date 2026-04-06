package com.E_Commerce.demo.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "ai.gemini")
@Getter
@Setter
public class GeminiProperties {
    private String apiKey;
    private String model;
}
