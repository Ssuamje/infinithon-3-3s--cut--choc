package com.smilegate

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import org.koin.ktor.ext.inject
import java.time.Instant

class BlinkController(
    private val blinkService: BlinkService,
    private val userService: UserService
) {

    suspend fun saveTestBlink(call: ApplicationCall) {
        try {
            val nickname = call.parameters["nickname"]

            if (nickname == null) {
                call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid nickname"))
                return
            }

            val user = userService.getUserByNickname(nickname)
            if (user == null) {
                call.respond(HttpStatusCode.NotFound, mapOf("error" to "User not found"))
                return
            }
            val blinkEventRequest = BlinkEventRequest(timestamp = Instant.now())
            val blinkResult = blinkService.saveEvents(user.nickname, listOf(blinkEventRequest))

            call.respond(HttpStatusCode.OK, blinkResult)
        } catch (e: Exception) {
            call.respond(HttpStatusCode.InternalServerError, mapOf("error" to e.message))
        }
    }

    suspend fun saveBlinkEvents(call: ApplicationCall) {
        try {
            val request = call.receive<BlinkEventsRequest>()
            
            val savedEvents = blinkService.saveEvents(request.nickname, request.events)
            call.respond(HttpStatusCode.Created, savedEvents)
        } catch (e: Exception) {
            call.respond(HttpStatusCode.BadRequest, mapOf("error" to e.message))
        }
    }
    
    suspend fun getBlinkEvents(call: ApplicationCall) {
        try {
            val nickname = call.parameters["nickname"]
            
            if (nickname == null) {
                call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid nickname"))
                return
            }
            
            val events = blinkService.getEventsByNickname(nickname)
            call.respond(HttpStatusCode.OK, events)
        } catch (e: Exception) {
            call.respond(HttpStatusCode.InternalServerError, mapOf("error" to e.message))
        }
    }

    suspend fun getBlinkRankings(call: ApplicationCall) {
        try {
            val rankings = blinkService.getRankings()
            call.respond(HttpStatusCode.OK, rankings)
        } catch (e: Exception) {
            call.respond(HttpStatusCode.InternalServerError, mapOf("error" to e.message))
        }
    }
}