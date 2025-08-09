package com.smilegate

import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.plugins.calllogging.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.sql.Connection
import java.sql.DriverManager
import org.jetbrains.exposed.sql.*
import org.slf4j.event.*

fun Application.configureRouting() {
    install(StatusPages) {
        exception<Throwable> { call, cause ->
            call.respondText(text = "500: $cause" , status = HttpStatusCode.InternalServerError)
        }
    }
    
    // Database setup
    val url = environment.config.property("postgres.url").getString()
    val user = environment.config.property("postgres.user").getString()
    val password = environment.config.property("postgres.password").getString()
    
    val database = Database.connect(
        url = url,
        user = user,
        driver = "org.postgresql.Driver",
        password = password,
    )
    val userService = UserService(database)
    
    routing {
        get("/") {
            call.respondText("3초컷 화이팅!")
        }

        post("/users") {
            try {
                val userRequest = call.receive<UserRequest>()
                val user = userService.create(userRequest)
                call.respond(HttpStatusCode.Created, user)
            } catch (e: Exception) {
                if (e.message == "Nickname already exists") {
                    call.respond(HttpStatusCode.Conflict, "Nickname already exists")
                } else {
                    call.respond(HttpStatusCode.InternalServerError, "Error creating user")
                }
            }
        }

        get("/users") {
            val users = userService.getAll()
            call.respond(HttpStatusCode.OK, users)
        }
    }
}
