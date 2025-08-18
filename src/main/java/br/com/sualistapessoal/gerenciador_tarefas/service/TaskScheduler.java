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
import java.time.temporal.ChronoUnit;
import java.util.List;

// --- MUDANÇA: ADICIONAMOS UM NOME ÚNICO AO NOSSO COMPONENTE ---
@Component("appTaskScheduler")
@EnableScheduling
public class TaskScheduler {

    private final TaskRepository taskRepository;
    private final NotificationService notificationService;
    private final PushSubscriptionRepository subscriptionRepository;

    public TaskScheduler(TaskRepository taskRepository, NotificationService notificationService, PushSubscriptionRepository subscriptionRepository) {
        this.taskRepository = taskRepository;
        this.notificationService = notificationService;
        this.subscriptionRepository = subscriptionRepository;
    }

    @Scheduled(fixedRate = 60000)
    public void checkTasksAndSendNotifications() {
        LocalDateTime now = LocalDateTime.now();
        List<Task> tasks = taskRepository.findAll();

        for (Task task : tasks) {
            if (task.isCompleted() || !task.isWithNotification() || task.getDate() == null || task.getTime() == null) {
                continue;
            }

            LocalDateTime taskDateTime = LocalDateTime.of(task.getDate(), task.getTime());
            long minutesUntilTask = ChronoUnit.MINUTES.between(now, taskDateTime);

            String notificationPayload = null;
            int newNotificationState = task.getNotificationState();

            // Lembrete de 5 minutos antes
            if (minutesUntilTask <= 5 && minutesUntilTask > 4 && task.getNotificationState() < 1) {
                notificationPayload = "{\"title\":\"Lembrete: " + task.getTitle() + "\",\"body\":\"Sua tarefa começa em 5 minutos.\"}";
                newNotificationState = 1;
            }
            // Lembrete na hora da tarefa
            else if (minutesUntilTask <= 0 && minutesUntilTask > -1 && task.getNotificationState() < 2) {
                notificationPayload = "{\"title\":\"Hora da Tarefa: " + task.getTitle() + "\",\"body\":\"Sua tarefa está agendada para agora!\"}";
                newNotificationState = 2;
            }
            // Lembrete de tarefa atrasada
            else if (minutesUntilTask <= -5 && minutesUntilTask > -6 && task.getNotificationState() < 3) {
                notificationPayload = "{\"title\":\"Tarefa Atrasada: " + task.getTitle() + "\",\"body\":\"Esta tarefa começou há 5 minutos.\"}";
                newNotificationState = 3;
            }


            if (notificationPayload != null) {
                if (task.getUser() != null && task.getUser().getId() != null) {
                    List<PushSubscription> subscriptions = subscriptionRepository.findByUserId(task.getUser().getId());
                    for (PushSubscription sub : subscriptions) {
                        notificationService.sendPushNotification(sub, notificationPayload);
                    }
                    task.setNotificationState(newNotificationState);
                    taskRepository.save(task);
                }
            }
        }
    }

    @Scheduled(cron = "0 5 0 * * ?")
    public void resetRecurringTasks() {
        List<Task> tasksToReset = taskRepository.findAll().stream()
                .filter(task -> task.isRecurring() && task.isCompleted() && (task.getDate() == null || task.getDate().isBefore(LocalDate.now())))
                .toList();

        for (Task task : tasksToReset) {
            task.setCompleted(false);
            task.setNotificationState(0);
            task.setDate(LocalDate.now());
            taskRepository.save(task);
        }
    }
}