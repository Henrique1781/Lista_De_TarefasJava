package br.com.sualistapessoal.gerenciador_tarefas.service;

import br.com.sualistapessoal.gerenciador_tarefas.PushSubscription;
import br.com.sualistapessoal.gerenciador_tarefas.PushSubscriptionRepository;
import br.com.sualistapessoal.gerenciador_tarefas.Task;
import br.com.sualistapessoal.gerenciador_tarefas.TaskRepository;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId; // IMPORTANTE: Nova importação
import java.time.ZonedDateTime; // IMPORTANTE: Nova importação
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component("appTaskScheduler")
@EnableScheduling
public class TaskScheduler {

    private final TaskRepository taskRepository;
    private final NotificationService notificationService;
    private final PushSubscriptionRepository subscriptionRepository;

    // --- MUDANÇA: DEFINIMOS O FUSO HORÁRIO DO BRASIL ---
    private static final ZoneId BRASIL_ZONE_ID = ZoneId.of("America/Sao_Paulo");

    public TaskScheduler(TaskRepository taskRepository, NotificationService notificationService, PushSubscriptionRepository subscriptionRepository) {
        this.taskRepository = taskRepository;
        this.notificationService = notificationService;
        this.subscriptionRepository = subscriptionRepository;
    }

    @Scheduled(fixedRate = 60000) // Executa a cada 60 segundos
    public void checkTasksAndSendNotifications() {
        // --- MUDANÇA: USAMOS ZonedDateTime para pegar a hora certa no fuso de São Paulo ---
        ZonedDateTime now = ZonedDateTime.now(BRASIL_ZONE_ID);
        System.out.println("--- [LOG] Verificando tarefas às " + now + " (Horário de Brasília) ---");

        List<Task> tasks = taskRepository.findAll();

        for (Task task : tasks) {
            if (task.isCompleted() || !task.isWithNotification() || task.getDate() == null || task.getTime() == null) {
                continue;
            }

            // --- MUDANÇA: Convertemos a hora da tarefa para o mesmo fuso horário para comparar ---
            LocalDateTime taskLocalTime = LocalDateTime.of(task.getDate(), task.getTime());
            ZonedDateTime taskDateTime = taskLocalTime.atZone(BRASIL_ZONE_ID);

            long minutesUntilTask = ChronoUnit.MINUTES.between(now, taskDateTime);

            String notificationPayload = null;
            int newNotificationState = task.getNotificationState();

            // Lembrete 5 minutos antes
            if (minutesUntilTask <= 5 && minutesUntilTask > 4 && task.getNotificationState() < 1) {
                System.out.println("[LOG] Tarefa encontrada para notificação (5 min antes): " + task.getTitle());
                notificationPayload = "{\"title\":\"Lembrete: " + task.getTitle() + "\",\"body\":\"Sua tarefa começa em 5 minutos.\"}";
                newNotificationState = 1;
            }
            // Lembrete na hora da tarefa
            else if (minutesUntilTask <= 0 && minutesUntilTask > -1 && task.getNotificationState() < 2) {
                System.out.println("[LOG] Tarefa encontrada para notificação (agora): " + task.getTitle());
                notificationPayload = "{\"title\":\"Lembrete: " + task.getTitle() + "\",\"body\":\"Sua tarefa está agendada para agora!\"}";
                newNotificationState = 2;
            }
            // Lembrete de tarefa atrasada
            else if (minutesUntilTask <= -5 && minutesUntilTask > -6 && task.getNotificationState() < 3) {
                System.out.println("[LOG] Tarefa encontrada para notificação (atrasada): " + task.getTitle());
                notificationPayload = "{\"title\":\"Tarefa Atrasada: " + task.getTitle() + "\",\"body\":\"Esta tarefa começou há 5 minutos.\"}";
                newNotificationState = 3;
            }

            if (notificationPayload != null) {
                if (task.getUser() != null && task.getUser().getId() != null) {
                    System.out.println("[LOG] Enviando notificação para o usuário: " + task.getUser().getUsername());
                    List<PushSubscription> subscriptions = subscriptionRepository.findByUserId(task.getUser().getId());

                    if (subscriptions.isEmpty()) {
                        System.out.println("[LOG] ATENÇÃO: Nenhuma inscrição de notificação encontrada para o usuário " + task.getUser().getUsername());
                    }

                    for (PushSubscription sub : subscriptions) {
                        notificationService.sendPushNotification(sub, notificationPayload);
                    }
                    task.setNotificationState(newNotificationState);
                    taskRepository.save(task);
                }
            }
        }
    }

    @Scheduled(cron = "0 5 0 * * ?", zone = "America/Sao_Paulo") // MUDANÇA: Adicionado fuso horário aqui também
    public void resetRecurringTasks() {
        System.out.println("[LOG] Rodando tarefa diária de reset de rotinas...");
        LocalDate todayInBrasil = LocalDate.now(BRASIL_ZONE_ID);
        List<Task> tasksToReset = taskRepository.findAll().stream()
                .filter(task -> task.isRecurring() && task.isCompleted() && (task.getDate() == null || task.getDate().isBefore(todayInBrasil)))
                .toList();

        for (Task task : tasksToReset) {
            task.setCompleted(false);
            task.setNotificationState(0);
            task.setDate(todayInBrasil);
            taskRepository.save(task);
            System.out.println("[LOG] Rotina resetada: " + task.getTitle());
        }
    }
}