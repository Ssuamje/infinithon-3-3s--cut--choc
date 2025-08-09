package com.smilegate

import kotlinx.coroutines.Dispatchers
import kotlinx.serialization.Contextual
import kotlinx.serialization.Serializable
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.javatime.timestamp
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.Instant

@Serializable
data class UserRequest(val nickname: String)

@Serializable
data class User(val nickname: String, @Contextual val createdAt: Instant)

class UserService(database: Database) {
    object Users : Table() {
        val id = integer("id").autoIncrement()
        val nickname = varchar("nickname", length = 50).uniqueIndex()
        val createdAt = timestamp("created_at")

        override val primaryKey = PrimaryKey(id)
    }

    init {
        transaction(database) {
            SchemaUtils.createMissingTablesAndColumns(Users)
        }
    }

    suspend fun create(userRequest: UserRequest): User = dbQuery {
        val existingUser = Users.selectAll().where { Users.nickname eq userRequest.nickname }.singleOrNull()
        if (existingUser != null) {
            throw Exception("Nickname already exists")
        }
        
        val now = Instant.now()
        Users.insert {
            it[nickname] = userRequest.nickname
            it[createdAt] = now
        }
        
        User(userRequest.nickname, now)
    }

    suspend fun getAll(): List<User> = dbQuery {
        Users.selectAll()
            .map { User(it[Users.nickname], it[Users.createdAt]) }
    }

    private suspend fun <T> dbQuery(block: suspend () -> T): T =
        newSuspendedTransaction(Dispatchers.IO) { block() }
}

