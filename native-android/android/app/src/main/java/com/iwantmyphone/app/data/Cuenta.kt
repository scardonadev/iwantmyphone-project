package com.iwantmyphone.app.data

import android.os.Build
import androidx.fragment.app.FragmentActivity
import com.iwantmyphone.app.data.api.ApiException
import com.iwantmyphone.app.data.api.ApiService
import com.iwantmyphone.app.data.api.BioLoginReq
import com.iwantmyphone.app.data.api.BiometriaReq
import com.iwantmyphone.app.data.api.LoginReq
import com.iwantmyphone.app.data.api.RegistroReq
import com.iwantmyphone.app.data.api.RetoReq
import com.iwantmyphone.app.data.api.SesionResp
import com.iwantmyphone.app.data.api.llamar
import com.iwantmyphone.app.data.biometric.Huella
import com.iwantmyphone.app.data.session.HuellaLocal
import com.iwantmyphone.app.data.session.SessionStore
import kotlinx.serialization.json.Json

/**
 * Todo lo que es sesión: contraseña, huella, registro y cierre. Las pantallas
 * de login y registro solo llaman aquí.
 */
class Cuenta(private val api: ApiService, private val json: Json, private val store: SessionStore) {
    val sesion = store.sesion
    val huella = store.huella

    private val nombreDispositivo: String
        get() = "${Build.MANUFACTURER.replaceFirstChar { it.uppercase() }} ${Build.MODEL}".take(100)

    suspend fun login(email: String, password: String): SesionResp {
        val resp = llamar(json) { api.login(LoginReq(email.trim(), password)) }
        store.guardar(resp)
        return resp
    }

    /**
     * Paso previo al registro: crea las claves y pide la huella para comprobar
     * que funciona. Devuelve la clave pública para enviarla en el alta.
     */
    suspend fun prepararHuella(activity: FragmentActivity): Result<String> {
        val publica = runCatching { Huella.crearClaves() }.getOrElse {
            return Result.failure(Exception("No se pudo crear la clave segura en este teléfono."))
        }
        val firma = Huella.firmaPreparada() ?: return Result.failure(Exception("No se pudo preparar la clave de la huella."))
        return when (val r = Huella.autenticar(activity, firma, "Registra tu huella", "La usarás para entrar a iWantMyPhone")) {
            is Huella.Resultado.Ok -> {
                Huella.firmarBase64(r.firma, "registro") // la clave queda probada de punta a punta
                Result.success(publica)
            }
            Huella.Resultado.Cancelado -> Result.failure(Exception("Registro de huella cancelado."))
            is Huella.Resultado.Error -> Result.failure(Exception(r.mensaje))
        }
    }

    suspend fun registrar(email: String, nombre: String, password: String, telefono: String?, publicKey: String): SesionResp {
        val resp = llamar(json) {
            api.registro(RegistroReq(email.trim(), nombre.trim(), password, telefono?.takeIf { it.isNotBlank() }, BiometriaReq(nombreDispositivo, publicKey)))
        }
        store.guardar(resp)
        resp.credencialBiometricaId?.let { store.guardarHuella(HuellaLocal(it, resp.usuario.email, resp.usuario.nombre)) }
        return resp
    }

    /** Entrar con huella: reto de la API firmado con la clave del Keystore. */
    suspend fun loginConHuella(activity: FragmentActivity): Result<SesionResp> {
        val local = store.huella.value ?: return Result.failure(Exception("Este teléfono no tiene huella registrada."))
        val firma = Huella.firmaPreparada()
        if (firma == null) {
            store.guardarHuella(null)
            return Result.failure(Exception("La huella del teléfono cambió. Entra con tu contraseña y vuelve a activarla."))
        }
        return runCatching {
            val reto = llamar(json) { api.reto(RetoReq(local.credencialId)) }.reto
            when (val r = Huella.autenticar(activity, firma, "Entrar con huella", local.email)) {
                is Huella.Resultado.Ok -> {
                    val resp = llamar(json) { api.loginBiometria(BioLoginReq(local.credencialId, reto, Huella.firmarBase64(r.firma, reto))) }
                    store.guardar(resp)
                    resp
                }
                Huella.Resultado.Cancelado -> throw Exception("Cancelado")
                is Huella.Resultado.Error -> throw Exception(r.mensaje)
            }
        }.onFailure { e ->
            // La credencial ya no existe en la API (borrada o usuario eliminado): se olvida.
            if (e is ApiException && e.status == 401 && e.message.contains("Huella")) store.guardarHuella(null)
        }
    }

    /** Activa la huella en este teléfono para el usuario con sesión (cuentas creadas por un administrador). */
    suspend fun activarHuella(activity: FragmentActivity): Result<Unit> {
        val usuario = store.sesion.value?.usuario ?: return Result.failure(Exception("No hay sesión."))
        return runCatching {
            val publica = prepararHuella(activity).getOrThrow()
            val cred = llamar(json) { api.registrarCredencial(BiometriaReq(nombreDispositivo, publica)) }
            store.guardarHuella(HuellaLocal(cred.id, usuario.email, usuario.nombre))
        }
    }

    /** Sincroniza nombre, rol y permisos con la API (un administrador pudo cambiarlos). */
    suspend fun refrescarUsuario() {
        if (store.actual == null) return
        runCatching { llamar(json) { api.yo() } }.onSuccess { store.actualizarUsuario(it) }
    }

    suspend fun cerrarSesion() = store.cerrar()
}
