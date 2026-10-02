// MangaDex entrega los géneros en inglés; aquí los pasamos a español.
// Una cadena vacía oculta la etiqueta.
const ETIQUETAS: Record<string, string> = {
  Action: 'Acción', Adventure: 'Aventura', Comedy: 'Comedia', Drama: 'Drama', Fantasy: 'Fantasía',
  Romance: 'Romance', 'Slice of Life': 'Vida cotidiana', 'Sci-Fi': 'Ciencia ficción', Horror: 'Terror',
  Mystery: 'Misterio', Psychological: 'Psicológico', Sports: 'Deportes', Supernatural: 'Sobrenatural',
  'School Life': 'Vida escolar', 'Martial Arts': 'Artes marciales', Historical: 'Histórico',
  Thriller: 'Suspenso', Tragedy: 'Tragedia', Mecha: 'Mecha', Magic: 'Magia', Monsters: 'Monstruos',
  Music: 'Música', Cooking: 'Cocina', Medical: 'Medicina', Military: 'Militar', 'Award Winning': 'Premiado',
  'Long Strip': 'Tira larga', 'Full Color': 'A color', 'Web Comic': 'Webcómic', 'Official Colored': 'Color oficial',
  Adaptation: 'Adaptación', Villainess: 'Villana', Reincarnation: 'Reencarnación',
  'Time Travel': 'Viajes en el tiempo', 'Video Games': 'Videojuegos', Survival: 'Supervivencia',
  Vampires: 'Vampiros', Zombies: 'Zombis', Demons: 'Demonios', Gods: 'Dioses', Ghosts: 'Fantasmas',
  Superhero: 'Superhéroes', Police: 'Policial', Crime: 'Crimen', Philosophical: 'Filosófico',
  'Office Workers': 'Oficinistas', Animals: 'Animales', Delinquents: 'Delincuentes', Samurai: 'Samuráis',
  Ninja: 'Ninjas', Aliens: 'Extraterrestres', 'Post-Apocalyptic': 'Postapocalíptico',
  'Virtual Reality': 'Realidad virtual', 'Magical Girls': 'Chicas mágicas', 'Monster Girls': 'Chicas monstruo',
  Harem: 'Harén', 'Reverse Harem': 'Harén inverso', Anthology: 'Antología', 'Self-Published': 'Autopublicado',
  "Girls' Love": 'Yuri', "Boys' Love": 'BL', Gore: 'Gore', Shota: '', Loli: '', 'Sexual Violence': ''
}

export function traducirEtiqueta(nombre: string): string {
  return nombre in ETIQUETAS ? ETIQUETAS[nombre] : nombre
}
