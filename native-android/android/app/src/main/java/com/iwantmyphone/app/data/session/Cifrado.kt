package com.iwantmyphone.app.data.session

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * AES-256/GCM con una clave que vive en el Android Keystore (no se puede
 * extraer del teléfono). Cifra los tokens de sesión antes de guardarlos en
 * DataStore. No pide huella: la sesión tiene que poder leerse al abrir la app.
 */
internal object Cifrado {
    private const val ALIAS = "iwmp_sesion"
    private const val TRANSFORMACION = "AES/GCM/NoPadding"

    private fun clave(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getKey(ALIAS, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").run {
            init(
                KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setKeySize(256)
                    .build(),
            )
            generateKey()
        }
    }

    fun cifrar(texto: String): String {
        val cipher = Cipher.getInstance(TRANSFORMACION).apply { init(Cipher.ENCRYPT_MODE, clave()) }
        val datos = cipher.iv + cipher.doFinal(texto.toByteArray(Charsets.UTF_8))
        return Base64.encodeToString(datos, Base64.NO_WRAP)
    }

    /** null si no se puede descifrar (clave borrada al reinstalar, datos corruptos…). */
    fun descifrar(base64: String): String? = runCatching {
        val datos = Base64.decode(base64, Base64.NO_WRAP)
        val cipher = Cipher.getInstance(TRANSFORMACION).apply {
            init(Cipher.DECRYPT_MODE, clave(), GCMParameterSpec(128, datos, 0, 12))
        }
        String(cipher.doFinal(datos, 12, datos.size - 12), Charsets.UTF_8)
    }.getOrNull()
}
