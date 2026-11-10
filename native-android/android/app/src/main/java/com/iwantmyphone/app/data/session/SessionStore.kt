package com.iwantmyphone.app.data.session

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.iwantmyphone.app.data.api.SesionResp
import com.iwantmyphone.app.data.api.Usuario
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

private val Context.datosSesion by preferencesDataStore("sesion")

@Serializable
data class SesionLocal(val accessToken: String, val refreshToken: String, val usuario: Usuario) {
    fun puede(permiso: String) = permiso in usuario.permisos
}

/** Credencial biométrica registrada en ESTE teléfono (no es secreta: la privada está en el Keystore). */
@Serializable
data class HuellaLocal(val credencialId: String, val email: String, val nombre: String)

/**
 * Sesión del usuario: en memoria para el interceptor HTTP (lectura síncrona)
 * y en DataStore, cifrada con el Keystore, para sobrevivir a cerrar la app.
 */
class SessionStore(private val context: Context, private val json: Json) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val claveSesion = stringPreferencesKey("sesion_cifrada")
    private val claveHuella = stringPreferencesKey("huella")

    private val _sesion = MutableStateFlow<SesionLocal?>(null)
    val sesion: StateFlow<SesionLocal?> = _sesion.asStateFlow()

    private val _huella = MutableStateFlow<HuellaLocal?>(null)
    val huella: StateFlow<HuellaLocal?> = _huella.asStateFlow()

    private val _cargada = MutableStateFlow(false)
    /** true cuando ya se leyó lo guardado: el splash espera a esto. */
    val cargada: StateFlow<Boolean> = _cargada.asStateFlow()

    @Volatile var actual: SesionLocal? = null
        private set

    init {
        scope.launch {
            val prefs = context.datosSesion.data.first()
            val sesion = prefs[claveSesion]?.let(Cifrado::descifrar)?.let {
                runCatching { json.decodeFromString(SesionLocal.serializer(), it) }.getOrNull()
            }
            actual = sesion
            _sesion.value = sesion
            _huella.value = prefs[claveHuella]?.let { runCatching { json.decodeFromString(HuellaLocal.serializer(), it) }.getOrNull() }
            _cargada.value = true
        }
    }

    suspend fun guardar(resp: SesionResp) = escribir(SesionLocal(resp.accessToken, resp.refreshToken, resp.usuario))

    suspend fun actualizarUsuario(usuario: Usuario) {
        actual?.let { escribir(it.copy(usuario = usuario)) }
    }

    suspend fun cerrar() = escribir(null)

    suspend fun guardarHuella(huella: HuellaLocal?) {
        _huella.value = huella
        context.datosSesion.edit { p ->
            if (huella == null) p.remove(claveHuella) else p[claveHuella] = json.encodeToString(HuellaLocal.serializer(), huella)
        }
    }

    /** Desde el hilo de OkHttp (refresh correcto). */
    fun actualizarDesdeRed(resp: SesionResp) {
        val nueva = SesionLocal(resp.accessToken, resp.refreshToken, resp.usuario)
        actual = nueva
        _sesion.value = nueva
        scope.launch { escribir(nueva) }
    }

    /** Desde el hilo de OkHttp (refresh rechazado). */
    fun cerrarDesdeRed() {
        actual = null
        _sesion.value = null
        scope.launch { escribir(null) }
    }

    private suspend fun escribir(sesion: SesionLocal?) {
        actual = sesion
        _sesion.value = sesion
        context.datosSesion.edit { p ->
            if (sesion == null) p.remove(claveSesion)
            else p[claveSesion] = Cifrado.cifrar(json.encodeToString(SesionLocal.serializer(), sesion))
        }
    }
}
