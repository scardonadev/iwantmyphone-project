package com.iwantmyphone.app.ui

import java.text.NumberFormat
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/*
 * Mismos formatos que el Next (src/utils/format.ts).
 */

private val precioFmt = NumberFormat.getCurrencyInstance(Locale.US).apply {
    minimumFractionDigits = 0
    maximumFractionDigits = 2
}

/** "$1,199" — locale en-US como el Next: los precios del seed son USD. */
fun precio(valor: Double): String = precioFmt.format(valor)

private val MESES = listOf("enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre")
private val MESES_CORTOS = listOf("ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic")

/** "2025-09-19" -> "19 de septiembre de 2025", sin pasar por zonas horarias. */
fun fechaLanzamiento(fecha: String): String {
    val partes = fecha.take(10).split("-")
    val mes = partes.getOrNull(1)?.toIntOrNull()?.let { MESES.getOrNull(it - 1) } ?: return fecha
    return "${partes[2].toInt()} de $mes de ${partes[0]}"
}

fun anio(fecha: String) = fecha.take(4)

private fun aLocal(iso: String) = runCatching { OffsetDateTime.parse(iso).atZoneSameInstant(ZoneId.systemDefault()) }.getOrNull()

/** Timestamp ISO -> "9 oct 2026". */
fun fechaCorta(iso: String): String {
    val f = aLocal(iso) ?: return runCatching { LocalDate.parse(iso.take(10)) }.map { "${it.dayOfMonth} ${MESES_CORTOS[it.monthValue - 1]} ${it.year}" }.getOrDefault(iso)
    return "${f.dayOfMonth} ${MESES_CORTOS[f.monthValue - 1]} ${f.year}"
}

/** Timestamp ISO -> "9 oct 2026 · 14:32". */
fun fechaHora(iso: String): String {
    val f = aLocal(iso) ?: return iso
    return "${fechaCorta(iso)} · ${f.format(DateTimeFormatter.ofPattern("HH:mm"))}"
}

fun iniciales(nombre: String) = nombre.trim().split(Regex("\\s+")).take(2).joinToString("") { it.take(1).uppercase() }

private val ETIQUETAS_SPEC = mapOf(
    "procesador" to "Procesador",
    "ram" to "Memoria RAM",
    "almacenamiento" to "Almacenamiento",
    "pantalla" to "Pantalla",
    "camara" to "Cámara",
    "bateria" to "Batería",
    "sistema_op" to "Sistema operativo",
)

/** Orden canónico de la ficha técnica (el de la API). */
val SPEC_FIELDS = ETIQUETAS_SPEC.keys.toList()

/** Una key desconocida se muestra legible en vez de romper la tabla. */
fun etiquetaSpec(key: String) = ETIQUETAS_SPEC[key] ?: key.replace('_', ' ').replaceFirstChar { it.uppercase() }

val NOMBRE_ESTADO_PEDIDO = mapOf(
    "pendiente" to "Pendiente",
    "confirmado" to "Confirmado",
    "enviado" to "Enviado",
    "entregado" to "Entregado",
    "cancelado" to "Cancelado",
)

val NOMBRE_ESTADO_PAGO = mapOf(
    "pendiente" to "Pago pendiente",
    "aprobado" to "Pago aprobado",
    "rechazado" to "Pago rechazado",
    "fallido" to "Pago fallido",
    "reversado" to "Pago reversado",
)
