package com.iwantmyphone.app.ui.carrito

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.iwantmyphone.app.AppContainer
import com.iwantmyphone.app.data.cart.CartStore
import com.iwantmyphone.app.data.cart.ItemCarrito
import com.iwantmyphone.app.ui.components.BarraSuperior
import com.iwantmyphone.app.ui.components.Boton
import com.iwantmyphone.app.ui.components.EstadoMensaje
import com.iwantmyphone.app.ui.components.EstiloBoton
import com.iwantmyphone.app.ui.components.Etiqueta
import com.iwantmyphone.app.ui.components.FilaDato
import com.iwantmyphone.app.ui.components.Filete
import com.iwantmyphone.app.ui.components.Gutter
import com.iwantmyphone.app.ui.components.ImagenProducto
import com.iwantmyphone.app.ui.precio
import com.iwantmyphone.app.ui.theme.EstiloLabel
import com.iwantmyphone.app.ui.theme.Iwmp
import kotlinx.coroutines.launch

data class Totales(val subtotal: Double, val descuento: Double, val total: Double, val unidades: Int)

fun totales(items: List<ItemCarrito>): Totales {
    val sub = items.sumOf { it.precio * it.cantidad }
    val total = items.sumOf { it.precioFinal * it.cantidad }
    return Totales(sub, sub - total, total, items.sumOf { it.cantidad })
}

/** Carrito (Excel, fila 9): cantidades +/−; a 0 la línea desaparece. "Continuar" va a la pasarela. */
@Composable
fun CarritoScreen(container: AppContainer, onProducto: (String) -> Unit, onContinuar: () -> Unit, onCatalogo: () -> Unit) {
    val items by container.carrito.items.collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()

    Column(Modifier.fillMaxSize().background(Iwmp.Paper)) {
        BarraSuperior("Carrito", onAtras = null)
        if (items.isEmpty()) {
            EstadoMensaje("Tu carrito está vacío", detalle = "Explora el catálogo y añade el iPhone que quieres.", accion = "Ver catálogo", onAccion = onCatalogo)
            return@Column
        }
        LazyColumn(Modifier.weight(1f)) {
            items(items, key = { it.celularId }) { item ->
                LineaCarrito(
                    item,
                    onProducto = { onProducto(item.celularId) },
                    onCantidad = { n -> scope.launch { container.carrito.cambiarCantidad(item.celularId, n) } },
                )
            }
        }
        val t = totales(items)
        Column(Modifier.fillMaxWidth().background(Iwmp.Paper)) {
            Filete()
            Column(Modifier.padding(horizontal = Gutter, vertical = 12.dp)) {
                FilaDato("Subtotal", precio(t.subtotal))
                if (t.descuento > 0) FilaDato("Descuentos", "-${precio(t.descuento)}")
                FilaDato("Total estimado", precio(t.total), destacado = true)
                Spacer(Modifier.height(16.dp))
                Boton("Continuar", onContinuar, Modifier.fillMaxWidth(), estilo = EstiloBoton.Solido)
            }
        }
    }
}

@Composable
private fun LineaCarrito(item: ItemCarrito, onProducto: () -> Unit, onCantidad: (Int) -> Unit) {
    Column {
        Row(Modifier.fillMaxWidth().padding(horizontal = Gutter, vertical = 16.dp), verticalAlignment = Alignment.CenterVertically) {
            ImagenProducto(item.imagen, item.nombre, Modifier.size(76.dp).background(Iwmp.Surface).clickable(onClick = onProducto).padding(8.dp))
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f)) {
                Text(item.nombre, style = MaterialTheme.typography.titleSmall, modifier = Modifier.clickable(onClick = onProducto))
                Spacer(Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(precio(item.precioFinal), style = MaterialTheme.typography.bodyMedium.copy(color = Iwmp.Ink))
                    if (item.precioFinal < item.precio) {
                        Text(precio(item.precio), style = MaterialTheme.typography.bodySmall.copy(textDecoration = TextDecoration.LineThrough), color = Iwmp.Muted)
                    }
                }
                Spacer(Modifier.height(10.dp))
                Paso(item.cantidad, onCantidad)
            }
            Text(precio(item.precioFinal * item.cantidad), style = MaterialTheme.typography.titleSmall)
        }
        Filete(Modifier.padding(horizontal = Gutter))
    }
}

/** Selector de cantidad −/+ cuadrado, con borde de 1 dp. */
@Composable
fun Paso(cantidad: Int, onCantidad: (Int) -> Unit) {
    Row(Modifier.border(1.dp, Iwmp.Line), verticalAlignment = Alignment.CenterVertically) {
        BotonPaso("−", "Quitar uno") { onCantidad(cantidad - 1) }
        Text("$cantidad", style = EstiloLabel, color = Iwmp.Ink, textAlign = TextAlign.Center, modifier = Modifier.width(32.dp))
        BotonPaso("+", "Añadir uno", enabled = cantidad < CartStore.MAX) { onCantidad(cantidad + 1) }
    }
}

@Composable
private fun BotonPaso(texto: String, descripcion: String, enabled: Boolean = true, onClick: () -> Unit) {
    Box(
        Modifier.size(36.dp).clickable(enabled = enabled, role = Role.Button, onClickLabel = descripcion, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Etiqueta(texto, color = if (enabled) Iwmp.Ink else Iwmp.Line)
    }
}
