package com.ketoan.repository;

import com.ketoan.model.User;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@ApplicationScoped
public class UserRepository {

    private final AtomicLong idSeq = new AtomicLong(3);

    private final List<User> users = new ArrayList<>(List.of(
            new User(1L, "admin", "123", "admin", true),
            new User(2L, "user1", "123", "user", true),
            new User(3L, "user2", "123", "user", false)
    ));

    public List<User> findAll() {
        return users;
    }

    public User findByUsername(String username) {
        return users.stream()
                .filter(u -> u.username.equals(username))
                .findFirst()
                .orElse(null);
    }

    public User findById(Long id) {
        return users.stream().filter(u -> u.id.equals(id)).findFirst().orElse(null);
    }

    public User create(String username, String password, String role) {
        User u = new User(idSeq.incrementAndGet(), username, password, role, true);
        users.add(u);
        return u;
    }

    public boolean deleteById(Long id) {
        return users.removeIf(u -> u.id.equals(id));
    }
}