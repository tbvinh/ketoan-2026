/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.ketoan.entity;

/**
 *
 * @author tbvin
 */



import com.fasterxml.jackson.annotation.JsonIgnore;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "users", schema = "public")
public class User extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    public String username;

    @JsonIgnore
    public String password;

    public String role;

    @Column(name = "full_name")
    public String fullName;

    @Column(name = "image_url")
    public String imageUrl;

    public Boolean active = true;
//    public String token;

    public static User findByUsername(String username) {
        return find("username", username).firstResult();
    }

//    public static User findByToken(String token) {
//        return find("token", token).firstResult();
//    }
}

