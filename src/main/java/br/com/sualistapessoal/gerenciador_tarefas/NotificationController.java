package br.com.sualistapessoal.gerenciador_tarefas;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PushSubscriptionRepository subscriptionRepository;

    @PostMapping("/subscribe")
    public ResponseEntity<?> subscribe(@RequestBody Map<String, String> subscriptionData, @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User user = userRepository.findByUsername(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("Usuário não encontrado."));

            String endpoint = subscriptionData.get("endpoint");
            if (subscriptionRepository.findByEndpoint(endpoint).isPresent()) {
                return ResponseEntity.ok(Map.of("message", "Inscrição já existe."));
            }

            PushSubscription subscription = new PushSubscription();
            subscription.setEndpoint(endpoint);
            subscription.setP256dh(subscriptionData.get("p256dh"));
            subscription.setAuth(subscriptionData.get("auth"));
            subscription.setUser(user);

            subscriptionRepository.save(subscription);

            return new ResponseEntity<>(Map.of("message", "Inscrição realizada com sucesso!"), HttpStatus.CREATED);
        } catch (Exception e) {
            return new ResponseEntity<>(Map.of("error", "Falha ao realizar inscrição: " + e.getMessage()), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}