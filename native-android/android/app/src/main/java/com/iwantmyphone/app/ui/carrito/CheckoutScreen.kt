package com.iwantmyphone.app.ui.carrito

import android.content.Context
import androidx.browser.customtabs.CustomTabColorSchemeParams
import androidx.browser.customtabs.CustomTabsIntent
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.iwantmyphone.app.AppContainer
import com.iwantmyphone.app.data.api.Direccion
import com.iwantmyphone.app.data.api.DireccionReq
import com.iwantmyphone.app.data.api.ItemPedidoReq
import com.iwantmyphone.app.data.api.MetodoPago
import com.iwantmyphone.app.data.api.Pedido
import com.iwantmyphone.app.data.api.PedidoReq
import com.iwantmyphone.app.data.api.llamar
import com.iwantmyphone.app.data.cart.ItemCarrito
import com.iwantmyphone.app.ui.campos
import com.iwantmyphone.app.ui.components.Aviso
import com.iwantmyphone.app.ui.components.BarraSuperior
import com.iwantmyphone.app.ui.components.Boton
import com.iwantmyphone.app.ui.components.Campo
import com.iwantmyphone.app.ui.components.EnlaceTexto
import com.iwantmyphone.app.ui.components.EstadoCarga
import com.iwantmyphone.app.ui.components.EstiloBoton
import com.iwantmyphone.app.ui.components.Etiqueta
import com.iwantmyphone.app.ui.components.FilaDato
import com.iwantmyphone.app.ui.components.Gutter
import com.iwantmyphone.app.ui.components.ImagenProducto
import com.iwantmyphone.app.ui.mensaje
import com.iwantmyphone.app.ui.precio
import com.iwantmyphone.app.ui.theme.Iwmp
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class FormDireccion(
    val alias: String = "Casa",
    val direccion: String = "",
    val ciudad: String = "",
    val departamento: String = "",
    val indicaciones: String = "",
    val telefono: String = "",
)

data class EstadoCheckout(
    val cargando: Boolean = true,
    val direcciones: List<Direccion> = emptyList(),
    val metodos: List<MetodoPago> = emptyList(),
    val direccionId: String? = null,
    val metodoId: String? = null,
    val nuevaDireccion: FormDireccion? = null,
    val camposDireccion: Map<String, String> = emptyMap(),
    val guardandoDireccion: Boolean = false,
    val enviando: Boolean = false,
    val error: String? = null,
    val creado: Pedido? = null,
)

class CheckoutViewModel(private val c: AppContainer) : ViewModel() {
    private val _e = MutableStateFlow(EstadoCheckout())
    val estado = _e.asStateFlow()

    init { cargar() }

    fun cargar() = viewModelScope.launch {
        _e.update { it.copy(cargando = true, error = null) }
        runCatching {
            val dirs = llamar(c.json) { c.api.direcciones() }
            val metodos = llamar(c.json) { c.api.metodosPago() }
            dirs to metodos
        }.onSuccess { (dirs, metodos) ->
            _e.update {
                it.copy(
                    cargando = false, direcciones = dirs, metodos = metodos,
                    direccionId = it.direccionId ?: dirs.firstOrNull()?.id,
                    metodoId = it.metodoId ?: metodos.firstOrNull()?.id,
                    // Sin direcciones guardadas, el formulario nace abierto.
                    nuevaDireccion = if (dirs.isEmpty()) FormDireccion(telefono = c.sesionStore.actual?.usuario?.telefono.orEmpty()) else null,
                )
            }
        }.onFailure { err -> _e.update { it.copy(cargando = false, error = err.mensaje()) } }
    }

    fun elegirDireccion(id: String) = _e.update { it.copy(direccionId = id) }
    fun elegirMetodo(id: String) = _e.update { it.copy(metodoId = id) }
    fun abrirNuevaDireccion() = _e.update { it.copy(nuevaDireccion = FormDireccion(telefono = c.sesionStore.actual?.usuario?.telefono.orEmpty())) }
    fun cancelarNuevaDireccion() = _e.update { it.copy(nuevaDireccion = null, camposDireccion = emptyMap()) }
    fun editarDireccion(f: FormDireccion) = _e.update { it.copy(nuevaDireccion = f) }

