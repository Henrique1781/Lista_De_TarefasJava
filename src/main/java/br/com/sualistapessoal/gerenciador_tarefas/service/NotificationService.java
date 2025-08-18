package br.com.sualistapessoal.gerenciador_tarefas.service;

import br.com.sualistapessoal.gerenciador_tarefas.PushSubscription;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.jose4j.lang.JoseException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.Security;
import java.util.concurrent.ExecutionException;
import org.bouncycastle.jce.provider.BouncyCastleProvider;

@Service
public class NotificationService {

    @Value("${vapid.public.key}")
    private String vapidPublicKey;

    @Value("${vapid.private.key}")
    private String vapidPrivateKey;

    private PushService pushService;

    @PostConstruct
    private void init() throws GeneralSecurityException {
        Security.addProvider(new BouncyCastleProvider());
        pushService = new PushService(vapidPublicKey, vapidPrivateKey);
    }

    public void sendPushNotification(PushSubscription subscription, String payload) {
        try {
            Notification notification = new Notification(
                    subscription.getEndpoint(),
                    subscription.getP256dh(),
                    subscription.getAuth(),
                    payload
            );
            pushService.send(notification);
        } catch (GeneralSecurityException | IOException | JoseException | ExecutionException | InterruptedException e) {
            // Em caso de erro, especialmente se a inscrição for inválida, é uma boa prática removê-la.
            System.err.println("Erro ao enviar notificação para " + subscription.getEndpoint() + ": " + e.getMessage());
        }
    }
}