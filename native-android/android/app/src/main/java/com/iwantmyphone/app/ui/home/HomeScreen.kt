package com.iwantmyphone.app.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.iwantmyphone.app.AppContainer
import com.iwantmyphone.app.data.api.Celular
import com.iwantmyphone.app.data.api.Home
import com.iwantmyphone.app.data.api.llamar
import com.iwantmyphone.app.ui.Carga
import com.iwantmyphone.app.ui.anio
import com.iwantmyphone.app.ui.components.Boton
import com.iwantmyphone.app.ui.components.EstadoCarga
import com.iwantmyphone.app.ui.components.EstadoError
import com.iwantmyphone.app.ui.components.EstiloBoton
import com.iwantmyphone.app.ui.components.Etiqueta
import com.iwantmyphone.app.ui.components.FichaProducto
import com.iwantmyphone.app.ui.components.Filete
import com.iwantmyphone.app.ui.components.Gutter
import com.iwantmyphone.app.ui.components.ImagenProducto
import com.iwantmyphone.app.ui.components.TituloSeccion
import com.iwantmyphone.app.ui.mensaje
import com.iwantmyphone.app.ui.precio
import com.iwantmyphone.app.ui.splash.Logo
import com.iwantmyphone.app.ui.theme.Iwmp
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class HomeViewModel(private val c: AppContainer) : ViewModel() {
    private val _estado = MutableStateFlow<Carga<Home>>(Carga.Cargando)
    val estado = _estado.asStateFlow()

    init { cargar() }

    fun cargar() = viewModelScope.launch {
        _estado.value = Carga.Cargando
        _estado.value = runCatching { llamar(c.json) { c.api.home() } }.fold({ Carga.Listo(it) }, { Carga.Error(it.mensaje()) })
    }
}

/**
 * Home (Excel, fila 6): banners a ancho completo y bloques masonry con
 * promociones, lanzamientos y más vendidos. Enfoque comercial, con la
 * anatomía de fichas del Next (Alpine).
 */
@Composable
fun HomeScreen(container: AppContainer, onProducto: (String) -> Unit, onCatalogo: (promo: Boolean) -> Unit) {
    val vm: HomeViewModel = viewModel { HomeViewModel(container) }
    val estado by vm.estado.collectAsState()

    LazyColumn(Modifier.fillMaxSize().background(Iwmp.Paper)) {
        item {
            Box(Modifier.fillMaxWidth().padding(vertical = 18.dp), contentAlignment = Alignment.Center) {
                Logo(Modifier.width(168.dp))
            }
            Filete()
        }
        when (val e = estado) {
            Carga.Cargando -> item { EstadoCarga() }
            is Carga.Error -> item { EstadoError(e.mensaje, vm::cargar) }
            is Carga.Listo -> {
                val h = e.datos
                if (h.banners.isNotEmpty()) item { Banners(h.banners, onProducto) }
                if (h.promociones.isNotEmpty()) {
                    item { TituloSeccion("Promociones", accion = "Ver todas") { onCatalogo(true) } }
                    item { Masonry(h.promociones, onProducto) }
                }
                item {
                    Spacer(Modifier.height(16.dp))
                    TituloSeccion("Últimos lanzamientos", accion = "Catálogo") { onCatalogo(false) }
                    LazyRow(contentPadding = PaddingValues(horizontal = Gutter), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(h.ultimos, key = { it.id }) { cel ->
                            FichaProducto(cel.nombre, cel.imagesUrl.firstOrNull(), cel.precio, cel.precioFinal, cel.descuentoPct, anio(cel.fechaLanzamiento), { onProducto(cel.id) }, Modifier.width(176.dp))
                        }
                    }
                }
                if (h.masVendidos.isNotEmpty()) {
                    item {
                        Spacer(Modifier.height(16.dp))
                        TituloSeccion("Los más vendidos")
                    }
                    item { Masonry(h.masVendidos, onProducto) }
                }
                item { FranjaCatalogo { onCatalogo(false) } }
            }
        }
    }
}

