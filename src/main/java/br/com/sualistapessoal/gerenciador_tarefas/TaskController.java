package br.com.sualistapessoal.gerenciador_tarefas;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "*")
public class TaskController {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private UserRepository userRepository;

    @PostMapping
    public Task createTask(@RequestBody Task task, @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado para criar a tarefa."));

        // Incrementa o contador de tarefas criadas e salva o usuário
        long currentTotal = user.getTotalTasksCreated() != null ? user.getTotalTasksCreated() : 0L;
        user.setTotalTasksCreated(currentTotal + 1);
        userRepository.save(user);

        task.setUser(user);
        return taskRepository.save(task);
    }

    @GetMapping
    public List<Task> getAllTasks(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername()).orElseThrow();
        return taskRepository.findByUserId(user.getId());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Task> getTaskById(@PathVariable Long id) {
        return taskRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Task> updateTask(@PathVariable Long id, @RequestBody Task taskDetails) {
        return taskRepository.findById(id).map(task -> {
            task.setTitle(taskDetails.getTitle());
            task.setDescription(taskDetails.getDescription());
            task.setDate(taskDetails.getDate());
            task.setTime(taskDetails.getTime());
            task.setCategory(taskDetails.getCategory());
            task.setPriority(taskDetails.getPriority());
            task.setCompleted(taskDetails.isCompleted());
            task.setWithNotification(taskDetails.isWithNotification());
            task.setRecurring(taskDetails.isRecurring());
            task.setNotificationState(taskDetails.getNotificationState());

            Task updatedTask = taskRepository.save(task);
            return ResponseEntity.ok(updatedTask);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        if (!taskRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        taskRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}