package com.iwantmyphone.app.ui.catalogo

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.iwantmyphone.app.AppContainer
import com.iwantmyphone.app.data.api.Celular
import com.iwantmyphone.app.data.api.ResumenVentas
import com.iwantmyphone.app.data.api.Ventana
import com.iwantmyphone.app.data.api.llamar
import com.iwantmyphone.app.ui.Carga
import com.iwantmyphone.app.ui.anio
import com.iwantmyphone.app.ui.components.BarraSuperior
import com.iwantmyphone.app.ui.components.Boton
import com.iwantmyphone.app.ui.components.DialogoConfirmar
import com.iwantmyphone.app.ui.components.EstadoCarga
import com.iwantmyphone.app.ui.components.EstadoError
import com.iwantmyphone.app.ui.components.EstiloBoton
import com.iwantmyphone.app.ui.components.Estrellas
import com.iwantmyphone.app.ui.components.Etiqueta
import com.iwantmyphone.app.ui.components.FichaProducto
import com.iwantmyphone.app.ui.components.FilaDato
import com.iwantmyphone.app.ui.components.Filete
import com.iwantmyphone.app.ui.components.Gutter
import com.iwantmyphone.app.ui.components.ImagenProducto
import com.iwantmyphone.app.ui.components.PrecioProducto
import com.iwantmyphone.app.ui.components.TituloSeccion
import com.iwantmyphone.app.ui.etiquetaSpec
import com.iwantmyphone.app.ui.fechaLanzamiento
import com.iwantmyphone.app.ui.mensaje
import com.iwantmyphone.app.ui.precio
import com.iwantmyphone.app.ui.theme.Iwmp
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class EstadoDetalle(
    val celular: Carga<Celular> = Carga.Cargando,
    val sugeridos: List<Celular> = emptyList(),
    val resumen: ResumenVentas? = null,
    val agregado: Boolean = false,
    val aviso: String? = null,
)

class DetalleViewModel(private val c: AppContainer, private val id: String) : ViewModel() {
    private val _e = MutableStateFlow(EstadoDetalle())
    val estado = _e.asStateFlow()

    init { cargar() }

    fun cargar() = viewModelScope.launch {
        _e.update { it.copy(celular = Carga.Cargando) }
        val r = runCatching { llamar(c.json) { c.api.celular(id) } }
        _e.update { it.copy(celular = r.fold({ Carga.Listo(it) }, { Carga.Error(it.mensaje()) })) }
        if (r.isSuccess) {
            launch { runCatching { llamar(c.json) { c.api.sugeridos(id) } }.onSuccess { s -> _e.update { it.copy(sugeridos = s) } } }
            // Banner de ventas (Excel, fila 19): solo vendedor y administrador; la API recorta la utilidad.
            if (c.sesionStore.actual?.puede("reportes:ver") == true) {
                launch { runCatching { llamar(c.json) { c.api.resumenVentas(id) } }.onSuccess { s -> _e.update { it.copy(resumen = s) } } }
            }
        }
    }

    fun comprar() = viewModelScope.launch {
        val cel = (_e.value.celular as? Carga.Listo)?.datos ?: return@launch
        c.carrito.agregar(cel)
        _e.update { it.copy(agregado = true) }
    }

    fun cerrarDialogo() = _e.update { it.copy(agregado = false) }
    fun cerrarAviso() = _e.update { it.copy(aviso = null) }

    /** Optimista: cambia el corazón al instante y lo revierte si la API falla. */
    fun alternarFavorito() = viewModelScope.launch {
        val cel = (_e.value.celular as? Carga.Listo)?.datos ?: return@launch
        val nuevo = !cel.esFavorito
        _e.update { it.copy(celular = Carga.Listo(cel.copy(esFavorito = nuevo))) }
        runCatching { llamar(c.json) { if (nuevo) c.api.marcarFavorito(id) else c.api.quitarFavorito(id) } }.onFailure { err ->
            _e.update { it.copy(celular = Carga.Listo(cel), aviso = err.mensaje()) }
        }
    }
}

/**
 * Detalle (Excel, fila 8): imágenes en grid, título, descripción, precio,
 * botón de compra (añade al carrito y pregunta si pagar o seguir mirando),
 * especificaciones y sugeridos.
 */
