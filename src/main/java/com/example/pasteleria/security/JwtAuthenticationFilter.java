package com.example.pasteleria.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.filter.OncePerRequestFilter;

public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService tokens;
    private final UserDetailsService usuarios;
    public JwtAuthenticationFilter(JwtService tokens, UserDetailsService usuarios) {
        this.tokens = tokens; this.usuarios = usuarios;
    }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
        throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.startsWith("Bearer ") && SecurityContextHolder.getContext().getAuthentication() == null) {
            String nombre = tokens.verificar(authorization.substring(7));
            if (nombre != null) {
                try {
                    UserDetails user = usuarios.loadUserByUsername(nombre);
                    if (user.isEnabled() && user.isAccountNonLocked() && user.isAccountNonExpired() && user.isCredentialsNonExpired()) {
                        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
                        SecurityContextHolder.getContext().setAuthentication(auth);
                    }
                } catch (UsernameNotFoundException ignored) { /* Token de cuenta inexistente: sin autenticación. */ }
            }
        }
        chain.doFilter(request, response);
    }
}
