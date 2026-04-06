package com.E_Commerce.demo.dto.request;

import com.E_Commerce.demo.entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank
    private String name;

    @NotBlank @Email
    private String email;

    @NotBlank @Size(min = 6)
    private String password;

    private User.RoleType roleType = User.RoleType.INDIVIDUAL;
    private String gender;
    private String avatar;
}
