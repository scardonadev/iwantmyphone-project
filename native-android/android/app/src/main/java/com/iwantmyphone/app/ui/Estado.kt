package com.iwantmyphone.app.ui

import android.content.Context
import android.content.ContextWrapper
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.fragment.app.FragmentActivity
import com.iwantmyphone.app.data.api.ApiException

/** Estado de una carga remota. */
sealed interface Carga<out T> {
    data object Cargando : Carga<Nothing>
    data class Listo<T>(val datos: T) : Carga<T>
    data class Error(val mensaje: String) : Carga<Nothing>
}

/** Mensaje para el usuario: el de la API si lo hay. */
fun Throwable.mensaje(): String = when (this) {
    is ApiException -> message
    else -> message ?: "Ocurrió un error inesperado."
}

/** Errores por campo de la API (`details.campos`), o vacío. */
fun Throwable.campos(): Map<String, String> = (this as? ApiException)?.campos.orEmpty()

/** BiometricPrompt necesita la FragmentActivity que aloja Compose. */
@Composable
fun actividad(): FragmentActivity {
    var c: Context = LocalContext.current
    while (c is ContextWrapper) {
        if (c is FragmentActivity) return c
        c = c.baseContext
    }
    error("Compose no está dentro de una FragmentActivity")
}
