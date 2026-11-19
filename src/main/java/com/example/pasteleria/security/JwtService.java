package com.example.pasteleria.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** JWT HS256 mínimo para una práctica escolar, sin dependencias adicionales. */
@Service
public class JwtService {
    private static final Base64.Encoder URL = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODE = Base64.getUrlDecoder();
    private static final String HEADER = URL.encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
    private static final Pattern USUARIO = Pattern.compile("[A-Za-z0-9_.@-]{1,50}");
    private static final Pattern DATOS = Pattern.compile("\\{\"sub\":\"([A-Za-z0-9_.@-]{1,50})\",\"iat\":([0-9]{1,12}),\"exp\":([0-9]{1,12})\\}");
    private final byte[] secreto;
    private final long vigenciaSegundos;

    public JwtService(@Value("${jwt.secret}") String secret, @Value("${jwt.expiration-minutes:60}") long minutos) {
        if (secret.length() < 32) throw new IllegalArgumentException("JWT_SECRET requiere al menos 32 caracteres.");
        if (minutos < 1 || minutos > 1440) throw new IllegalArgumentException("JWT_EXPIRATION_MINUTES debe estar entre 1 y 1440.");
        this.secreto = secret.getBytes(StandardCharsets.UTF_8);
        this.vigenciaSegundos = minutos * 60;
    }
    public String crear(String usuario, String string) {
        if (usuario == null || !USUARIO.matcher(usuario).matches()) throw new IllegalArgumentException("Usuario no compatible con JWT.");
        long ahora = Instant.now().getEpochSecond();
        String contenido = "{\"sub\":\"" + usuario + "\",\"iat\":" + ahora + ",\"exp\":" + (ahora + vigenciaSegundos) + "}";
        String firmado = HEADER + "." + URL.encodeToString(contenido.getBytes(StandardCharsets.UTF_8));
        return firmado + "." + URL.encodeToString(firma(firmado));
    }
    public String verificar(String token) {
        try {
            if (token == null || token.length() > 4096) return null;
            String[] partes = token.split("\\.", -1);
            if (partes.length != 3 || !HEADER.equals(partes[0])) return null;
            String mensaje = partes[0] + "." + partes[1];
            if (!MessageDigest.isEqual(firma(mensaje), DECODE.decode(partes[2]))) return null;
            String json = new String(DECODE.decode(partes[1]), StandardCharsets.UTF_8);
            Matcher datos = DATOS.matcher(json);
            if (!datos.matches()) return null;
            long ahora = Instant.now().getEpochSecond();
            long iat = Long.parseLong(datos.group(2));
            long exp = Long.parseLong(datos.group(3));
            if (iat > ahora + 60 || exp <= ahora || exp <= iat || exp - iat > 86400) return null;
            return datos.group(1);
        } catch (Exception e) { return null; }
    }
    public long vigenciaSegundos() { return vigenciaSegundos; }
    private byte[] firma(String mensaje) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secreto, "HmacSHA256"));
            return mac.doFinal(mensaje.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) { throw new IllegalStateException("No se pudo firmar JWT.", e); }
    }
}
