package com.iwantmyphone.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.SubcomposeAsyncImage
import com.iwantmyphone.app.ui.precio
import com.iwantmyphone.app.ui.theme.EstiloLabel
import com.iwantmyphone.app.ui.theme.Iwmp

/** Contenedor estándar: el `px-5` del Next. */
val Gutter = 20.dp

// ---------------------------------------------------------------- Texto

/** `.u-label`: microtexto en versales espaciadas. */
@Composable
fun Etiqueta(texto: String, modifier: Modifier = Modifier, color: Color = Iwmp.Muted, maxLines: Int = Int.MAX_VALUE) {
    Text(texto.uppercase(), modifier = modifier, style = EstiloLabel, color = color, maxLines = maxLines, overflow = TextOverflow.Ellipsis)
}

/** Filete de 1 dp: la única forma de separar bloques (nada de sombras). */
@Composable
fun Filete(modifier: Modifier = Modifier) = HorizontalDivider(modifier, thickness = 1.dp, color = Iwmp.Line)

@Composable
fun TituloSeccion(titulo: String, modifier: Modifier = Modifier, accion: String? = null, onAccion: (() -> Unit)? = null) {
    Row(
        modifier.fillMaxWidth().padding(horizontal = Gutter, vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Etiqueta(titulo, color = Iwmp.Ink)
        if (accion != null && onAccion != null) {
            Etiqueta("$accion →", Modifier.clickable(onClick = onAccion), color = Iwmp.Accent)
        }
    }
}

// ---------------------------------------------------------------- Botones

enum class EstiloBoton { Primario, Acento, Solido }

/**
 * Rectángulo sin radio, borde de 1 dp y relleno generoso, como el Next.
 * Primario: borde tinta que se invierte a sólido al pulsar. Acento: borde azul (CTA).
 */
@Composable
fun Boton(
    texto: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    estilo: EstiloBoton = EstiloBoton.Primario,
    enabled: Boolean = true,
    cargando: Boolean = false,
) {
    val interaccion = remember { MutableInteractionSource() }
    val pulsado by interaccion.collectIsPressedAsState()
    val color = if (estilo == EstiloBoton.Acento) Iwmp.Accent else Iwmp.Ink
    val activo = enabled && !cargando
    val relleno = estilo == EstiloBoton.Solido || (pulsado && activo)
    val fondo = if (relleno) color else Iwmp.Paper
    val tinta = when {
        !activo && estilo != EstiloBoton.Solido -> Iwmp.Muted
        relleno -> Iwmp.Paper
        else -> color
    }
    Box(
        modifier
            .border(1.dp, if (activo) color else Iwmp.Line)
            .background(if (!activo && estilo == EstiloBoton.Solido) Iwmp.Muted else fondo)
            .clickable(interactionSource = interaccion, indication = null, enabled = activo, role = Role.Button, onClick = onClick)
            .padding(horizontal = 32.dp, vertical = 16.dp),
        contentAlignment = Alignment.Center,
    ) {
        if (cargando) {
            CircularProgressIndicator(Modifier.size(16.dp), color = tinta, strokeWidth = 1.dp)
        } else {
            Text(texto.uppercase(), style = EstiloLabel, color = tinta, maxLines = 1)
        }
    }
}

@Composable
fun EnlaceTexto(texto: String, onClick: () -> Unit, modifier: Modifier = Modifier, color: Color = Iwmp.Accent) {
    Text(
        texto.uppercase(),
        style = EstiloLabel,
        color = color,
        modifier = modifier.clickable(role = Role.Button, onClick = onClick).padding(vertical = 8.dp),
    )
}

@Composable
fun BarraSuperior(titulo: String, onAtras: (() -> Unit)?, acciones: @Composable () -> Unit = {}) {
    Column(Modifier.fillMaxWidth().background(Iwmp.Paper)) {
        Row(Modifier.fillMaxWidth().height(56.dp).padding(horizontal = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            if (onAtras != null) {
                IconButton(onClick = onAtras) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Atrás", tint = Iwmp.Ink) }
            } else {
                Spacer(Modifier.width(Gutter - 4.dp))
            }
            Etiqueta(titulo, Modifier.weight(1f), color = Iwmp.Ink, maxLines = 1)
            acciones()
        }
        Filete()
    }
}

// ---------------------------------------------------------------- Formularios

/**
 * `.u-input` del Next: filete de 1 dp, tinta al enfocar y fondo `surface`
 * cuando está bloqueado (readonly), para distinguir lectura de edición.
 */
@Composable
fun Campo(
    valor: String,
    onCambio: (String) -> Unit,
    etiqueta: String,
    modifier: Modifier = Modifier,
    error: String? = null,
    soloLectura: Boolean = false,
    teclado: KeyboardType = KeyboardType.Text,
    password: Boolean = false,
    lineas: Int = 1,
    placeholder: String? = null,
) {
    val interaccion = remember { MutableInteractionSource() }
    val enfocado by interaccion.collectIsFocusedAsState()
    Column(modifier.fillMaxWidth()) {
        Etiqueta(etiqueta, color = if (error != null) Iwmp.Accent else Iwmp.Muted)
        Spacer(Modifier.height(6.dp))
        BasicTextField(
            value = valor,
            onValueChange = onCambio,
            readOnly = soloLectura,
            singleLine = lineas == 1,
            minLines = lineas,
            textStyle = MaterialTheme.typography.bodyLarge.copy(color = if (soloLectura) Iwmp.InkSoft else Iwmp.Ink),
            keyboardOptions = KeyboardOptions(keyboardType = if (password) KeyboardType.Password else teclado),
            visualTransformation = if (password) PasswordVisualTransformation() else VisualTransformation.None,
            interactionSource = interaccion,
            cursorBrush = SolidColor(Iwmp.Accent),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, when { error != null -> Iwmp.Accent; enfocado && !soloLectura -> Iwmp.Ink; else -> Iwmp.Line })
                .background(if (soloLectura) Iwmp.Surface else Iwmp.Paper)
                .padding(horizontal = 12.dp, vertical = 12.dp),
            decorationBox = { inner ->
                Box {
                    if (valor.isEmpty() && placeholder != null) Text(placeholder, style = MaterialTheme.typography.bodyLarge, color = Iwmp.Muted)
                    inner()
                }
            },
        )
        if (error != null) {
            Spacer(Modifier.height(4.dp))
            Text(error, style = MaterialTheme.typography.bodySmall, color = Iwmp.Accent)
        }
    }
}

/** Select: los `<select>` no admiten readonly, así que bloqueado se pinta como un campo de solo lectura. */
@Composable
fun <T> Selector(
    etiqueta: String,
    opciones: List<T>,
    seleccion: T?,
    textoDe: (T) -> String,
    onSeleccion: (T) -> Unit,
    modifier: Modifier = Modifier,
    soloLectura: Boolean = false,
    error: String? = null,
    vacio: String = "Seleccionar",
) {
    var abierto by remember { mutableStateOf(false) }
    Column(modifier.fillMaxWidth()) {
        Etiqueta(etiqueta, color = if (error != null) Iwmp.Accent else Iwmp.Muted)
        Spacer(Modifier.height(6.dp))
        Box {
            Row(
                Modifier
                    .fillMaxWidth()
                    .border(1.dp, if (error != null) Iwmp.Accent else Iwmp.Line)
                    .background(if (soloLectura) Iwmp.Surface else Iwmp.Paper)
                    .clickable(enabled = !soloLectura, role = Role.DropdownList) { abierto = true }
                    .padding(horizontal = 12.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    seleccion?.let(textoDe) ?: vacio,
                    style = MaterialTheme.typography.bodyLarge,
                    color = when { seleccion == null -> Iwmp.Muted; soloLectura -> Iwmp.InkSoft; else -> Iwmp.Ink },
                    modifier = Modifier.weight(1f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                if (!soloLectura) Icon(Icons.Filled.ArrowDropDown, contentDescription = null, tint = Iwmp.Muted)
            }
            DropdownMenu(expanded = abierto, onDismissRequest = { abierto = false }, containerColor = Iwmp.Paper) {
                opciones.forEach { op ->
                    DropdownMenuItem(text = { Text(textoDe(op), style = MaterialTheme.typography.bodyLarge) }, onClick = { onSeleccion(op); abierto = false })
                }
            }
        }
        if (error != null) {
            Spacer(Modifier.height(4.dp))
            Text(error, style = MaterialTheme.typography.bodySmall, color = Iwmp.Accent)
        }
    }
}

/** Aviso de formulario (errores del servidor que no son de un campo). */
@Composable
fun Aviso(texto: String, modifier: Modifier = Modifier, color: Color = Iwmp.Accent) {
    Text(
        texto,
        style = MaterialTheme.typography.bodyMedium,
        color = color,
        modifier = modifier.fillMaxWidth().border(BorderStroke(1.dp, color)).padding(12.dp),
    )
}

// ---------------------------------------------------------------- Producto

/**
 * Imagen de producto. Ante URL vacía o rota pinta el marcador (silueta de
 * teléfono en trazo fino, `muted` al 45 %), igual que PhoneImage del Next:
 * tiene que verse intencional, no roto.
 */
@Composable
fun ImagenProducto(url: String?, descripcion: String, modifier: Modifier = Modifier, contentScale: ContentScale = ContentScale.Fit) {
    if (url.isNullOrBlank()) {
        MarcadorTelefono(modifier)
        return
    }
    SubcomposeAsyncImage(
        model = url,
        contentDescription = descripcion,
        contentScale = contentScale,
        modifier = modifier,
        loading = { Box(Modifier.fillMaxSize().background(Iwmp.Surface)) },
        error = { MarcadorTelefono(Modifier.fillMaxSize()) },
    )
}

@Composable
fun MarcadorTelefono(modifier: Modifier = Modifier) {
    val trazo = with(LocalDensity.current) { 1.dp.toPx() }
    Canvas(modifier) {
        val alto = size.minDimension * 0.62f
        val ancho = alto * 0.5f
        val origen = Offset((size.width - ancho) / 2, (size.height - alto) / 2)
        val color = Iwmp.Muted.copy(alpha = 0.45f)
        drawRoundRect(color, origen, Size(ancho, alto), CornerRadius(ancho * 0.16f), style = Stroke(trazo))
        drawLine(color, Offset(size.width / 2 - ancho * 0.12f, origen.y + alto * 0.07f), Offset(size.width / 2 + ancho * 0.12f, origen.y + alto * 0.07f), trazo)
    }
}

/** Precio final grande; si hay descuento, el original tachado y el % en acento. */
@Composable
fun PrecioProducto(precioOriginal: Double, precioFinal: Double, descuentoPct: Int, modifier: Modifier = Modifier, estilo: TextStyle = MaterialTheme.typography.titleMedium) {
    Row(modifier, verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(precio(precioFinal), style = estilo)
        if (descuentoPct > 0) {
            Text(precio(precioOriginal), style = estilo.copy(fontSize = estilo.fontSize * 0.75f, textDecoration = TextDecoration.LineThrough), color = Iwmp.Muted)
            Etiqueta("-$descuentoPct%", color = Iwmp.Accent)
        }
    }
}

/**
 * Ficha de producto (CelularCard del Next): bloque `surface`, imagen 4:5 y al
 * pie el nombre con el precio, y el año en `muted`.
 */
@Composable
fun FichaProducto(
    nombre: String,
    imagen: String?,
    precioOriginal: Double,
    precioFinal: Double,
    descuentoPct: Int,
    anio: String?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    proporcion: Float = 4f / 5f,
) {
    val interaccion = remember { MutableInteractionSource() }
    val pulsado by interaccion.collectIsPressedAsState()
    Column(
        modifier
            .background(if (pulsado) Iwmp.Surface2 else Iwmp.Surface)
            .clickable(interactionSource = interaccion, indication = null, onClick = onClick),
    ) {
        Box {
            ImagenProducto(imagen, nombre, Modifier.fillMaxWidth().aspectRatio(proporcion).padding(20.dp))
            if (descuentoPct > 0) {
                Etiqueta("-$descuentoPct%", Modifier.align(Alignment.TopStart).background(Iwmp.Accent).padding(horizontal = 8.dp, vertical = 4.dp), color = Iwmp.Paper)
            }
        }
        Column(Modifier.padding(horizontal = 14.dp, vertical = 12.dp)) {
            Text(nombre, style = MaterialTheme.typography.titleSmall, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.Bottom) {
                Text(precio(precioFinal), style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                if (anio != null) Etiqueta(anio)
            }
            if (descuentoPct > 0) {
                Text(precio(precioOriginal), style = MaterialTheme.typography.bodySmall.copy(textDecoration = TextDecoration.LineThrough), color = Iwmp.Muted)
            }
        }
    }
}

@Composable
fun Estrellas(valor: Double, modifier: Modifier = Modifier, tam: Dp = 14.dp) {
    Row(modifier) {
        repeat(5) { i ->
            Icon(Icons.Filled.Star, contentDescription = null, tint = if (i < Math.round(valor)) Iwmp.Ink else Iwmp.Line, modifier = Modifier.size(tam))
        }
    }
}

// ---------------------------------------------------------------- Estados

@Composable
fun EstadoCarga(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().padding(48.dp), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(Modifier.size(24.dp), color = Iwmp.Ink, strokeWidth = 1.dp)
    }
}

@Composable
fun EstadoMensaje(titulo: String, modifier: Modifier = Modifier, detalle: String? = null, accion: String? = null, onAccion: (() -> Unit)? = null) {
    Column(modifier.fillMaxWidth().padding(horizontal = Gutter, vertical = 48.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Etiqueta(titulo, color = Iwmp.Ink)
        if (detalle != null) {
            Spacer(Modifier.height(8.dp))
            Text(detalle, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.widthIn(max = 320.dp))
        }
        if (accion != null && onAccion != null) {
            Spacer(Modifier.height(24.dp))
            Boton(accion, onAccion)
        }
    }
}

@Composable
fun EstadoError(mensaje: String, onReintentar: () -> Unit, modifier: Modifier = Modifier) =
    EstadoMensaje("No se pudo cargar", modifier, detalle = mensaje, accion = "Reintentar", onAccion = onReintentar)

/** Confirmación de borrado y similares: cuadrada y sin elevación, como el resto. */
@Composable
fun DialogoConfirmar(
    titulo: String,
    texto: String,
    confirmar: String,
    onConfirmar: () -> Unit,
    onCancelar: () -> Unit,
    cancelar: String = "Cancelar",
) {
    AlertDialog(
        onDismissRequest = onCancelar,
        containerColor = Iwmp.Paper,
        tonalElevation = 0.dp,
        title = { Etiqueta(titulo, color = Iwmp.Ink) },
        text = { Text(texto, style = MaterialTheme.typography.bodyMedium) },
        confirmButton = { EnlaceTexto(confirmar, onConfirmar) },
        dismissButton = { EnlaceTexto(cancelar, onCancelar, color = Iwmp.Muted) },
    )
}

/** Fila "etiqueta ......... valor" de las tablas de especificaciones y resúmenes. */
@Composable
fun FilaDato(etiqueta: String, valor: String, modifier: Modifier = Modifier, destacado: Boolean = false) {
    Column(modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth().padding(vertical = 12.dp), verticalAlignment = Alignment.Top) {
            Etiqueta(etiqueta, Modifier.weight(0.42f))
            Text(
                valor,
                style = if (destacado) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium.copy(color = Iwmp.Ink),
                modifier = Modifier.weight(0.58f),
            )
        }
        Filete()
    }
}

/** Avatar de iniciales: la BD no guarda foto de perfil. */
@Composable
fun Avatar(iniciales: String, modifier: Modifier = Modifier, tam: Dp = 48.dp) {
    Box(modifier.size(tam).border(1.dp, Iwmp.Line).background(Iwmp.Surface), contentAlignment = Alignment.Center) {
        Text(iniciales, style = EstiloLabel.copy(fontSize = 13.sp), color = Iwmp.Ink)
    }
}
