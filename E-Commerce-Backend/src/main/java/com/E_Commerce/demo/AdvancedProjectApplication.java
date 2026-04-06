package com.E_Commerce.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan("com.E_Commerce.demo.config")
public class AdvancedProjectApplication {

	public static void main(String[] args) {
		SpringApplication.run(AdvancedProjectApplication.class, args);
	}

}
