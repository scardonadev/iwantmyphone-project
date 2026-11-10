package com.iwantmyphone.app.ui.perfil

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.LifecycleResumeEffect
import com.iwantmyphone.app.AppContainer
import com.iwantmyphone.app.data.api.Celular
import com.iwantmyphone.app.data.api.Direccion
import com.iwantmyphone.app.data.api.DireccionReq
import com.iwantmyphone.app.data.api.MiPedido
import com.iwantmyphone.app.data.api.Pedido
import com.iwantmyphone.app.data.api.llamar
import com.iwantmyphone.app.data.api.llamarPagina
import com.iwantmyphone.app.data.session.SesionLocal
import com.iwantmyphone.app.ui.Carga
import com.iwantmyphone.app.ui.NOMBRE_ESTADO_PAGO
import com.iwantmyphone.app.ui.NOMBRE_ESTADO_PEDIDO
import com.iwantmyphone.app.ui.anio
import com.iwantmyphone.app.ui.campos
import com.iwantmyphone.app.ui.carrito.FormDireccion
import com.iwantmyphone.app.ui.carrito.FormularioDireccion
import com.iwantmyphone.app.ui.carrito.Tarjeta
import com.iwantmyphone.app.ui.carrito.abrirCheckout
import com.iwantmyphone.app.ui.components.Aviso
import com.iwantmyphone.app.ui.components.Avatar
import com.iwantmyphone.app.ui.components.BarraSuperior
import com.iwantmyphone.app.ui.components.Boton
import com.iwantmyphone.app.ui.components.DialogoConfirmar
import com.iwantmyphone.app.ui.components.EstadoCarga
import com.iwantmyphone.app.ui.components.EstadoError
import com.iwantmyphone.app.ui.components.EstadoMensaje
import com.iwantmyphone.app.ui.components.EstiloBoton
import com.iwantmyphone.app.ui.components.Etiqueta
import com.iwantmyphone.app.ui.components.FichaProducto
import com.iwantmyphone.app.ui.components.FilaDato
import com.iwantmyphone.app.ui.components.Filete
import com.iwantmyphone.app.ui.components.Gutter
import com.iwantmyphone.app.ui.components.ImagenProducto
import com.iwantmyphone.app.ui.fechaCorta
import com.iwantmyphone.app.ui.fechaHora
import com.iwantmyphone.app.ui.iniciales
import com.iwantmyphone.app.ui.mensaje
import com.iwantmyphone.app.ui.precio
import com.iwantmyphone.app.ui.theme.Iwmp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// ================================================================ Más

/** Destinos del menú "Más" (los de administración dependen de los permisos). */
enum class DestinoMas { MisCompras, Favoritos, Direcciones, GestionPedidos, GestionProductos, Reporte, Usuarios }

/**
 * Vista "Más" (Excel, filas 11 y 12): cabecera con nombre y rol, y un menú
 * que crece con los permisos. La API vuelve a comprobarlos en cada petición:
 * aquí solo deciden qué se enseña.
 */
@Composable
fun MasScreen(container: AppContainer, onDestino: (DestinoMas) -> Unit, onSesionCerrada: () -> Unit) {
    val sesion by container.sesionStore.sesion.collectAsState()
    val scope = rememberCoroutineScope()
    val s: SesionLocal = sesion ?: return

    LaunchedEffect(Unit) { container.cuenta.refrescarUsuario() }

    Column(Modifier.fillMaxSize().background(Iwmp.Paper).verticalScroll(rememberScrollState())) {
        Row(Modifier.fillMaxWidth().padding(Gutter), verticalAlignment = Alignment.CenterVertically) {
            Avatar(iniciales(s.usuario.nombre), tam = 56.dp)
            Spacer(Modifier.width(16.dp))
            Column {
                Text(s.usuario.nombre, style = MaterialTheme.typography.headlineSmall)
                Spacer(Modifier.height(4.dp))
                Etiqueta(s.usuario.rolNombre, color = Iwmp.Accent)
                Text(s.usuario.email, style = MaterialTheme.typography.bodySmall)
            }
        }
        Filete()
        Seccion("Mi cuenta")
        Item("Mis compras") { onDestino(DestinoMas.MisCompras) }
        Item("Favoritos") { onDestino(DestinoMas.Favoritos) }
        Item("Mis direcciones") { onDestino(DestinoMas.Direcciones) }

        val admin = listOfNotNull(
            ("Gestión de pedidos" to DestinoMas.GestionPedidos).takeIf { s.puede("pedidos:gestionar") },
            ("Gestión de productos" to DestinoMas.GestionProductos).takeIf { s.puede("productos:gestionar") },
            ("Reporte de ventas" to DestinoMas.Reporte).takeIf { s.puede("reportes:ver") },
            ("Usuarios y permisos" to DestinoMas.Usuarios).takeIf { s.puede("usuarios:gestionar") },
        )
        if (admin.isNotEmpty()) {
            Seccion("Administración")
            admin.forEach { (titulo, destino) -> Item(titulo) { onDestino(destino) } }
        }
        Spacer(Modifier.height(32.dp))
        Boton("Cerrar sesión", { scope.launch { container.cuenta.cerrarSesion(); onSesionCerrada() } }, Modifier.fillMaxWidth().padding(horizontal = Gutter))
        Spacer(Modifier.height(32.dp))
    }
}

