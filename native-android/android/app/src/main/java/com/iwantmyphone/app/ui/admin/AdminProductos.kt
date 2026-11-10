package com.iwantmyphone.app.ui.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.iwantmyphone.app.AppContainer
import com.iwantmyphone.app.data.api.Celular
import com.iwantmyphone.app.data.api.CelularReq
import com.iwantmyphone.app.data.api.Marca
import com.iwantmyphone.app.data.api.llamar
import com.iwantmyphone.app.data.api.llamarPagina
import com.iwantmyphone.app.ui.SPEC_FIELDS
import com.iwantmyphone.app.ui.campos
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
import com.iwantmyphone.app.ui.etiquetaSpec
import com.iwantmyphone.app.ui.mensaje
import com.iwantmyphone.app.ui.precio
import com.iwantmyphone.app.ui.theme.Iwmp
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Modo del detalle (Excel, filas 13 y 16): lectura con botón Editar, edición y alta. */
enum class Modo { Ver, Editar, Nuevo }

// ================================================================ Lista

data class EstadoLista<T>(
    val q: String = "",
    val items: List<T> = emptyList(),
    val pagina: Int = 0,
    val hayMas: Boolean = true,
    val cargando: Boolean = false,
    val error: String? = null,
    val aviso: String? = null,
)

class AdminProductosViewModel(private val c: AppContainer) : ViewModel() {
    private val _e = MutableStateFlow(EstadoLista<Celular>())
    val estado = _e.asStateFlow()
    private var trabajo: Job? = null

    fun buscar(q: String) {
        _e.update { it.copy(q = q) }
        recargar(350)
    }

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
        runCatching { llamarPagina(c.json) { c.api.celulares(q = e.q.ifBlank { null }, orden = "recientes", page = e.pagina + 1, limit = 30) } }
            .onSuccess { p -> _e.update { it.copy(items = it.items + p.items, pagina = it.pagina + 1, hayMas = p.meta?.hasNextPage == true, cargando = false) } }
            .onFailure { err -> _e.update { it.copy(cargando = false, error = err.mensaje()) } }
    }

    fun eliminar(cel: Celular) = viewModelScope.launch {
        runCatching { llamar(c.json) { c.api.eliminarCelular(cel.id) } }
            .onSuccess { _e.update { it.copy(items = it.items.filterNot { x -> x.id == cel.id }) } }
            .onFailure { err -> _e.update { it.copy(aviso = err.mensaje()) } }
    }

    fun cerrarAviso() = _e.update { it.copy(aviso = null) }
}

