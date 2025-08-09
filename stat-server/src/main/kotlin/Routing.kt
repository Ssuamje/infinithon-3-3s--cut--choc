package com.smilegate

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.koin.ktor.ext.inject


fun Application.configureRouting() {
    install(StatusPages) {
        exception<Throwable> { call, cause ->
            call.respondText(text = "500: $cause" , status = HttpStatusCode.InternalServerError)
        }
    }
    
    val userController by inject<UserController>()
    
    routing {
        get("/") {
            call.respondText("3초컷 화이팅!")
        }

        post("/users") {
            userController.createUser(call)
        }

        get("/users") {
            userController.getAllUsers(call)
        }
    }
}