@Composable
private fun Seccion(titulo: String) {
    Etiqueta(titulo, Modifier.padding(start = Gutter, end = Gutter, top = 28.dp, bottom = 8.dp))
}

@Composable
private fun Item(titulo: String, onClick: () -> Unit) {
    Column(Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(Modifier.fillMaxWidth().padding(horizontal = Gutter, vertical = 18.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(titulo, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
            Etiqueta("→", color = Iwmp.Ink)
        }
        Filete(Modifier.padding(horizontal = Gutter))
    }
}

// ================================================================ Mis compras

@Composable
fun MisPedidosScreen(container: AppContainer, onAtras: () -> Unit, onPedido: (String) -> Unit) {
    var estado by remember { mutableStateOf<Carga<List<MiPedido>>>(Carga.Cargando) }
    var intento by remember { mutableStateOf(0) }
    LaunchedEffect(intento) {
        estado = Carga.Cargando
        estado = runCatching { llamarPagina(container.json) { container.api.misPedidos(1, 50) }.items }
            .fold({ Carga.Listo(it) }, { Carga.Error(it.mensaje()) })
    }
    Column(Modifier.fillMaxSize().background(Iwmp.Paper)) {
        BarraSuperior("Mis compras", onAtras)
        when (val e = estado) {
            Carga.Cargando -> EstadoCarga()
            is Carga.Error -> EstadoError(e.mensaje, { intento++ })
            is Carga.Listo -> if (e.datos.isEmpty()) {
                EstadoMensaje("Aún no tienes compras", detalle = "Tus pedidos aparecerán aquí.")
            } else LazyColumn {
                items(e.datos, key = { it.id }) { p ->
                    Column(Modifier.fillMaxWidth().clickable { onPedido(p.id) }) {
                        Row(Modifier.fillMaxWidth().padding(horizontal = Gutter, vertical = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                            ImagenProducto(p.imagenes.firstOrNull(), "Pedido ${p.numero}", Modifier.size(56.dp).background(Iwmp.Surface).padding(6.dp))
                            Spacer(Modifier.width(14.dp))
                            Column(Modifier.weight(1f)) {
                                Etiqueta("Pedido #${p.numero} · ${fechaCorta(p.fecha)}")
                                Text("${p.numProductos} producto${if (p.numProductos == 1) "" else "s"} · ${p.metodoNombre}", style = MaterialTheme.typography.bodyMedium)
                                Etiqueta(NOMBRE_ESTADO_PEDIDO[p.estado] ?: p.estado, color = Iwmp.Ink)
                            }
                            Text(precio(p.total), style = MaterialTheme.typography.titleSmall)
                        }
                        Filete(Modifier.padding(horizontal = Gutter))
                    }
                }
            }
        }
    }
}

/**
 * Detalle de una compra propia. Si el pago de la pasarela sigue pendiente,
 * se consulta cada 3 s (la confirmación de ePayco llega a la API, no a la
 * app) y al volver de la Custom Tab.
 */
@Composable
fun MiPedidoScreen(container: AppContainer, id: String, nuevo: Boolean, onAtras: () -> Unit) {
    var estado by remember { mutableStateOf<Carga<Pedido>>(Carga.Cargando) }
    var aviso by remember { mutableStateOf<String?>(null) }
    var reintentando by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    suspend fun cargar() {
        runCatching { llamar(container.json) { container.api.miPedido(id) } }
            .onSuccess { estado = Carga.Listo(it) }
            .onFailure { if (estado !is Carga.Listo) estado = Carga.Error(it.mensaje()) }
    }

    LifecycleResumeEffect(id) {
        scope.launch { cargar() }
        onPauseOrDispose { }
    }
    val pendiente = (estado as? Carga.Listo)?.datos?.let { p -> p.metodoPago.requierePasarela && p.pagadoAt == null && p.pagos.firstOrNull()?.estado == "pendiente" } == true
    LaunchedEffect(pendiente) {
        var vueltas = 0
        while (pendiente && vueltas++ < 60) {
            delay(3_000)
            cargar()
        }
    }

    Column(Modifier.fillMaxSize().background(Iwmp.Paper)) {
        BarraSuperior(if (nuevo) "Pedido recibido" else "Mi compra", onAtras)
        when (val e = estado) {
            Carga.Cargando -> EstadoCarga()
            is Carga.Error -> EstadoError(e.mensaje, { scope.launch { cargar() } })
            is Carga.Listo -> {
                val p = e.datos
                val pago = p.pagos.firstOrNull()
                Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(Gutter), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    if (nuevo) {
                        Text(
                            when {
                                !p.metodoPago.requierePasarela -> "¡Gracias! Pagarás al recibir tu pedido."
                                p.pagadoAt != null -> "¡Pago aprobado! Ya estamos preparando tu pedido."
                                else -> "Completa el pago en ePayco. Esta pantalla se actualiza sola."
                            },
                            style = MaterialTheme.typography.headlineSmall,
                        )
                    }
                    ResumenPedido(p)
                    if (pago != null) {
                        Tarjeta("Pago") {
                            Etiqueta(NOMBRE_ESTADO_PAGO[pago.estado] ?: pago.estado, color = if (pago.estado == "aprobado") Iwmp.Ink else Iwmp.Accent)
                            pago.medio?.let { Text("Medio: $it", style = MaterialTheme.typography.bodySmall) }
                            Text("Referencia ${pago.referencia}", style = MaterialTheme.typography.bodySmall)
                            Spacer(Modifier.height(8.dp))
                            if (pago.estado == "pendiente" && pago.checkoutUrl != null) {
                                Boton("Ir a pagar", { abrirCheckout(context, pago.checkoutUrl) }, Modifier.fillMaxWidth(), estilo = EstiloBoton.Acento)
                            }
                            if (pago.estado in listOf("rechazado", "fallido") && p.pagadoAt == null && p.estado != "cancelado") {
                                Boton("Reintentar el pago", {
                                    scope.launch {
                                        reintentando = true
                                        runCatching { llamar(container.json) { container.api.reintentarPago(id) } }
                                            .onSuccess { nuevoP -> estado = Carga.Listo(nuevoP); nuevoP.pagos.firstOrNull()?.checkoutUrl?.let { abrirCheckout(context, it) } }
                                            .onFailure { aviso = it.mensaje() }
                                        reintentando = false
                                    }
                                }, Modifier.fillMaxWidth(), estilo = EstiloBoton.Acento, cargando = reintentando)
                            }
                        }
                    }
                    aviso?.let { Aviso(it) }
                }
            }
        }
    }
}

/** Bloques comunes del detalle de un pedido (comprador y gestión). */
@Composable
fun ResumenPedido(p: Pedido) {
    Tarjeta("Pedido #${p.numero}") {
        FilaDato("Fecha", fechaHora(p.fecha))
        FilaDato("Estado", NOMBRE_ESTADO_PEDIDO[p.estado] ?: p.estado)
        FilaDato("Medio de pago", p.metodoPago.nombre)
        p.pagadoAt?.let { FilaDato("Pagado", fechaHora(it)) }
    }
    Tarjeta("Productos · ${p.numProductos}") {
        p.items.forEach { i ->
            Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                ImagenProducto(i.imagenUrl, i.modelo, Modifier.size(44.dp).background(Iwmp.Surface).padding(4.dp))
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text("${i.modelo} × ${i.cantidad}", style = MaterialTheme.typography.bodyMedium.copy(color = Iwmp.Ink))
                    i.utilidad?.let { Etiqueta("Costo ${precio(i.costoUnitario ?: 0.0)} · utilidad ${precio(it)}") }
                }
                Text(precio(i.total), style = MaterialTheme.typography.bodyMedium.copy(color = Iwmp.Ink))
            }
        }
    }
    Tarjeta("Entrega") {
        Text(p.cliente.nombre, style = MaterialTheme.typography.titleSmall)
        Text("${p.entrega.direccion}, ${p.entrega.ciudad} (${p.entrega.departamento})", style = MaterialTheme.typography.bodyMedium)
        p.entrega.indicaciones?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
        Text("Tel. ${p.cliente.telefono} · ${p.cliente.email}", style = MaterialTheme.typography.bodySmall)
    }
    Tarjeta("Resumen") {
        FilaDato("Subtotal", precio(p.subtotal))
        FilaDato("Descuentos", "-${precio(p.descuento)}")
        FilaDato("Total", precio(p.total), destacado = true)
        p.costoTotal?.let { FilaDato("Costo", precio(it)) }
        p.utilidad?.let { FilaDato("Utilidad", precio(it), destacado = true) }
    }
}

