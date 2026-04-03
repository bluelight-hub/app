/**
 * Adress-Objekt mit optionalen Feldern.
 * Kompatibel mit AddressDto (vollständig) und EinsatzListItemDtoEinsatzort (nur ort).
 */
interface AddressLike {
  strasse?: string;
  hausnummer?: string;
  plz?: string;
  ort?: string;
}

/**
 * Formatiert ein Adress-Objekt als lesbare Adresse.
 * Unterstützt AddressDto, {ort: string}, object und String-Eingaben.
 * Beispiel: "Musterstraße 42, 80331 München"
 */
export function formatAddress(address: AddressLike | string | null | undefined): string {
  if (!address) {
    return 'Ort wird nachgereicht';
  }

  if (typeof address === 'string') {
    return address;
  }

  const addr = address as AddressLike;
  const street = [addr.strasse, addr.hausnummer].filter(Boolean).join(' ');
  const locality = [addr.plz, addr.ort].filter(Boolean).join(' ');

  const formatted = [street, locality].filter(Boolean).join(', ');
  return formatted || 'Ort wird nachgereicht';
}
