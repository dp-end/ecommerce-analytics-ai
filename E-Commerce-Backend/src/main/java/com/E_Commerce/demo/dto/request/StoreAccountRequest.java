package com.E_Commerce.demo.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class StoreAccountRequest {

    @NotBlank(message = "Mağaza adı boş olamaz")
    private String storeName;

    @NotBlank(message = "Sahip adı boş olamaz")
    private String ownerName;

    @NotBlank @Email(message = "Geçerli bir e-posta giriniz")
    private String email;

    @NotBlank @Size(min = 6, message = "Şifre en az 6 karakter olmalıdır")
    private String password;

    private String category;
}
