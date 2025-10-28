export const SALONES_CCCR = [
  "Salón Talamanca",
  "Salón Talamanca 1",
  "Salón Talamanca 2",
  "Salón Talamanca 2/3",
  "Salón Talamanca 1/3",
  "Salón Central",
  "Salón Central 1",
  "Salón Central 2",
  "Salón Central 3",
  "Salón Central 2 + 3",
  "Salón Central 1 + 2",
  "Salón Guanacaste",
  "Salón Guanacaste 1",
  "Salón Guanacaste 2",
  "Salón Guanacaste 3",
  "Salón Guanacaste 1 + 2",
  "Salón Guanacaste 2 + 3",
  "Concesión 1",
  "Concesión 2",
  "Concesión 3",
  "Guardarropa",
  "Sala Ejecutiva Guanacaste",
  "Sala Ejecutiva Alajuela",
  "Sala Ejecutiva Limón",
  "Sala Ejecutiva Cartago",
  "Sala Ejecutiva Heredia",
  "Sala Ejecutiva Puntarenas",
  "Foyer Diquís",
  "Foyer Alegoría",
  "Tambor",
  "Enfermería",
  "Sala de Lactancia",
  "Canopy Este",
  "Canopy Oeste",
  "Sala de Prensa",
  "Área de Podcast",
  "Camerino VIP",
]

export const INFRAESTRUCTURA_ITEMS = [
  "Piso/alfombra",
  "Paredes/Paneles",
  "Techo",
  "Puertas",
  "Luces",
  "Ins. Eléctricas",
  "Equipo C/Incendios",
]

export const RECINTOS = [
  { value: "CCCI", label: "CCCI" },
  { value: "CEVP", label: "CEVP" },
  { value: "CCCR", label: "CCCR" }
]

export const TIPOS_ENTREGA = [
  { value: "Entrega", label: "Entrega" },
  { value: "Recepción", label: "Recepción" }
]

export const ESTADOS_INFRAESTRUCTURA = [
  { value: "Buen Estado", label: "Buen Estado" },
  { value: "Novedad Encontrada", label: "Novedad Encontrada" }
]

export const TIPOS_HALLAZGO = [
  { value: "Nuevo", label: "Nuevo" },
  { value: "Existente", label: "Existente" }
]

export const getLogo = (recinto) => {
  switch (recinto) {
    case "CCCR":
      return "https://costaricacc.com/cccr/Logocccr.png"
    case "CCCI":
      return "https://costaricacc.com/cccr/logoccci.png"
    case "CEVP":
      return "https://costaricacc.com/cccr/logocevp.png"
    default:
      return null
  }
}
