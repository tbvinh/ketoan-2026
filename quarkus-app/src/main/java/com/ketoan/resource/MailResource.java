/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.ketoan.resource;


import com.ketoan.model.Email;
import io.quarkus.qute.Location;
import io.quarkus.qute.Template;
import io.quarkus.qute.TemplateInstance;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import java.util.List;

@Path("/mail")
@Produces(MediaType.TEXT_HTML)
public class MailResource {

    
    @Inject
    @Location("main-layout")
    Template mainLayout;

    @Inject
    @Location("pages/inbox")
    Template inbox;

    @Inject
    @Location("pages/sent")
    Template sent;

    
    // Hàm render dùng chung giúp tự động truyền data cho cả Layout và Fragment
    private TemplateInstance renderView(String hxRequest, String title, String subMenu, Template fragmentTemplate, Object data) {
        TemplateInstance fragment = fragmentTemplate.data("emails", data);
        
        if ("true".equals(hxRequest)) {
            return fragment;
        }

        return mainLayout
                .data("contentTitle", title)
                .data("currentSubMenu", subMenu)
                .data("emails", data)
                .data("content", fragment);
    }

    @GET
    @Path("/inbox")
    public TemplateInstance getInbox(@HeaderParam("HX-Request") String hxRequest) {
        var emailList = List.of(
            new Email("Nguyễn Văn A", "Báo cáo tuần", "12/09")
        );

        if ("true".equals(hxRequest)) {
            return inbox.data("emails", emailList);
        }

        return mainLayout
                .data("contentTitle", "Inbox")
                .data("currentSubMenu", "file")
                .data("content", inbox.data("emails", emailList));
    }

    @GET
    @Path("/sent")
    @Produces(MediaType.TEXT_HTML)
    public TemplateInstance getSent(@HeaderParam("HX-Request") String hxRequest) {
        System.out.println("=== ĐÃ GỌI ĐƯỢC VÀO METHOD GETSENT ===");
        var emailList = List.of(
            new Email("Tôi", "Gửi báo cáo cho sếp", "10/09")
        );

        if ("true".equals(hxRequest)) {
            return sent.data("emails", emailList);
        }

        return mainLayout
                .data("contentTitle", "Sent")
                .data("currentSubMenu", "edit")
//                .data("content", sent.data("emails", emailList))
                .data("content", sent.data("emails", emailList));
    }
}