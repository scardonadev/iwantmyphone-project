package com.iwantmyphone.app.ui.catalogo

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.iwantmyphone.app.AppContainer
import com.iwantmyphone.app.data.api.Celular
import com.iwantmyphone.app.data.api.Opcion
import com.iwantmyphone.app.data.api.llamar
import com.iwantmyphone.app.data.api.llamarPagina
import com.iwantmyphone.app.ui.anio
import com.iwantmyphone.app.ui.components.Boton
import com.iwantmyphone.app.ui.components.Campo
import com.iwantmyphone.app.ui.components.EnlaceTexto
import com.iwantmyphone.app.ui.components.EstadoCarga
import com.iwantmyphone.app.ui.components.EstadoError
import com.iwantmyphone.app.ui.components.EstadoMensaje
import com.iwantmyphone.app.ui.components.EstiloBoton
import com.iwantmyphone.app.ui.components.Etiqueta
import com.iwantmyphone.app.ui.components.FichaProducto
import com.iwantmyphone.app.ui.components.Filete
import com.iwantmyphone.app.ui.components.Gutter
import com.iwantmyphone.app.ui.components.Selector
import com.iwantmyphone.app.ui.etiquetaSpec
import com.iwantmyphone.app.ui.mensaje
import com.iwantmyphone.app.ui.theme.Iwmp
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.JsonObject

val ORDENES = listOf("recientes" to "Más recientes", "precio_asc" to "Menor precio", "precio_desc" to "Mayor precio", "nombre" to "Nombre")

data class EstadoListado(
    val q: String = "",
    val promo: Boolean = false,
    val orden: String = "recientes",
    val filtros: Map<String, String> = emptyMap(),
    val items: List<Celular> = emptyList(),
    val total: Int = 0,
    val pagina: Int = 0,
    val hayMas: Boolean = true,
    val cargando: Boolean = false,
    val error: String? = null,
    val opciones: List<Opcion> = emptyList(),
)

class ProductosViewModel(private val c: AppContainer, promoInicial: Boolean) : ViewModel() {
    private val _e = MutableStateFlow(EstadoListado(promo = promoInicial))
    val estado = _e.asStateFlow()
    private var trabajo: Job? = null

    init {
        recargar()
        viewModelScope.launch {
            runCatching { llamar(c.json) { c.api.opciones() } }.onSuccess { o -> _e.update { it.copy(opciones = o.options) } }
        }
    }

    /** La búsqueda espera 350 ms a que se deje de teclear. */
    fun buscar(q: String) {
        _e.update { it.copy(q = q) }
        recargar(espera = 350)
    }

    fun aplicar(promo: Boolean, orden: String, filtros: Map<String, String>) {
        _e.update { it.copy(promo = promo, orden = orden, filtros = filtros) }
        recargar()
    }

    fun recargar(espera: Long = 0) {
        trabajo?.cancel()
        _e.update { it.copy(items = emptyList(), pagina = 0, hayMas = true, error = null) }
        trabajo = viewModelScope.launch {
            if (espera > 0) delay(espera)
            cargarPagina()
        }
    }

    fun siguiente() {
        val e = _e.value
        if (e.cargando || !e.hayMas || e.error != null) return
        trabajo = viewModelScope.launch { cargarPagina() }
    }

    private suspend fun cargarPagina() {
        val e = _e.value
        _e.update { it.copy(cargando = true) }
        // Mismo formato de filtro que el Next: JSON estricto, todo es ILIKE en la API.
        val filtro = e.filtros.takeIf { it.isNotEmpty() }?.let { f -> JsonObject(f.mapValues { JsonPrimitive(it.value) }).toString() }
        runCatching {
            llamarPagina(c.json) {
                c.api.celulares(q = e.q.ifBlank { null }, filter = filtro, promocion = if (e.promo) "true" else null, orden = e.orden, page = e.pagina + 1, limit = 20)
            }
        }.onSuccess { p ->
            _e.update {
                it.copy(items = it.items + p.items, pagina = it.pagina + 1, total = p.meta?.total ?: 0, hayMas = p.meta?.hasNextPage == true, cargando = false)
            }
        }.onFailure { err -> _e.update { it.copy(cargando = false, error = err.mensaje()) } }
    }
}