@Composable
fun DetalleScreen(
    container: AppContainer,
    id: String,
    conSesion: Boolean,
    onAtras: () -> Unit,
    onProducto: (String) -> Unit,
    onIrAlCarrito: () -> Unit,
    onLogin: () -> Unit,
) {
    val vm: DetalleViewModel = viewModel(key = "detalle-$id") { DetalleViewModel(container, id) }
    val e by vm.estado.collectAsState()
    val cel = (e.celular as? Carga.Listo)?.datos

    Column(Modifier.fillMaxSize().background(Iwmp.Paper)) {
        BarraSuperior(cel?.marca?.nombre ?: "Detalle", onAtras) {
            if (cel != null) {
                IconButton(onClick = { if (conSesion) vm.alternarFavorito() else onLogin() }) {
                    Icon(
                        if (cel.esFavorito) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                        contentDescription = if (cel.esFavorito) "Quitar de favoritos" else "Añadir a favoritos",
                        tint = if (cel.esFavorito) Iwmp.Accent else Iwmp.Ink,
                    )
                }
            }
        }
        when (val estado = e.celular) {
            Carga.Cargando -> EstadoCarga()
            is Carga.Error -> EstadoError(estado.mensaje, vm::cargar)
            is Carga.Listo -> LazyColumn(Modifier.fillMaxSize()) {
                e.resumen?.let { item { BannerVentas(it) } }
                item { GridImagenes(estado.datos) }
                item { Cabecera(estado.datos, vm::comprar) }
                if (estado.datos.especificaciones.isNotEmpty()) {
                    item {
                        TituloSeccion("Especificaciones")
                        Column(Modifier.padding(horizontal = Gutter)) {
                            Filete()
                            estado.datos.especificaciones.forEach { FilaDato(etiquetaSpec(it.key), it.value) }
                        }
                    }
                }
                if (e.sugeridos.isNotEmpty()) {
                    item {
                        Spacer(Modifier.height(16.dp))
                        TituloSeccion("También te puede gustar")
                        LazyRow(contentPadding = PaddingValues(horizontal = Gutter), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            items(e.sugeridos, key = { it.id }) { s ->
                                FichaProducto(s.nombre, s.imagesUrl.firstOrNull(), s.precio, s.precioFinal, s.descuentoPct, anio(s.fechaLanzamiento), { onProducto(s.id) }, Modifier.width(168.dp))
                            }
                        }
                        Spacer(Modifier.height(32.dp))
                    }
                }
            }
        }
    }

    if (e.agregado && cel != null) {
        DialogoConfirmar(
            titulo = "Añadido al carrito",
            texto = "${cel.nombre} ya está en tu carrito. ¿Quieres pagar ahora o seguir mirando productos?",
            confirmar = "Ir a pagar",
            onConfirmar = { vm.cerrarDialogo(); onIrAlCarrito() },
            cancelar = "Seguir mirando",
            onCancelar = vm::cerrarDialogo,
        )
    }
    e.aviso?.let { DialogoConfirmar("No se pudo guardar", it, "Entendido", vm::cerrarAviso, vm::cerrarAviso) }
}

/** Grid de imágenes: la primera a todo lo ancho; el resto, de dos en dos. */
@Composable
private fun GridImagenes(cel: Celular) {
    val imgs = cel.imagesUrl.ifEmpty { listOf("") }
    Column(Modifier.fillMaxWidth().background(Iwmp.Surface).padding(bottom = 2.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
        ImagenProducto(imgs.first(), cel.nombre, Modifier.fillMaxWidth().aspectRatio(1f).padding(32.dp))
        imgs.drop(1).chunked(2).forEach { fila ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                fila.forEach { url ->
                    ImagenProducto(url, cel.nombre, Modifier.weight(1f).aspectRatio(1f).background(Iwmp.Paper).padding(20.dp))
                }
                if (fila.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun Cabecera(cel: Celular, onComprar: () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(horizontal = Gutter, vertical = 24.dp)) {
        Etiqueta(cel.marca.nombre)
        Spacer(Modifier.height(8.dp))
        Text(cel.nombre, style = MaterialTheme.typography.headlineLarge)
        Spacer(Modifier.height(6.dp))
        Etiqueta("Lanzado el ${fechaLanzamiento(cel.fechaLanzamiento)}")
        if ((cel.totalValoraciones ?: 0) > 0) {
            Spacer(Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Estrellas(cel.valoracion ?: 0.0)
                Etiqueta("${cel.valoracion} · ${cel.totalValoraciones} valoraciones")
            }
        }
        Spacer(Modifier.height(20.dp))
        PrecioProducto(cel.precio, cel.precioFinal, cel.descuentoPct, estilo = MaterialTheme.typography.headlineMedium)
        cel.costo?.let {
            Spacer(Modifier.height(4.dp))
            Etiqueta("Costo ${precio(it)} · margen ${precio(cel.precioFinal - it)}")
        }
        Spacer(Modifier.height(20.dp))
        Boton("Comprar", onComprar, Modifier.fillMaxWidth(), estilo = EstiloBoton.Solido)
        cel.descripcion?.let {
            Spacer(Modifier.height(24.dp))
            Text(it, style = MaterialTheme.typography.bodyLarge.copy(color = Iwmp.InkSoft))
        }
    }
}

/** Resumen de ventas del producto (vendedor y administrador; utilidad solo si la API la manda). */
@Composable
private fun BannerVentas(r: ResumenVentas) {
    Column(Modifier.fillMaxWidth().background(Iwmp.Ink).padding(horizontal = Gutter, vertical = 14.dp)) {
        Etiqueta("Ventas de este producto", color = Iwmp.Paper.copy(alpha = 0.6f))
        Spacer(Modifier.height(10.dp))
        Row(Modifier.fillMaxWidth()) {
            listOf("Último año" to r.ultimoAnio, "Último mes" to r.ultimoMes, "7 días" to r.ultimos7Dias, "Hoy" to r.hoy).forEach { (titulo, v) ->
                CeldaVentas(titulo, v, Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun CeldaVentas(titulo: String, v: Ventana, modifier: Modifier) {
    Column(modifier) {
        Etiqueta(titulo, color = Iwmp.Paper.copy(alpha = 0.6f), maxLines = 1)
        Text("${v.unidades} u.", style = MaterialTheme.typography.titleMedium, color = Iwmp.Paper)
        Text(precio(v.ventas), style = MaterialTheme.typography.bodySmall, color = Iwmp.Paper.copy(alpha = 0.8f))
        v.utilidad?.let { Text("+${precio(it)}", style = MaterialTheme.typography.bodySmall, color = Iwmp.Paper) }
    }
}
