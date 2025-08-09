package com.smilegate

import io.ktor.server.application.*
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module
import org.koin.ktor.plugin.Koin
import org.koin.logger.slf4jLogger

fun Application.configureApplicationDependencies() {
    install(Koin) {
        slf4jLogger()
        modules(databaseModule, applicationModule)
    }
}

val applicationModule = module {
    single { UserService(get()) }
    singleOf(::UserController)
}