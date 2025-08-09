package com.smilegate

import io.ktor.server.application.*

fun main(args: Array<String>) {
    io.ktor.server.netty.EngineMain.main(args)
}

fun Application.module() {
    configureApplicationDependencies()
    configureMonitoring()
    configureHTTP()
    configureSerialization()
    configureDatabases()
    configureRouting()
}
