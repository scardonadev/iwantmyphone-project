package com.iwantmyphone.app.data.cart

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.iwantmyphone.app.data.api.Celular
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json

private val Context.datosCarrito by preferencesDataStore("carrito")

@Serializable
data class ItemCarrito(
    val celularId: String,
    val nombre: String,
    val imagen: String? = null,
    val precio: Double,
    val precioFinal: Double,
    val cantidad: Int,
)

/**
 * El carrito vive en el teléfono: un visitante sin sesión también compra hasta
 * llegar a la pasarela. Los precios guardados son orientativos; al pagar, la
 * API recalcula todo desde la BD y manda su total.
 */
class CartStore(private val context: Context, private val json: Json) {
    private val clave = stringPreferencesKey("items")
    private val serializer = ListSerializer(ItemCarrito.serializer())

    val items: Flow<List<ItemCarrito>> = context.datosCarrito.data.map { p ->
        p[clave]?.let { runCatching { json.decodeFromString(serializer, it) }.getOrNull() }.orEmpty()
    }

    suspend fun agregar(c: Celular, cantidad: Int = 1) = modificar { lista ->
        val existente = lista.find { it.celularId == c.id }
        if (existente != null) {
            lista.map { if (it.celularId == c.id) it.copy(cantidad = (it.cantidad + cantidad).coerceAtMost(MAX)) else it }
        } else {
            lista + ItemCarrito(c.id, c.nombre, c.imagesUrl.firstOrNull(), c.precio, c.precioFinal, cantidad.coerceAtMost(MAX))
        }
    }

    /** A 0 la línea desaparece (Excel, fila 9). */
    suspend fun cambiarCantidad(celularId: String, cantidad: Int) = modificar { lista ->
        if (cantidad <= 0) lista.filterNot { it.celularId == celularId }
        else lista.map { if (it.celularId == celularId) it.copy(cantidad = cantidad.coerceAtMost(MAX)) else it }
    }

    suspend fun vaciar() = modificar { emptyList() }

    private suspend fun modificar(cambio: (List<ItemCarrito>) -> List<ItemCarrito>) {
        context.datosCarrito.edit { p ->
            val actual = p[clave]?.let { runCatching { json.decodeFromString(serializer, it) }.getOrNull() }.orEmpty()
            p[clave] = json.encodeToString(serializer, cambio(actual))
        }
    }

    companion object {
        /** Mismo tope que la API por línea. */
        const val MAX = 10
    }
}