    fun guardarDireccion() = viewModelScope.launch {
        val f = _e.value.nuevaDireccion ?: return@launch
        _e.update { it.copy(guardandoDireccion = true, camposDireccion = emptyMap()) }
        runCatching {
            llamar(c.json) { c.api.crearDireccion(DireccionReq(f.alias, f.direccion, f.ciudad, f.departamento, f.indicaciones.ifBlank { null }, f.telefono)) }
        }.onSuccess { d ->
            _e.update { it.copy(guardandoDireccion = false, direcciones = listOf(d) + it.direcciones, direccionId = d.id, nuevaDireccion = null) }
        }.onFailure { err -> _e.update { it.copy(guardandoDireccion = false, camposDireccion = err.campos(), error = if (err.campos().isEmpty()) err.mensaje() else null) } }
    }

    fun pagar(items: List<ItemCarrito>) = viewModelScope.launch {
        val e = _e.value
        if (e.direccionId == null) return@launch _e.update { it.copy(error = "Añade una dirección de entrega.") }
        if (e.metodoId == null) return@launch _e.update { it.copy(error = "Elige un medio de pago.") }
        _e.update { it.copy(enviando = true, error = null) }
        runCatching {
            llamar(c.json) { c.api.crearPedido(PedidoReq(items.map { ItemPedidoReq(it.celularId, it.cantidad) }, e.direccionId, e.metodoId)) }
        }.onSuccess { pedido ->
            c.carrito.vaciar()
            _e.update { it.copy(enviando = false, creado = pedido) }
        }.onFailure { err -> _e.update { it.copy(enviando = false, error = err.mensaje()) } }
    }
}

/** Abre el checkout de ePayco en una Custom Tab con la paleta de la app. */
fun abrirCheckout(context: Context, url: String) {
    CustomTabsIntent.Builder()
        .setDefaultColorSchemeParams(CustomTabColorSchemeParams.Builder().setToolbarColor(Iwmp.Paper.toArgb()).build())
        .setShowTitle(true)
        .build()
        .launchUrl(context, url.toUri())
}

/**
 * Pasarela (Excel, fila 10). La sesión la garantiza la navegación: sin sesión
 * se pasa por el login y se vuelve aquí. Muestra productos, comprador,
 * dirección, medio de pago y resumen, y termina con "Pagar y finalizar".
 */
@Composable
fun CheckoutScreen(container: AppContainer, onAtras: () -> Unit, onPedidoCreado: (String) -> Unit) {
    val vm: CheckoutViewModel = viewModel { CheckoutViewModel(container) }
    val e by vm.estado.collectAsState()
    val items by container.carrito.items.collectAsState(initial = emptyList())
    val usuario by container.sesionStore.sesion.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(e.creado) {
        val p = e.creado ?: return@LaunchedEffect
        p.pagos.firstOrNull()?.checkoutUrl?.let { abrirCheckout(context, it) }
        onPedidoCreado(p.id)
    }

    Column(Modifier.fillMaxSize().background(Iwmp.Paper)) {
        BarraSuperior("Pasarela de pago", onAtras)
        if (e.cargando) return@Column EstadoCarga()

        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = Gutter, vertical = 16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Tarjeta("Productos · ${items.sumOf { it.cantidad }}") {
                items.forEach { item ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                        ImagenProducto(item.imagen, item.nombre, Modifier.size(44.dp).background(Iwmp.Surface).padding(4.dp))
                        Spacer(Modifier.width(12.dp))
                        Text("${item.nombre} × ${item.cantidad}", style = MaterialTheme.typography.bodyMedium.copy(color = Iwmp.Ink), modifier = Modifier.weight(1f))
                        Text(precio(item.precioFinal * item.cantidad), style = MaterialTheme.typography.bodyMedium.copy(color = Iwmp.Ink))
                    }
                }
            }

            usuario?.usuario?.let { u ->
                Tarjeta("Comprador") {
                    Text(u.nombre, style = MaterialTheme.typography.titleMedium)
                    Text(u.email, style = MaterialTheme.typography.bodyMedium)
                    u.documento?.let { Text("Documento $it", style = MaterialTheme.typography.bodyMedium) }
                }
            }

            Tarjeta("Dirección de entrega") {
                e.direcciones.forEach { d ->
                    Opcion(seleccionada = d.id == e.direccionId, onClick = { vm.elegirDireccion(d.id) }) {
                        Text(d.alias, style = MaterialTheme.typography.titleSmall)
                        Text("${d.direccion}, ${d.ciudad} (${d.departamento})", style = MaterialTheme.typography.bodySmall)
                    }
                }
                val form = e.nuevaDireccion
                if (form == null) {
                    EnlaceTexto("+ Añadir dirección", vm::abrirNuevaDireccion)
                } else {
                    FormularioDireccion(form, e.camposDireccion, e.guardandoDireccion, vm::editarDireccion, vm::guardarDireccion,
                        onCancelar = if (e.direcciones.isNotEmpty()) vm::cancelarNuevaDireccion else null)
                }
            }

            Tarjeta("Medio de pago") {
                e.metodos.forEach { m ->
                    Opcion(seleccionada = m.id == e.metodoId, onClick = { vm.elegirMetodo(m.id) }) {
                        Text(m.nombre, style = MaterialTheme.typography.titleSmall)
                        m.descripcion?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                    }
                }
            }

            val t = totales(items)
            Tarjeta("Resumen de compra") {
                FilaDato("Subtotal", precio(t.subtotal))
                FilaDato("Descuentos", if (t.descuento > 0) "-${precio(t.descuento)}" else precio(0.0))
                FilaDato("Total", precio(t.total), destacado = true)
                Spacer(Modifier.height(4.dp))
                Etiqueta("El total final lo confirma el servidor al pagar")
            }
            e.error?.let { Aviso(it) }
        }
        Box(Modifier.fillMaxWidth().padding(Gutter)) {
            Boton(
                "Pagar y finalizar", { vm.pagar(items) }, Modifier.fillMaxWidth(), estilo = EstiloBoton.Solido,
                enabled = items.isNotEmpty() && e.direccionId != null && e.metodoId != null && e.nuevaDireccion == null,
                cargando = e.enviando,
            )
        }
    }
}

