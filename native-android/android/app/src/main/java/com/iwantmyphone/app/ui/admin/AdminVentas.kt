package com.iwantmyphone.app.ui.admin

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.iwantmyphone.app.AppContainer
import com.iwantmyphone.app.data.api.EstadoReq
import com.iwantmyphone.app.data.api.Pedido
import com.iwantmyphone.app.data.api.PedidoGestion
import com.iwantmyphone.app.data.api.Reporte
import com.iwantmyphone.app.data.api.llamar
import com.iwantmyphone.app.data.api.llamarPagina
import com.iwantmyphone.app.ui.Carga
import com.iwantmyphone.app.ui.NOMBRE_ESTADO_PEDIDO
import com.iwantmyphone.app.ui.components.Aviso
import com.iwantmyphone.app.ui.components.BarraSuperior
import com.iwantmyphone.app.ui.components.Boton
import com.iwantmyphone.app.ui.components.Campo
import com.iwantmyphone.app.ui.components.DialogoConfirmar
import com.iwantmyphone.app.ui.components.EnlaceTexto
import com.iwantmyphone.app.ui.components.EstadoCarga
import com.iwantmyphone.app.ui.components.EstadoError
import com.iwantmyphone.app.ui.components.EstadoMensaje
import com.iwantmyphone.app.ui.components.EstiloBoton
import com.iwantmyphone.app.ui.components.Etiqueta
import com.iwantmyphone.app.ui.components.Filete
import com.iwantmyphone.app.ui.components.Gutter
import com.iwantmyphone.app.ui.components.ImagenProducto
import com.iwantmyphone.app.ui.components.Selector
import com.iwantmyphone.app.ui.fechaHora
import com.iwantmyphone.app.ui.mensaje
import com.iwantmyphone.app.ui.perfil.ResumenPedido
import com.iwantmyphone.app.ui.precio
import com.iwantmyphone.app.ui.theme.EstiloLabel
import com.iwantmyphone.app.ui.theme.Iwmp
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Chips cuadrados de una sola selección (filtros de estado y periodos). */
@Composable
fun Chips(opciones: List<Pair<String?, String>>, seleccion: String?, onSeleccion: (String?) -> Unit, modifier: Modifier = Modifier) {
    Row(modifier.horizontalScroll(rememberScrollState()).padding(horizontal = Gutter, vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        opciones.forEach { (clave, nombre) ->
            val activo = clave == seleccion
            Text(
                nombre.uppercase(),
                style = EstiloLabel,
                color = if (activo) Iwmp.Paper else Iwmp.Ink,
                modifier = Modifier
                    .border(1.dp, if (activo) Iwmp.Ink else Iwmp.Line)
                    .background(if (activo) Iwmp.Ink else Iwmp.Paper)
                    .clickable { onSeleccion(clave) }
                    .padding(horizontal = 14.dp, vertical = 10.dp),
            )
        }
    }
}

// ================================================================ Lista de pedidos

class AdminPedidosViewModel(private val c: AppContainer) : ViewModel() {
    data class E(
        val estado: String? = null,
        val q: String = "",
        val items: List<PedidoGestion> = emptyList(),
        val pagina: Int = 0,
        val hayMas: Boolean = true,
        val cargando: Boolean = false,
        val error: String? = null,
        val aviso: String? = null,
    )

    private val _e = MutableStateFlow(E())
    val estado = _e.asStateFlow()
    private var trabajo: Job? = null

    fun filtrar(estado: String?) { _e.update { it.copy(estado = estado) }; recargar() }
    fun buscar(q: String) { _e.update { it.copy(q = q) }; recargar(350) }

    fun recargar(espera: Long = 0) {
        trabajo?.cancel()
        trabajo = viewModelScope.launch {
            if (espera > 0) delay(espera)
            _e.update { it.copy(items = emptyList(), pagina = 0, hayMas = true, error = null) }
            pagina()
        }
    }

    fun mas() {
        if (_e.value.cargando || !_e.value.hayMas) return
        trabajo = viewModelScope.launch { pagina() }
    }

    private suspend fun pagina() {
        val e = _e.value
        _e.update { it.copy(cargando = true) }
        runCatching { llamarPagina(c.json) { c.api.pedidos(e.estado, e.q.ifBlank { null }, e.pagina + 1, 25) } }
            .onSuccess { p -> _e.update { it.copy(items = it.items + p.items, pagina = it.pagina + 1, hayMas = p.meta?.hasNextPage == true, cargando = false) } }
            .onFailure { err -> _e.update { it.copy(cargando = false, error = err.mensaje()) } }
    }

    fun eliminar(p: PedidoGestion) = viewModelScope.launch {
        runCatching { llamar(c.json) { c.api.eliminarPedido(p.id) } }
            .onSuccess { _e.update { it.copy(items = it.items.filterNot { x -> x.id == p.id }) } }
            .onFailure { err -> _e.update { it.copy(aviso = err.mensaje()) } }
    }

    fun cerrarAviso() = _e.update { it.copy(aviso = null) }
}

private val FILTROS_ESTADO = listOf<Pair<String?, String>>(null to "Todos") + NOMBRE_ESTADO_PEDIDO.map { (k, v) -> k to v }

/** Gestión de pedidos (Excel, fila 14). La utilidad solo llega para el administrador. */
@Composable
fun AdminPedidosScreen(container: AppContainer, onAtras: () -> Unit, onPedido: (String) -> Unit) {
    val vm: AdminPedidosViewModel = viewModel { AdminPedidosViewModel(container) }
    val e by vm.estado.collectAsState()
    var borrar by remember { mutableStateOf<PedidoGestion?>(null) }
    LifecycleResumeEffect(Unit) { vm.recargar(); onPauseOrDispose { } }

    Column(Modifier.fillMaxSize().background(Iwmp.Paper)) {
        BarraSuperior("Gestión de pedidos", onAtras)
        Campo(e.q, vm::buscar, "Buscar", Modifier.padding(start = Gutter, end = Gutter, top = 12.dp), placeholder = "Nº de pedido, cliente o correo")
        Chips(FILTROS_ESTADO, e.estado, vm::filtrar)
        Filete()
        when {
            e.error != null && e.items.isEmpty() -> EstadoError(e.error!!, { vm.recargar() })
            !e.cargando && e.items.isEmpty() -> EstadoMensaje("Sin pedidos", detalle = "No hay pedidos con este filtro.")
            else -> LazyColumn(Modifier.fillMaxSize()) {
                items(e.items, key = { it.id }) { p ->
                    Column(Modifier.fillMaxWidth().clickable { onPedido(p.id) }) {
                        Row(Modifier.fillMaxWidth().padding(start = Gutter, end = 8.dp, top = 14.dp, bottom = 14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Etiqueta("#${p.numero} · ${fechaHora(p.fecha)}")
                                Text(p.clienteNombre, style = MaterialTheme.typography.titleSmall)
                                Text("${p.metodoPago.nombre} · ${p.numProductos} producto${if (p.numProductos == 1) "" else "s"}", style = MaterialTheme.typography.bodySmall)
                                Etiqueta(NOMBRE_ESTADO_PEDIDO[p.estado] ?: p.estado, color = if (p.estado == "cancelado") Iwmp.Muted else Iwmp.Ink)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(precio(p.total), style = MaterialTheme.typography.titleSmall)
                                p.utilidad?.let { Text("+${precio(it)}", style = MaterialTheme.typography.bodySmall, color = Iwmp.Accent) }
                            }
                            IconButton(onClick = { borrar = p }) { Icon(Icons.Filled.Delete, contentDescription = "Eliminar pedido ${p.numero}", tint = Iwmp.Ink) }
                        }
                        Filete(Modifier.padding(horizontal = Gutter))
                    }
                }
                item {
                    if (e.cargando) EstadoCarga()
                    else if (e.hayMas) EnlaceTexto("Cargar más", vm::mas, Modifier.padding(Gutter))
                }
            }
        }
    }
    borrar?.let { p ->
        DialogoConfirmar("Eliminar pedido", "¿Eliminar el pedido #${p.numero} de ${p.clienteNombre}? Sale también de los reportes de ventas.", "Eliminar",
            onConfirmar = { vm.eliminar(p); borrar = null }, onCancelar = { borrar = null })
    }
    e.aviso?.let { DialogoConfirmar("No se pudo eliminar", it, "Entendido", vm::cerrarAviso, vm::cerrarAviso) }
}

/** Detalle de gestión: todo en lectura; solo el estado se edita (con Editar → Actualizar). */
@Composable
fun AdminPedidoScreen(container: AppContainer, id: String, onAtras: () -> Unit) {
    var estado by remember { mutableStateOf<Carga<Pedido>>(Carga.Cargando) }
    var editando by remember { mutableStateOf(false) }
    var nuevoEstado by remember { mutableStateOf<String?>(null) }
    var guardando by remember { mutableStateOf(false) }
    var aviso by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val c = container

    suspend fun cargar() {
        estado = runCatching { llamar(c.json) { c.api.pedido(id) } }.fold({ Carga.Listo(it) }, { Carga.Error(it.mensaje()) })
    }
    LaunchedEffect(id) { cargar() }

    Column(Modifier.fillMaxSize().background(Iwmp.Paper)) {
        BarraSuperior("Pedido", onAtras)
        when (val e = estado) {
            Carga.Cargando -> EstadoCarga()
            is Carga.Error -> EstadoError(e.mensaje, { scope.launch { cargar() } })
            is Carga.Listo -> Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(Gutter), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                val p = e.datos
                Selector(
                    "Estado del pedido",
                    NOMBRE_ESTADO_PEDIDO.keys.toList(),
                    nuevoEstado ?: p.estado,
                    { NOMBRE_ESTADO_PEDIDO[it] ?: it },
                    { nuevoEstado = it },
                    soloLectura = !editando,
                )
                if (!editando) {
                    Boton("Editar estado", { editando = true; nuevoEstado = p.estado }, Modifier.fillMaxWidth(), estilo = EstiloBoton.Solido)
                } else {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Boton("Cancelar", { editando = false; nuevoEstado = null }, Modifier.weight(1f))
                        Boton("Actualizar", {
                            scope.launch {
                                guardando = true; aviso = null
                                runCatching { llamar(c.json) { c.api.cambiarEstado(id, EstadoReq(nuevoEstado ?: p.estado)) } }
                                    .onSuccess { estado = Carga.Listo(it); editando = false; nuevoEstado = null }
                                    .onFailure { aviso = it.mensaje() }
                                guardando = false
                            }
                        }, Modifier.weight(1f), estilo = EstiloBoton.Solido, cargando = guardando)
                    }
                }
                aviso?.let { Aviso(it) }
                ResumenPedido(p)
                if (p.pagos.isNotEmpty()) {
                    com.iwantmyphone.app.ui.carrito.Tarjeta("Intentos de pago") {
                        p.pagos.forEach { pg ->
                            Text("${pg.estado.uppercase()} · ${precio(pg.monto)} ${pg.moneda}", style = EstiloLabel, color = Iwmp.Ink)
                            Text("${pg.referencia}${pg.medio?.let { " · $it" } ?: ""}", style = MaterialTheme.typography.bodySmall)
                            Spacer(Modifier.height(8.dp))
                        }
                    }
                }
            }
        }
    }
}

