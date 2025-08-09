package com.smilegate

import io.ktor.server.application.*
import org.jetbrains.exposed.sql.*
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module
import org.koin.ktor.plugin.Koin
import org.koin.logger.slf4jLogger

fun Application.configureDatabases() {
    // Database configuration without Koin installation
}

val databaseModule = module {
    single<Database> {
        val url = System.getenv("POSTGRES_URL") ?: "jdbc:postgresql://localhost:5432/statdb"
        val user = System.getenv("POSTGRES_USER") ?: "statuser"
        val password = System.getenv("POSTGRES_PASSWORD") ?: "statpass"
        
        Database.connect(
            url = url,
            user = user,
            driver = "org.postgresql.Driver",
            password = password,
        )
    }
}
