package com.iwantmyphone.app

import android.app.Application
import android.content.Context
import com.iwantmyphone.app.data.Cuenta
import com.iwantmyphone.app.data.api.ApiClient
import com.iwantmyphone.app.data.api.ApiService
import com.iwantmyphone.app.data.api.Meta
import com.iwantmyphone.app.data.cart.CartStore
import com.iwantmyphone.app.data.session.SessionStore
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNamingStrategy

/**
 * Nombres de la API: snake_case (`precio_final` <-> `precioFinal`), salvo el
 * `meta` de paginación, que la API manda en camelCase como el Next.
 */
@OptIn(ExperimentalSerializationApi::class)
private object NombresApi : JsonNamingStrategy {
    override fun serialNameForJson(descriptor: SerialDescriptor, elementIndex: Int, serialName: String): String =
        if (descriptor.serialName == Meta.serializer().descriptor.serialName) serialName
        else JsonNamingStrategy.SnakeCase.serialNameForJson(descriptor, elementIndex, serialName)
}

/**
 * Inyección de dependencias a mano: un contenedor por proceso. La app es
 * pequeña y así no hace falta Hilt (ni su procesador de anotaciones).
 */
class AppContainer(context: Context) {
    @OptIn(ExperimentalSerializationApi::class)
    val json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
        coerceInputValues = true
        namingStrategy = NombresApi
    }
    val sesionStore = SessionStore(context, json)
    val carrito = CartStore(context, json)
    val api: ApiService = ApiClient.crear(BuildConfig.API_URL, json, sesionStore).first
    val cuenta = Cuenta(api, json, sesionStore)
}

class IwmpApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}