// ================================================================ Favoritos

@Composable
fun FavoritosScreen(container: AppContainer, onAtras: () -> Unit, onProducto: (String) -> Unit) {
    var estado by remember { mutableStateOf<Carga<List<Celular>>>(Carga.Cargando) }
    val scope = rememberCoroutineScope()
    suspend fun cargar() {
        estado = runCatching { llamar(container.json) { container.api.favoritos() } }.fold({ Carga.Listo(it) }, { Carga.Error(it.mensaje()) })
    }
    LifecycleResumeEffect(Unit) {
        scope.launch { cargar() }
        onPauseOrDispose { }
    }
    Column(Modifier.fillMaxSize().background(Iwmp.Paper)) {
        BarraSuperior("Favoritos", onAtras)
        when (val e = estado) {
            Carga.Cargando -> EstadoCarga()
            is Carga.Error -> EstadoError(e.mensaje, { scope.launch { cargar() } })
            is Carga.Listo -> if (e.datos.isEmpty()) {
                EstadoMensaje("Sin favoritos", detalle = "Toca el corazón en un producto para guardarlo aquí.")
            } else LazyVerticalGrid(
                GridCells.Fixed(2), contentPadding = PaddingValues(Gutter),
                horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(e.datos, key = { it.id }) { c ->
                    FichaProducto(c.nombre, c.imagesUrl.firstOrNull(), c.precio, c.precioFinal, c.descuentoPct, anio(c.fechaLanzamiento), { onProducto(c.id) })
                }
            }
        }
    }
}

