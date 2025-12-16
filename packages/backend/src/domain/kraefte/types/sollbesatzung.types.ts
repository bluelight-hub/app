/**
 * Sollbesatzung JSON Schema für Fahrzeugtypen.
 *
 * Definiert welche Rollen in welcher Anzahl im Fahrzeug vorgesehen sind.
 * In separater Datei um zirkuläre Abhängigkeiten zwischen Aggregate und Events zu vermeiden.
 */
export interface SollbesatzungSchema {
  fahrer?: number;
  sanitaeter?: number;
  notarzt?: number;
  funktrupp?: number;
  helfer?: number;
}
