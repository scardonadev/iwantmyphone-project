package com.iwantmyphone.app.data.biometric

import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyPermanentlyInvalidatedException
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import kotlinx.coroutines.suspendCancellableCoroutine
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import kotlin.coroutines.resume

/**
 * Huella con clave pública (native-android/api/AGENTS.md §6):
 *
 *  - Registro: se genera en el Keystore un par EC P-256 que SOLO se puede usar
 *    tras autenticar con huella (BIOMETRIC_STRONG). La pública va a la API.
 *  - Entrar: la API manda un reto; se firma con la privada, desbloqueada con
 *    BiometricPrompt, y la API verifica la firma.
 *
 * La huella nunca sale del teléfono, y si se añade otra huella en Ajustes la
 * clave queda invalidada (setInvalidatedByBiometricEnrollment).
 */
object Huella {
    private const val ALIAS = "iwmp_huella"

    sealed interface Disponibilidad {
        data object Lista : Disponibilidad
        data object SinHuellas : Disponibilidad
        data class NoDisponible(val motivo: String) : Disponibilidad
    }

    fun disponibilidad(context: Context): Disponibilidad =
        when (BiometricManager.from(context).canAuthenticate(BIOMETRIC_STRONG)) {
            BiometricManager.BIOMETRIC_SUCCESS -> Disponibilidad.Lista
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> Disponibilidad.SinHuellas
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> Disponibilidad.NoDisponible("Este teléfono no tiene lector de huella.")
            BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> Disponibilidad.NoDisponible("El lector de huella no está disponible ahora mismo.")
            else -> Disponibilidad.NoDisponible("Este teléfono no admite huella segura.")
        }

    /** Abre los ajustes para registrar una huella en el teléfono. */
    fun intentRegistrarEnAjustes(): Intent =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Intent(Settings.ACTION_BIOMETRIC_ENROLL).putExtra(Settings.EXTRA_BIOMETRIC_AUTHENTICATORS_ALLOWED, BIOMETRIC_STRONG)
        } else {
            Intent(Settings.ACTION_SECURITY_SETTINGS)
        }

    private fun keyStore() = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }

    /** Crea (o reemplaza) el par de claves y devuelve la pública en SPKI DER base64. */
    fun crearClaves(): String {
        keyStore().deleteEntry(ALIAS)
        val spec = KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_SIGN)
            .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
            .setDigests(KeyProperties.DIGEST_SHA256)
            .setUserAuthenticationRequired(true)
            .setInvalidatedByBiometricEnrollment(true)
            .apply {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG)
                } else {
                    @Suppress("DEPRECATION")
                    setUserAuthenticationValidityDurationSeconds(-1)
                }
            }
            .build()
        val par = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, "AndroidKeyStore").run {
            initialize(spec)
            generateKeyPair()
        }
        return Base64.encodeToString(par.public.encoded, Base64.NO_WRAP)
    }

    fun hayClaves(): Boolean = keyStore().containsAlias(ALIAS)

    fun borrarClaves() {
        runCatching { keyStore().deleteEntry(ALIAS) }
    }

    /** Signature lista para firmar tras la huella, o null si la clave ya no vale. */
    fun firmaPreparada(): Signature? = try {
        val clave = keyStore().getKey(ALIAS, null) as? PrivateKey ?: return null
        Signature.getInstance("SHA256withECDSA").apply { initSign(clave) }
    } catch (_: KeyPermanentlyInvalidatedException) {
        borrarClaves()
        null
    }

    sealed interface Resultado {
        data class Ok(val firma: Signature) : Resultado
        data object Cancelado : Resultado
        data class Error(val mensaje: String) : Resultado
    }

    /** Muestra BiometricPrompt y desbloquea la firma con la huella. */
    suspend fun autenticar(
        activity: FragmentActivity,
        firma: Signature,
        titulo: String,
        subtitulo: String,
    ): Resultado = suspendCancellableCoroutine { cont ->
        val prompt = BiometricPrompt(
            activity,
            ContextCompat.getMainExecutor(activity),
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    val s = result.cryptoObject?.signature
                    if (cont.isActive) cont.resume(if (s != null) Resultado.Ok(s) else Resultado.Error("No se pudo desbloquear la clave."))
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    if (!cont.isActive) return
                    val cancelado = errorCode == BiometricPrompt.ERROR_USER_CANCELED ||
                        errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON ||
                        errorCode == BiometricPrompt.ERROR_CANCELED
                    cont.resume(if (cancelado) Resultado.Cancelado else Resultado.Error(errString.toString()))
                }
                // onAuthenticationFailed: huella no reconocida; el diálogo deja reintentar.
            },
        )
        val info = BiometricPrompt.PromptInfo.Builder()
            .setTitle(titulo)
            .setSubtitle(subtitulo)
            .setNegativeButtonText("Cancelar")
            .setAllowedAuthenticators(BIOMETRIC_STRONG)
            .build()
        prompt.authenticate(info, BiometricPrompt.CryptoObject(firma))
        cont.invokeOnCancellation { prompt.cancelAuthentication() }
    }

    fun firmarBase64(firma: Signature, texto: String): String {
        firma.update(texto.toByteArray(Charsets.UTF_8))
        return Base64.encodeToString(firma.sign(), Base64.NO_WRAP)
    }
}