/** Carrusel de banners a sangre, con el indicador `01 —— 04 →` del Next. Avanza solo cada 5 s. */
@Composable
private fun Banners(banners: List<Celular>, onProducto: (String) -> Unit) {
    val pager = rememberPagerState { banners.size }
    val scope = rememberCoroutineScope()
    LaunchedEffect(pager.currentPage) {
        delay(5_000)
        pager.animateScrollToPage((pager.currentPage + 1) % banners.size)
    }
    Column(Modifier.fillMaxWidth().background(Iwmp.Surface)) {
        HorizontalPager(pager, Modifier.fillMaxWidth()) { i ->
            val cel = banners[i]
            Column(Modifier.fillMaxWidth().clickable { onProducto(cel.id) }.padding(horizontal = Gutter, vertical = 28.dp)) {
                Etiqueta("Nuevo · ${anio(cel.fechaLanzamiento)}")
                Spacer(Modifier.height(10.dp))
                Text("/ ${cel.nombre}", style = MaterialTheme.typography.headlineLarge)
                Spacer(Modifier.height(10.dp))
                cel.descripcion?.let {
                    Text(it, style = MaterialTheme.typography.bodyMedium, maxLines = 3, overflow = TextOverflow.Ellipsis)
                }
                ImagenProducto(cel.imagesUrl.firstOrNull(), cel.nombre, Modifier.fillMaxWidth().height(250.dp).padding(vertical = 20.dp))
                Boton("Comprar · ${precio(cel.precioFinal)}", { onProducto(cel.id) }, estilo = EstiloBoton.Acento)
            }
        }
        Row(Modifier.fillMaxWidth().padding(horizontal = Gutter, vertical = 16.dp), verticalAlignment = Alignment.CenterVertically) {
            Etiqueta("%02d".format(pager.currentPage + 1), color = Iwmp.Ink)
            Box(Modifier.padding(horizontal = 12.dp).width(56.dp).height(1.dp).background(Iwmp.Ink))
            Etiqueta("%02d".format(banners.size))
            Spacer(Modifier.weight(1f))
            Etiqueta(
                "→",
                Modifier.clickable { scope.launch { pager.animateScrollToPage((pager.currentPage + 1) % banners.size) } }.padding(8.dp),
                color = Iwmp.Ink,
            )
        }
    }
}

/**
 * Grid masonry de dos columnas: las fichas alternan 4:5 y 1:1 y las columnas
 * se desfasan. Hecho con dos Column (y no LazyStaggeredGrid) porque va dentro
 * de la LazyColumn de la Home y son pocas fichas.
 */
@Composable
private fun Masonry(celulares: List<Celular>, onProducto: (String) -> Unit) {
    Row(Modifier.fillMaxWidth().padding(horizontal = Gutter), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        listOf(0, 1).forEach { col ->
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                celulares.filterIndexed { i, _ -> i % 2 == col }.forEachIndexed { j, cel ->
                    val alta = (j + col) % 2 == 0
                    FichaProducto(
                        cel.nombre, cel.imagesUrl.firstOrNull(), cel.precio, cel.precioFinal, cel.descuentoPct,
                        anio(cel.fechaLanzamiento), { onProducto(cel.id) }, Modifier.fillMaxWidth(),
                        proporcion = if (alta) 4f / 5f else 1f,
                    )
                }
            }
        }
    }
}

@Composable
private fun FranjaCatalogo(onClick: () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(top = 32.dp).background(Iwmp.Surface).padding(horizontal = Gutter, vertical = 36.dp)) {
        Etiqueta("Catálogo completo")
        Spacer(Modifier.height(8.dp))
        Text("Todos los iPhone, del original al más reciente.", style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(20.dp))
        Boton("Ver catálogo", onClick)
    }
}
