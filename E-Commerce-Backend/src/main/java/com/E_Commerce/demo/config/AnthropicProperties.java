package com.E_Commerce.demo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import lombok.Getter;
import lombok.Setter;

@Configuration
@ConfigurationProperties(prefix = "ai.anthropic")
@Getter
@Setter
public class AnthropicProperties {
    private String apiKey;
    private String model;
}