/** Listado (Excel, fila 7): búsqueda, filtros y productos con título y precio. */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun ProductosScreen(container: AppContainer, promoInicial: Boolean, onProducto: (String) -> Unit) {
    val vm: ProductosViewModel = viewModel { ProductosViewModel(container, promoInicial) }
    val e by vm.estado.collectAsState()
    var filtrosAbiertos by remember { mutableStateOf(false) }
    val grid = rememberLazyGridState()

    val cercaDelFinal by remember { derivedStateOf { (grid.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0) >= grid.layoutInfo.totalItemsCount - 6 } }
    LaunchedEffect(cercaDelFinal, e.items.size) { if (cercaDelFinal) vm.siguiente() }

    Column(Modifier.fillMaxSize().background(Iwmp.Paper)) {
        Row(Modifier.fillMaxWidth().padding(horizontal = Gutter, vertical = 12.dp), verticalAlignment = Alignment.Bottom) {
            Campo(e.q, vm::buscar, "Buscar", Modifier.weight(1f), placeholder = "Modelo, p. ej. 15 Pro")
            Spacer(Modifier.size(12.dp))
            val activos = e.filtros.size + (if (e.promo) 1 else 0)
            Boton(if (activos > 0) "Filtros · $activos" else "Filtros", { filtrosAbiertos = true })
        }
        Row(Modifier.fillMaxWidth().padding(horizontal = Gutter, vertical = 4.dp)) {
            Etiqueta(if (e.items.isEmpty() && e.cargando) "Buscando…" else "${e.total} dispositivos")
            Spacer(Modifier.weight(1f))
            Etiqueta(ORDENES.first { it.first == e.orden }.second)
        }
        Filete()

        when {
            e.error != null && e.items.isEmpty() -> EstadoError(e.error!!, { vm.recargar() })
            !e.cargando && e.items.isEmpty() -> EstadoMensaje(
                "Sin resultados",
                detalle = "No hay dispositivos que cumplan estos filtros.",
                accion = "Quitar filtros",
                onAccion = { vm.aplicar(false, "recientes", emptyMap()); vm.buscar("") },
            )
            else -> LazyVerticalGrid(
                GridCells.Fixed(2),
                state = grid,
                contentPadding = PaddingValues(Gutter),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize(),
            ) {
                items(e.items, key = { it.id }) { cel ->
                    FichaProducto(cel.nombre, cel.imagesUrl.firstOrNull(), cel.precio, cel.precioFinal, cel.descuentoPct, anio(cel.fechaLanzamiento), { onProducto(cel.id) })
                }
                if (e.cargando) item(span = { GridItemSpan(2) }) { EstadoCarga() }
            }
        }
    }

    if (filtrosAbiertos) {
        ModalBottomSheet(onDismissRequest = { filtrosAbiertos = false }, containerColor = Iwmp.Paper, tonalElevation = 0.dp, dragHandle = null) {
            PanelFiltros(e, onAplicar = { promo, orden, filtros -> vm.aplicar(promo, orden, filtros); filtrosAbiertos = false })
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PanelFiltros(e: EstadoListado, onAplicar: (Boolean, String, Map<String, String>) -> Unit) {
    var promo by remember { mutableStateOf(e.promo) }
    var orden by remember { mutableStateOf(e.orden) }
    var filtros by remember { mutableStateOf(e.filtros) }

    Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).navigationBarsPadding().padding(Gutter)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Etiqueta("Filtros", Modifier.weight(1f), color = Iwmp.Ink)
            EnlaceTexto("Limpiar", { promo = false; orden = "recientes"; filtros = emptyMap() }, color = Iwmp.Muted)
        }
        Spacer(Modifier.height(16.dp))
        Etiqueta("Ordenar por")
        Spacer(Modifier.height(8.dp))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            ORDENES.forEach { (clave, nombre) ->
                val activo = orden == clave
                Text(
                    nombre.uppercase(),
                    style = com.iwantmyphone.app.ui.theme.EstiloLabel,
                    color = if (activo) Iwmp.Paper else Iwmp.Ink,
                    modifier = Modifier
                        .border(1.dp, Iwmp.Ink)
                        .background(if (activo) Iwmp.Ink else Iwmp.Paper)
                        .clickable { orden = clave }
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                )
            }
        }
        Spacer(Modifier.height(20.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Etiqueta("Solo promociones", Modifier.weight(1f), color = Iwmp.Ink)
            Switch(
                promo, { promo = it },
                colors = SwitchDefaults.colors(checkedTrackColor = Iwmp.Ink, checkedThumbColor = Iwmp.Paper, uncheckedTrackColor = Iwmp.Surface, uncheckedBorderColor = Iwmp.Line, uncheckedThumbColor = Iwmp.Muted),
            )
        }
        Spacer(Modifier.height(12.dp))
        Filete()
        Spacer(Modifier.height(12.dp))
        // Un select por cada campo que devuelve /especificaciones/opciones, sin conocer las keys de antemano.
        e.opciones.forEach { op ->
            Selector(
                etiquetaSpec(op.key),
                listOf("") + op.values,
                filtros[op.key] ?: "",
                { if (it.isEmpty()) "Cualquiera" else it },
                { v -> filtros = if (v.isEmpty()) filtros - op.key else filtros + (op.key to v) },
                vacio = "Cualquiera",
            )
            Spacer(Modifier.height(12.dp))
        }
        Spacer(Modifier.height(8.dp))
        Boton("Aplicar", { onAplicar(promo, orden, filtros) }, Modifier.fillMaxWidth(), estilo = EstiloBoton.Solido)
        Spacer(Modifier.height(12.dp))
    }
}