// ================================================================ Direcciones

@Composable
fun DireccionesScreen(container: AppContainer, onAtras: () -> Unit) {
    var estado by remember { mutableStateOf<Carga<List<Direccion>>>(Carga.Cargando) }
    var form by remember { mutableStateOf<FormDireccion?>(null) }
    var errores by remember { mutableStateOf(emptyMap<String, String>()) }
    var guardando by remember { mutableStateOf(false) }
    var borrar by remember { mutableStateOf<Direccion?>(null) }
    var aviso by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val c = container

    suspend fun cargar() {
        estado = runCatching { llamar(c.json) { c.api.direcciones() } }.fold({ Carga.Listo(it) }, { Carga.Error(it.mensaje()) })
    }
    LaunchedEffect(Unit) { cargar() }

    Column(Modifier.fillMaxSize().background(Iwmp.Paper)) {
        BarraSuperior("Mis direcciones", onAtras)
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(Gutter), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            when (val e = estado) {
                Carga.Cargando -> EstadoCarga()
                is Carga.Error -> EstadoError(e.mensaje, { scope.launch { cargar() } })
                is Carga.Listo -> {
                    if (e.datos.isEmpty() && form == null) EstadoMensaje("Sin direcciones", detalle = "Añade una para tus compras.")
                    e.datos.forEach { d ->
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Etiqueta(d.alias, color = Iwmp.Ink)
                                Text("${d.direccion}, ${d.ciudad} (${d.departamento})", style = MaterialTheme.typography.bodyMedium)
                                Text("Tel. ${d.telefono}", style = MaterialTheme.typography.bodySmall)
                            }
                            IconButton(onClick = { borrar = d }) { Icon(Icons.Filled.Delete, contentDescription = "Eliminar ${d.alias}", tint = Iwmp.Ink) }
                        }
                        Filete()
                    }
                }
            }
            val f = form
            if (f == null) {
                Boton("Añadir dirección", { form = FormDireccion(telefono = c.sesionStore.actual?.usuario?.telefono.orEmpty()) }, Modifier.fillMaxWidth())
            } else {
                FormularioDireccion(f, errores, guardando, { form = it }, onGuardar = {
                    scope.launch {
                        guardando = true; errores = emptyMap()
                        runCatching { llamar(c.json) { c.api.crearDireccion(DireccionReq(f.alias, f.direccion, f.ciudad, f.departamento, f.indicaciones.ifBlank { null }, f.telefono)) } }
                            .onSuccess { form = null; cargar() }
                            .onFailure { errores = it.campos(); if (errores.isEmpty()) aviso = it.mensaje() }
                        guardando = false
                    }
                }, onCancelar = { form = null; errores = emptyMap() })
            }
            aviso?.let { Aviso(it) }
        }
    }

    borrar?.let { d ->
        DialogoConfirmar("Eliminar dirección", "¿Eliminar \"${d.alias}\"? Tus pedidos anteriores la conservan.", "Eliminar", onConfirmar = {
            borrar = null
            scope.launch {
                runCatching { llamar(c.json) { c.api.eliminarDireccion(d.id) } }.onFailure { aviso = it.mensaje() }
                cargar()
            }
        }, onCancelar = { borrar = null })
    }
}
