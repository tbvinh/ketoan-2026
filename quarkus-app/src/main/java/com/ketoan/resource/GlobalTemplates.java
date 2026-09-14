/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.ketoan.resource;

import io.quarkus.qute.CheckedTemplate;
import io.quarkus.qute.TemplateInstance;

public class GlobalTemplates {

    @CheckedTemplate
    public static class Templates {
        public static native TemplateInstance error(String message);
        public static native TemplateInstance success(String message);
    }
}
