package com.smilegate

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*

class UserController(private val userService: UserService) {
    
    suspend fun createUser(call: ApplicationCall) {
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
    
    suspend fun getAllUsers(call: ApplicationCall) {
        val users = userService.getAll()
        call.respond(HttpStatusCode.OK, users)
    }
}