// ================================================================ Reporte de ventas

private val PERIODOS = listOf<Pair<String?, String>>("hoy" to "Hoy", "ayer" to "Ayer", "semana" to "Esta semana", "mes" to "Este mes", "anio" to "Este año")
private val MESES = listOf("Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic")

/**
 * Reporte de ventas (Excel, fila 15): gráfico filtrable por hoy, ayer, esta
 * semana, este mes y este año, con unidades y valor. Costo de lo vendido y
 * utilidad neta solo aparecen si la API los manda (administrador).
 */
@Composable
fun ReporteScreen(container: AppContainer, onAtras: () -> Unit) {
    var periodo by remember { mutableStateOf("mes") }
    var estado by remember { mutableStateOf<Carga<Reporte>>(Carga.Cargando) }
    var intento by remember { mutableStateOf(0) }
    LaunchedEffect(periodo, intento) {
        estado = Carga.Cargando
        estado = runCatching { llamar(container.json) { container.api.reporte(periodo) } }.fold({ Carga.Listo(it) }, { Carga.Error(it.mensaje()) })
    }

    Column(Modifier.fillMaxSize().background(Iwmp.Paper)) {
        BarraSuperior("Reporte de ventas", onAtras)
        Chips(PERIODOS, periodo, { periodo = it ?: "mes" })
        Filete()
        when (val e = estado) {
            Carga.Cargando -> EstadoCarga()
            is Carga.Error -> EstadoError(e.mensaje, { intento++ })
            is Carga.Listo -> {
                val r = e.datos
                Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(vertical = 16.dp)) {
                    Indicadores(r)
                    Spacer(Modifier.height(24.dp))
                    Etiqueta("Ventas (${r.moneda})", Modifier.padding(horizontal = Gutter))
                    Spacer(Modifier.height(8.dp))
                    GraficoBarras(r, Modifier.fillMaxWidth().height(200.dp).padding(horizontal = Gutter))
                    Spacer(Modifier.height(24.dp))
                    Etiqueta("Productos más vendidos", Modifier.padding(horizontal = Gutter), color = Iwmp.Ink)
                    Spacer(Modifier.height(8.dp))
                    if (r.topProductos.isEmpty()) {
                        Text("Sin ventas en este periodo.", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(horizontal = Gutter))
                    }
                    r.topProductos.forEachIndexed { i, t ->
                        Row(Modifier.fillMaxWidth().padding(horizontal = Gutter, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                            Etiqueta("%02d".format(i + 1), Modifier.width(28.dp), color = Iwmp.Ink)
                            ImagenProducto(t.imagenUrl, t.modelo, Modifier.size(40.dp).background(Iwmp.Surface).padding(4.dp))
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(t.modelo, style = MaterialTheme.typography.titleSmall)
                                Etiqueta("${t.unidades} unidades")
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(precio(t.ventas), style = MaterialTheme.typography.titleSmall)
                                t.utilidad?.let { Text("+${precio(it)}", style = MaterialTheme.typography.bodySmall, color = Iwmp.Accent) }
                            }
                        }
                        Filete(Modifier.padding(horizontal = Gutter))
                    }
                }
            }
        }
    }
}

