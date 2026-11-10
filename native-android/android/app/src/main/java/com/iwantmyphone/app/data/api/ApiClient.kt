package com.iwantmyphone.app.data.api

import android.util.Log
import com.iwantmyphone.app.BuildConfig
import com.iwantmyphone.app.data.session.SessionStore
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.Authenticator
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.Route
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * Error de la API ya traducido: `campos` trae los mensajes de `details.campos`
 * (campo -> mensaje) para pintarlos bajo cada campo del formulario.
 */
class ApiException(
    val status: Int,
    val code: String,
    override val message: String,
    val campos: Map<String, String> = emptyMap(),
) : Exception(message)

object ApiClient {
    private val JSON_MEDIA = "application/json".toMediaType()

    fun crear(baseUrl: String, json: Json, sesion: SessionStore): Pair<ApiService, OkHttpClient> {
        val base = baseUrl.trimEnd('/') + "/"
        val http = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(BearerInterceptor(sesion))
            .authenticator(RefreshAuthenticator(base, json, sesion))
            .apply {
                if (BuildConfig.DEBUG) addInterceptor(HttpLoggingInterceptor().setLevel(HttpLoggingInterceptor.Level.BASIC))
            }
            .build()
        val retrofit = Retrofit.Builder()
            .baseUrl(base)
            .client(http)
            .addConverterFactory(json.asConverterFactory(JSON_MEDIA))
            .build()
        return retrofit.create(ApiService::class.java) to http
    }

    /** Añade el access token de la sesión, si hay. */
    private class BearerInterceptor(private val sesion: SessionStore) : Interceptor {
        override fun intercept(chain: Interceptor.Chain): Response {
            val token = sesion.actual?.accessToken
            val req = if (token != null && chain.request().header("Authorization") == null) {
                chain.request().newBuilder().header("Authorization", "Bearer $token").build()
            } else {
                chain.request()
            }
            return chain.proceed(req)
        }
    }

    /**
     * Ante un 401 con token, cambia el refresh por un par nuevo (una vez) y
     * repite la petición. Si el refresh tampoco vale, cierra la sesión: la app
     * vuelve a modo anónimo y el usuario tendrá que entrar de nuevo.
     */
    private class RefreshAuthenticator(
        private val base: String,
        private val json: Json,
        private val sesion: SessionStore,
    ) : Authenticator {
        private val cliente = OkHttpClient.Builder().connectTimeout(15, TimeUnit.SECONDS).build()

        override fun authenticate(route: Route?, response: Response): Request? {
            val enviado = response.request.header("Authorization") ?: return null
            if (response.priorResponse != null) return null // ya se reintentó una vez

            synchronized(this) {
                val actual = sesion.actual ?: return null
                // Otro hilo ya lo renovó mientras esperábamos.
                if ("Bearer ${actual.accessToken}" != enviado) {
                    return response.request.newBuilder().header("Authorization", "Bearer ${actual.accessToken}").build()
                }
                val cuerpo = json.encodeToString(RefreshReq.serializer(), RefreshReq(actual.refreshToken))
                val req = Request.Builder().url(base + "api/auth/refresh").post(cuerpo.toRequestBody(JSON_MEDIA)).build()
                val nuevo = try {
                    cliente.newCall(req).execute().use { r ->
                        if (!r.isSuccessful) null
                        else json.decodeFromString(Envelope.serializer(SesionResp.serializer()), r.body.string()).data
                    }
                } catch (_: IOException) {
                    return null
                }
                if (nuevo == null) {
                    sesion.cerrarDesdeRed()
                    return null
                }
                sesion.actualizarDesdeRed(nuevo)
                return response.request.newBuilder().header("Authorization", "Bearer ${nuevo.accessToken}").build()
            }
        }
    }
}

/**
 * Ejecuta una llamada y devuelve `data`, o lanza [ApiException] con el error
 * de la API ya leído. Sin conexión: código "RED".
 */
suspend fun <T> llamar(json: Json, bloque: suspend () -> Envelope<T>): T {
    @Suppress("UNCHECKED_CAST")
    return ejecutar(json, bloque).data as T
}

/** Igual que [llamar], pero conserva el `meta` de los listados paginados. */
suspend fun <T> llamarPagina(json: Json, bloque: suspend () -> Envelope<List<T>>): Pagina<T> {
    val sobre = ejecutar(json, bloque)
    return Pagina(sobre.data.orEmpty(), sobre.meta)
}

private suspend fun <T> ejecutar(json: Json, bloque: suspend () -> Envelope<T>): Envelope<T> = try {
    bloque()
} catch (e: HttpException) {
    throw traducir(json, e)
} catch (e: IOException) {
    throw ApiException(0, "RED", "No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.")
} catch (e: SerializationException) {
    // Contrato roto entre app y API: al log el detalle, al usuario un mensaje legible.
    Log.e("iwmp", "Respuesta de la API con un formato inesperado", e)
    throw ApiException(0, "FORMATO", "La respuesta del servidor no tiene el formato esperado. Actualiza la app o inténtalo más tarde.")
}

private fun traducir(json: Json, e: HttpException): ApiException {
    val texto = try { e.response()?.errorBody()?.string() } catch (_: IOException) { null }
    val detalle = texto?.let { runCatching { json.decodeFromString(ErrorBody.serializer(), it).error }.getOrNull() }
    val campos = (detalle?.details as? JsonObject)?.get("campos")?.let { c ->
        runCatching { c.jsonObject.mapValues { it.value.jsonPrimitive.content } }.getOrNull()
    }.orEmpty()
    return ApiException(
        status = e.code(),
        code = detalle?.code ?: "HTTP_${e.code()}",
        message = detalle?.message ?: "Error del servidor (${e.code()})",
        campos = campos,
    )
}
