package br.com.sualistapessoal.gerenciador_tarefas;

import br.com.sualistapessoal.gerenciador_tarefas.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private UserDetailsService userDetailsService;

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody User user) {
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            return new ResponseEntity<>("Username já está em uso!", HttpStatus.BAD_REQUEST);
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setTotalTasksCreated(0L); // Inicia o contador
        userRepository.save(user);
        return new ResponseEntity<>(Map.of("message", "Usuário registrado com sucesso!"), HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(username, password));
        } catch (Exception e) {
            return new ResponseEntity<>("Credenciais inválidas", HttpStatus.UNAUTHORIZED);
        }

        final UserDetails userDetails = userDetailsService.loadUserByUsername(username);
        final String token = jwtTokenProvider.generateToken(userDetails);
        User user = userRepository.findByUsername(username).get();

        // CORREÇÃO: Buscando o total de tarefas do campo do usuário, não do repositório de tarefas ativas.
        long totalTasks = user.getTotalTasksCreated() != null ? user.getTotalTasksCreated() : 0L;

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("name", user.getName());
        response.put("age", user.getAge());
        response.put("photo", user.getPhoto());
        response.put("totalTasks", totalTasks);

        return ResponseEntity.ok(response);
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateUserProfile(@RequestBody Map<String, String> updates, @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails.getUsername();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        user.setName(updates.get("name"));
        user.setAge(Integer.parseInt(updates.get("age")));
        if (updates.containsKey("photo")) {
            user.setPhoto(updates.get("photo"));
        }

        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Perfil atualizado com sucesso!"));
    }
}