@Composable
fun Tarjeta(titulo: String, contenido: @Composable () -> Unit) {
    Column(Modifier.fillMaxWidth().border(1.dp, Iwmp.Line).padding(16.dp)) {
        Etiqueta(titulo, color = Iwmp.Ink)
        Spacer(Modifier.height(12.dp))
        contenido()
    }
}

/** Opción de radio cuadrada (las casillas del sistema no tienen esquinas rectas). */
@Composable
private fun Opcion(seleccionada: Boolean, onClick: () -> Unit, contenido: @Composable () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .border(1.dp, if (seleccionada) Iwmp.Ink else Iwmp.Line)
            .clickable(role = Role.RadioButton, onClick = onClick)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(14.dp).border(1.dp, Iwmp.Ink).padding(3.dp)) {
            if (seleccionada) Box(Modifier.fillMaxSize().background(Iwmp.Ink))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) { contenido() }
    }
}

@Composable
fun FormularioDireccion(
    f: FormDireccion,
    errores: Map<String, String>,
    guardando: Boolean,
    onCambio: (FormDireccion) -> Unit,
    onGuardar: () -> Unit,
    onCancelar: (() -> Unit)?,
) {
    Column(Modifier.fillMaxWidth().padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Campo(f.alias, { onCambio(f.copy(alias = it)) }, "Alias", error = errores["alias"], placeholder = "Casa, Oficina…")
        Campo(f.direccion, { onCambio(f.copy(direccion = it)) }, "Dirección", error = errores["direccion"], placeholder = "Calle 10 # 43-12, apto 301")
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Campo(f.ciudad, { onCambio(f.copy(ciudad = it)) }, "Ciudad", Modifier.weight(1f), error = errores["ciudad"])
            Campo(f.departamento, { onCambio(f.copy(departamento = it)) }, "Departamento", Modifier.weight(1f), error = errores["departamento"])
        }
        Campo(f.telefono, { onCambio(f.copy(telefono = it)) }, "Teléfono de contacto", error = errores["telefono"], teclado = KeyboardType.Phone)
        Campo(f.indicaciones, { onCambio(f.copy(indicaciones = it)) }, "Indicaciones (opcional)", error = errores["indicaciones"])
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Boton("Guardar dirección", onGuardar, cargando = guardando)
            if (onCancelar != null) EnlaceTexto("Cancelar", onCancelar, color = Iwmp.Muted)
        }
    }
}
