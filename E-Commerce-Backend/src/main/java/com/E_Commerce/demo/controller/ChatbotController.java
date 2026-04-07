package com.E_Commerce.demo.controller;

import com.E_Commerce.demo.entity.User;
import com.E_Commerce.demo.repository.UserRepository;
import com.E_Commerce.demo.service.ChatbotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatbotController {

    private final ChatbotService chatbotService;
    private final UserRepository userRepository;

    @PostMapping("/ask")
    public ResponseEntity<Map<String, Object>> ask(
            @RequestBody Map<String, String> body,
            Authentication authentication) {

        String question = body.get("question");
        if (question == null || question.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Question field is required"));
        }

        User currentUser = null;
        if (authentication != null && authentication.isAuthenticated()) {
            String email = authentication.getName();
            currentUser = userRepository.findByEmail(email).orElse(null);
        }

        return ResponseEntity.ok(chatbotService.ask(question, currentUser));
    }
}
