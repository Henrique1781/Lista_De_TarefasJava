package br.com.sualistapessoal.gerenciador_tarefas;// src/main/java/br/com/suarotina/gerenciadortarefas/Task.java

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity // Anotação que diz ao Spring que esta classe é uma tabela no banco de dados
public class Task {

    @Id // Marca o 'id' como a chave primária da tabela
    @GeneratedValue(strategy = GenerationType.IDENTITY) // Diz que o banco de dados vai gerar o id automaticamente
    private Long id;

    private String title;
    private String description;
    private LocalDate date;
    private LocalTime time;
    private String category;
    private String priority;
    private boolean completed = false; // Por padrão, uma nova tarefa não está completa

    // NOVOS CAMPOS
    private boolean withNotification = false;
    private boolean recurring = false;
    private int notificationState = 0; // NOVO CAMPO: Controla os estágios de notificação enviados

    @ManyToOne
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private User user;

    // Getters e Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public LocalTime getTime() {
        return time;
    }

    public void setTime(LocalTime time) {
        this.time = time;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public boolean isCompleted() {
        return completed;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }

    // GETTERS E SETTERS PARA OS NOVOS CAMPOS
    public boolean isWithNotification() {
        return withNotification;
    }

    public void setWithNotification(boolean withNotification) {
        this.withNotification = withNotification;
    }

    public boolean isRecurring() {
        return recurring;
    }

    public void setRecurring(boolean recurring) {
        this.recurring = recurring;
    }

    public int getNotificationState() {
        return notificationState;
    }

    public void setNotificationState(int notificationState) {
        this.notificationState = notificationState;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

}