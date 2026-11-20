package com.example.pasteleria.security;

import javax.sql.DataSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.JdbcUserDetailsManager;
import org.springframework.security.provisioning.UserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {
    @Bean UserDetailsManager usuarios(DataSource fuente) {
        return new JdbcUserDetailsManager(fuente);
    }

    @Bean PasswordEncoder contrasenas() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    @Bean
    SecurityFilterChain reglas(HttpSecurity http, JwtService tokens, UserDetailsService usuarios) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(reglas -> reglas
                .requestMatchers("/api/auth/login", "/api/auth/registro", "/api/auth/verificar", "/api/auth/reenviar",
                    "/api/auth/recuperar", "/api/auth/recuperar/confirmar", "/api/paypal/webhook", "/api/stripe/webhook",
                    "/aviso-privacidad.html", "/error").permitAll()
                // Los tres roles pueden acceder a su propio perfil y cambiar su contraseña.
                .requestMatchers("/api/auth/perfil", "/api/auth/cambiar-password", "/api/auth/cambiar-usuario").authenticated()
                .requestMatchers("/api/compras", "/api/compras/**").hasAnyRole("ADMIN", "CLIENTE")
                .requestMatchers("/api/encuesta", "/api/encuesta/mia").authenticated()
                .requestMatchers("/api/chef/**").hasRole("REPOSTERO")
                .requestMatchers("/api/perfil", "/api/perfil/**").authenticated()
                .requestMatchers("/api/arco/**").authenticated()
                .requestMatchers("/api/clientes/**", "/api/pedidos/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/productos/**", "/api/categorias/**", "/api/reposteros/**")
                    .hasAnyRole("ADMIN", "USER", "CLIENTE")
                .requestMatchers("/api/**").hasRole("ADMIN")
                .anyRequest().denyAll())
            .exceptionHandling(e -> e.authenticationEntryPoint((request, response, error) ->
                response.sendError(401, "Se requiere un token JWT Bearer válido.")))
            .addFilterBefore(new JwtAuthenticationFilter(tokens, usuarios), UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
