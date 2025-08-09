package com.smilegate

import kotlinx.coroutines.Dispatchers
import kotlinx.serialization.Contextual
import kotlinx.serialization.Serializable
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.javatime.timestamp
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.Duration
import java.time.Instant

@Serializable
data class BlinkEventRequest(val timestamp: @Contextual Instant)

@Serializable 
data class BlinkEventsRequest(val nickname: String, val events: List<BlinkEventRequest>)

@Serializable
data class BlinkEvent(val id: Int, val userId: Int, val timestamp: @Contextual Instant)

@Serializable
data class BlinkRanking(val userId: Int, val nickname: String, val totalEvents: Int, val eventsPerMinute: Double)

class BlinkService(database: Database) {
    object BlinkEvents : Table() {
        val id = integer("id").autoIncrement()
        val userId = integer("user_id").references(UserService.Users.id)
        val timestamp = timestamp("timestamp")
        
        override val primaryKey = PrimaryKey(id)
    }
    
    init {
        transaction(database) {
            SchemaUtils.drop(BlinkEvents)
            SchemaUtils.create(BlinkEvents)
        }
    }
    
    suspend fun saveEvents(nickname: String, events: List<BlinkEventRequest>): List<BlinkEvent> = dbQuery {
        val savedEvents = mutableListOf<BlinkEvent>()
        val user = UserService.Users.selectAll()
            .where { UserService.Users.nickname eq nickname }
            .singleOrNull() ?: return@dbQuery emptyList()
        
        events.forEach { event ->
            val insertResult = BlinkEvents.insert {
                it[BlinkEvents.userId] = user[UserService.Users.id]
                it[timestamp] = event.timestamp
            }
            
            val insertedId = insertResult[BlinkEvents.id]
            savedEvents.add(BlinkEvent(insertedId, user[UserService.Users.id], event.timestamp))
        }
        
        savedEvents
    }

    suspend fun getRankings(): List<BlinkRanking> = dbQuery {
        val u = UserService.Users
        val be = BlinkEvents

        // 누적용 구조체
        data class Agg(
            var nickname: String,
            var total: Int,
            var minTs: Instant,
            var maxTs: Instant
        )

        val acc = HashMap<Int, Agg>() // userId -> Agg

        // ⚠️ 인픽스 innerJoin 대신 명시적 join 사용 (타입 추론/수신자 문제 회피)
        val join: Join = be.join(
            otherTable = u,
            joinType = JoinType.INNER,
            onColumn = be.userId,
            otherColumn = u.id
        )

        // 원천 행만 읽어서 앱에서 누적
        join.selectAll().forEach { row ->
            val userId = row[u.id]
            val nickname = row[u.nickname]
            val ts: Instant = row[be.timestamp]

            val cur = acc[userId]
            if (cur == null) {
                acc[userId] = Agg(
                    nickname = nickname,
                    total = 1,
                    minTs = ts,
                    maxTs = ts
                )
            } else {
                cur.total += 1
                if (ts.isBefore(cur.minTs)) cur.minTs = ts
                if (ts.isAfter(cur.maxTs)) cur.maxTs = ts
            }
        }

        // 최종 계산 + 정렬 (쿼리 연산 없음)
        acc.map { (userId, a) ->
            val seconds = Duration.between(a.minTs, a.maxTs).seconds
            val denomSeconds = if (seconds <= 0L) 60L else seconds // 단일 이벤트 보호
            val epm = a.total.toDouble() / (denomSeconds.toDouble() / 60.0)

            BlinkRanking(
                userId = userId,
                nickname = a.nickname,
                totalEvents = a.total,
                eventsPerMinute = epm
            )
        }.sortedWith(
            compareByDescending<BlinkRanking> { it.totalEvents }
                .thenByDescending { it.eventsPerMinute }
        )
    }
    
    suspend fun getEventsByNickname(nickname: String): List<BlinkEvent> = dbQuery {
        val user = UserService.Users.selectAll()
            .where { UserService.Users.nickname eq nickname }
            .singleOrNull() ?: return@dbQuery emptyList()

        BlinkEvents.selectAll()
            .where { BlinkEvents.userId eq user[UserService.Users.id] }
            .orderBy(BlinkEvents.timestamp)
            .map { 
                BlinkEvent(
                    id = it[BlinkEvents.id],
                    userId = it[BlinkEvents.userId], 
                    timestamp = it[BlinkEvents.timestamp]
                )
            }
    }
    
    private suspend fun <T> dbQuery(block: suspend () -> T): T =
        newSuspendedTransaction(Dispatchers.IO) { block() }
}