@Composable
private fun Indicadores(r: Reporte) {
    val s = r.resumen
    val celdas = buildList {
        add("Ventas" to precio(s.ventas))
        add("Unidades" to s.unidades.toString())
        add("Pedidos" to s.pedidos.toString())
        add("Ticket promedio" to precio(s.ticketPromedio))
        s.costo?.let { add("Costo vendido" to precio(it)) }
        s.utilidad?.let { add("Utilidad neta" to precio(it)) }
    }
    Column(Modifier.padding(horizontal = Gutter), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        celdas.chunked(2).forEach { fila ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                fila.forEach { (titulo, valor) ->
                    Column(Modifier.weight(1f).background(if (titulo == "Utilidad neta") Iwmp.Ink else Iwmp.Surface).padding(14.dp)) {
                        Etiqueta(titulo, color = if (titulo == "Utilidad neta") Iwmp.Paper.copy(alpha = 0.7f) else Iwmp.Muted)
                        Spacer(Modifier.height(6.dp))
                        Text(valor, style = MaterialTheme.typography.titleLarge, color = if (titulo == "Utilidad neta") Iwmp.Paper else Iwmp.Ink)
                    }
                }
                if (fila.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

/**
 * Barras en tinta, sin ejes ni rejilla: solo filete base y el máximo en
 * acento. Etiquetas espaciadas para que no se pisen (24 horas, 31 días).
 */
@Composable
private fun GraficoBarras(r: Reporte, modifier: Modifier) {
    val maximo = r.serie.maxOfOrNull { it.ventas }?.takeIf { it > 0 } ?: 1.0
    val paso = when (r.serie.size) { in 0..12 -> 1; in 13..24 -> 4; else -> 5 }
    val etiqueta = { i: Int ->
        val crudo = r.serie[i].etiqueta
        if (r.periodo == "anio") MESES.getOrNull((crudo.toIntOrNull() ?: 0) - 1) ?: crudo else crudo
    }
    Column(modifier) {
        Canvas(Modifier.fillMaxWidth().weight(1f).semantics { contentDescription = "Gráfico de ventas por ${if (r.periodo == "anio") "mes" else if (r.periodo in listOf("hoy", "ayer")) "hora" else "día"}" }) {
            val n = r.serie.size.coerceAtLeast(1)
            val hueco = size.width / n
            val ancho = hueco * 0.62f
            r.serie.forEachIndexed { i, p ->
                val alto = (p.ventas / maximo).toFloat() * size.height
                drawRect(
                    color = if (p.ventas == maximo && p.ventas > 0) Iwmp.Accent else Iwmp.Ink,
                    topLeft = Offset(i * hueco + (hueco - ancho) / 2, size.height - alto),
                    size = Size(ancho, alto),
                )
            }
            drawLine(Iwmp.Line, Offset(0f, size.height), Offset(size.width, size.height), 1.dp.toPx())
        }
        Row(Modifier.fillMaxWidth().padding(top = 6.dp)) {
            r.serie.indices.forEach { i ->
                Text(
                    if (i % paso == 0) etiqueta(i) else "",
                    style = EstiloLabel.copy(fontSize = EstiloLabel.fontSize * 0.8f),
                    color = Iwmp.Muted,
                    maxLines = 1,
                    softWrap = false,
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}