/** Gestión de productos (Excel, fila 13). El costo solo llega si la sesión es de administrador. */
@Composable
fun AdminProductosScreen(container: AppContainer, onAtras: () -> Unit, onProducto: (String?) -> Unit) {
    val vm: AdminProductosViewModel = viewModel { AdminProductosViewModel(container) }
    val e by vm.estado.collectAsState()
    var borrar by remember { mutableStateOf<Celular?>(null) }
    LifecycleResumeEffect(Unit) { vm.recargar(); onPauseOrDispose { } }

    Column(Modifier.fillMaxSize().background(Iwmp.Paper)) {
        BarraSuperior("Gestión de productos", onAtras) {
            IconButton(onClick = { onProducto(null) }) { Icon(Icons.Filled.Add, contentDescription = "Nuevo producto", tint = Iwmp.Ink) }
        }
        Campo(e.q, vm::buscar, "Buscar", Modifier.padding(horizontal = Gutter, vertical = 12.dp), placeholder = "Modelo o marca")
        Filete()
        when {
            e.error != null && e.items.isEmpty() -> EstadoError(e.error!!, { vm.recargar() })
            !e.cargando && e.items.isEmpty() -> EstadoMensaje("Sin productos", accion = "Añadir producto", onAccion = { onProducto(null) })
            else -> LazyColumn(Modifier.fillMaxSize()) {
                items(e.items, key = { it.id }) { cel ->
                    Column(Modifier.fillMaxWidth().clickable { onProducto(cel.id) }) {
                        Row(Modifier.fillMaxWidth().padding(start = Gutter, end = 8.dp, top = 12.dp, bottom = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                            ImagenProducto(cel.imagesUrl.firstOrNull(), cel.nombre, Modifier.size(56.dp).background(Iwmp.Surface).padding(6.dp))
                            Spacer(Modifier.width(14.dp))
                            Column(Modifier.weight(1f)) {
                                Text(cel.modelo, style = MaterialTheme.typography.titleSmall)
                                Etiqueta(cel.marca.nombre)
                                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Text(precio(cel.precioFinal), style = MaterialTheme.typography.bodyMedium.copy(color = Iwmp.Ink))
                                    cel.costo?.let { Text("Costo ${precio(it)}", style = MaterialTheme.typography.bodySmall) }
                                }
                            }
                            IconButton(onClick = { borrar = cel }) { Icon(Icons.Filled.Delete, contentDescription = "Eliminar ${cel.nombre}", tint = Iwmp.Ink) }
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
    borrar?.let { cel ->
        DialogoConfirmar("Eliminar producto", "¿Eliminar ${cel.nombre}? Se borran su ficha y sus valoraciones; los pedidos que lo incluyen se conservan.", "Eliminar",
            onConfirmar = { vm.eliminar(cel); borrar = null }, onCancelar = { borrar = null })
    }
    e.aviso?.let { DialogoConfirmar("No se pudo eliminar", it, "Entendido", vm::cerrarAviso, vm::cerrarAviso) }
}

// ================================================================ Detalle / formulario

data class FormProducto(
    val marcaId: String? = null,
    val modelo: String = "",
    val descripcion: String = "",
    val precio: String = "",
    val costo: String = "",
    val descuento: String = "0",
    val fecha: String = "",
    val imagenes: String = "",
    val specs: Map<String, String> = SPEC_FIELDS.associateWith { "" },
)

private fun Celular.aForm() = FormProducto(
    marcaId = marca.id,
    modelo = modelo,
    descripcion = descripcion.orEmpty(),
    precio = precio.toString(),
    costo = costo?.toString().orEmpty(),
    descuento = descuentoPct.toString(),
    fecha = fechaLanzamiento,
    imagenes = imagesUrl.joinToString("\n"),
    specs = SPEC_FIELDS.associateWith { k -> especificaciones.find { it.key == k }?.value.orEmpty() },
)

data class EstadoProducto(
    val modo: Modo,
    val cargando: Boolean = true,
    val error: String? = null,
    val marcas: List<Marca> = emptyList(),
    val original: Celular? = null,
    val form: FormProducto = FormProducto(),
    val campos: Map<String, String> = emptyMap(),
    val guardando: Boolean = false,
    val aviso: String? = null,
    val creadoId: String? = null,
)

class AdminProductoViewModel(private val c: AppContainer, private val id: String?) : ViewModel() {
    private val _e = MutableStateFlow(EstadoProducto(if (id == null) Modo.Nuevo else Modo.Ver))
    val estado = _e.asStateFlow()
    val verCostos = c.sesionStore.actual?.puede("costos:ver") == true

    init { cargar() }

    fun cargar() = viewModelScope.launch {
        _e.update { it.copy(cargando = true, error = null) }
        runCatching {
            val marcas = llamar(c.json) { c.api.marcas() }
            val cel = id?.let { llamar(c.json) { c.api.celular(it) } }
            marcas to cel
        }.onSuccess { (marcas, cel) ->
            _e.update { it.copy(cargando = false, marcas = marcas, original = cel, form = cel?.aForm() ?: FormProducto(marcaId = marcas.firstOrNull()?.id)) }
        }.onFailure { err -> _e.update { it.copy(cargando = false, error = err.mensaje()) } }
    }

    fun editar() = _e.update { it.copy(modo = Modo.Editar) }
    fun cancelar() = _e.update { it.copy(modo = Modo.Ver, form = it.original?.aForm() ?: it.form, campos = emptyMap(), aviso = null) }
    fun cambiar(f: FormProducto) = _e.update { it.copy(form = f) }

    fun guardar() = viewModelScope.launch {
        val f = _e.value.form
        // Formato básico en el teléfono; el resto (y la última palabra) es de la API.
        val locales = buildMap {
            if (f.precio.toDoubleOrNull() == null) put("precio", "Precio: debe ser un número.")
            if (f.descuento.toIntOrNull() == null) put("descuento_pct", "Descuento: número entero de 0 a 90.")
            if (verCostos && f.costo.isNotBlank() && f.costo.toDoubleOrNull() == null) put("costo", "Costo: debe ser un número.")
            if (!Regex("""\d{4}-\d{2}-\d{2}""").matches(f.fecha.trim())) put("fecha_lanzamiento", "Fecha: formato AAAA-MM-DD.")
        }
        if (locales.isNotEmpty()) return@launch _e.update { it.copy(campos = locales) }

        val specs = f.specs.mapValues { it.value.trim() }
        val req = CelularReq(
            marcaId = f.marcaId,
            modelo = f.modelo.trim(),
            descripcion = f.descripcion.trim(),
            imagesUrl = f.imagenes.lines().map { it.trim() }.filter { it.isNotEmpty() },
            precio = f.precio.toDouble(),
            costo = if (verCostos) f.costo.toDoubleOrNull() else null, // un vendedor nunca lo envía
            descuentoPct = f.descuento.toInt(),
            fechaLanzamiento = f.fecha.trim(),
            // La ficha va completa o no va (en el alta, todo en blanco = sin ficha).
            especificaciones = specs.takeIf { s -> s.values.any { it.isNotEmpty() } },
        )
        _e.update { it.copy(guardando = true, campos = emptyMap(), aviso = null) }
        runCatching { llamar(c.json) { if (id == null) c.api.crearCelular(req) else c.api.editarCelular(id, req) } }
            .onSuccess { cel -> _e.update { it.copy(guardando = false, modo = Modo.Ver, original = cel, form = cel.aForm(), creadoId = if (id == null) cel.id else null) } }
            .onFailure { err -> _e.update { it.copy(guardando = false, campos = err.campos(), aviso = err.mensaje()) } }
    }
}

@Composable
fun AdminProductoScreen(container: AppContainer, id: String?, onAtras: () -> Unit, onCreado: (String) -> Unit) {
    val vm: AdminProductoViewModel = viewModel(key = "producto-${id ?: "nuevo"}") { AdminProductoViewModel(container, id) }
    val e by vm.estado.collectAsState()
    val f = e.form
    val lectura = e.modo == Modo.Ver
    LaunchedEffect(e.creadoId) { e.creadoId?.let(onCreado) }

    Column(Modifier.fillMaxSize().background(Iwmp.Paper)) {
        BarraSuperior(if (e.modo == Modo.Nuevo) "Nuevo producto" else e.original?.nombre ?: "Producto", onAtras)
        when {
            e.cargando -> EstadoCarga()
            e.error != null -> EstadoError(e.error!!, vm::cargar)
            else -> Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).imePadding().padding(Gutter), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                if (lectura && e.original != null) {
                    ImagenProducto(e.original!!.imagesUrl.firstOrNull(), e.original!!.nombre, Modifier.fillMaxWidth().height(200.dp).background(Iwmp.Surface).padding(20.dp))
                }
                Selector("Marca", e.marcas, e.marcas.find { it.id == f.marcaId }, { it.nombre }, { vm.cambiar(f.copy(marcaId = it.id)) }, soloLectura = lectura, error = e.campos["marca_id"])
                Campo(f.modelo, { vm.cambiar(f.copy(modelo = it)) }, "Modelo", soloLectura = lectura, error = e.campos["modelo"])
                Campo(f.descripcion, { vm.cambiar(f.copy(descripcion = it)) }, "Descripción", soloLectura = lectura, error = e.campos["descripcion"], lineas = 4)
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Campo(f.precio, { vm.cambiar(f.copy(precio = it)) }, "Precio (USD)", Modifier.weight(1f), soloLectura = lectura, error = e.campos["precio"], teclado = KeyboardType.Decimal)
                    Campo(f.descuento, { vm.cambiar(f.copy(descuento = it.filter(Char::isDigit))) }, "Descuento %", Modifier.weight(1f), soloLectura = lectura, error = e.campos["descuento_pct"], teclado = KeyboardType.Number)
                }
                if (vm.verCostos) {
                    Campo(f.costo, { vm.cambiar(f.copy(costo = it)) }, "Costo (solo administrador)", soloLectura = lectura, error = e.campos["costo"], teclado = KeyboardType.Decimal)
                }
                Campo(f.fecha, { vm.cambiar(f.copy(fecha = it)) }, "Fecha de lanzamiento", soloLectura = lectura, error = e.campos["fecha_lanzamiento"], placeholder = "AAAA-MM-DD")
                Campo(f.imagenes, { vm.cambiar(f.copy(imagenes = it)) }, "Imágenes (una URL por línea)", soloLectura = lectura, error = e.campos["images_url"], lineas = 3, teclado = KeyboardType.Uri)

                Spacer(Modifier.height(8.dp))
                Etiqueta("Especificaciones", color = Iwmp.Ink)
                e.campos["especificaciones"]?.let { Aviso(it) }
                SPEC_FIELDS.forEach { k ->
                    Campo(f.specs[k].orEmpty(), { vm.cambiar(f.copy(specs = f.specs + (k to it))) }, etiquetaSpec(k), soloLectura = lectura, error = e.campos["especificaciones.$k"])
                }

                if (e.aviso != null && e.campos.isEmpty()) Aviso(e.aviso!!)
                Spacer(Modifier.height(8.dp))
                when (e.modo) {
                    Modo.Ver -> Boton("Editar", vm::editar, Modifier.fillMaxWidth(), estilo = EstiloBoton.Solido)
                    Modo.Editar -> Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Boton("Cancelar", vm::cancelar, Modifier.weight(1f))
                        Boton("Actualizar", vm::guardar, Modifier.weight(1f), estilo = EstiloBoton.Solido, cargando = e.guardando)
                    }
                    Modo.Nuevo -> Boton("Crear producto", vm::guardar, Modifier.fillMaxWidth(), estilo = EstiloBoton.Solido, cargando = e.guardando)
                }
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}
