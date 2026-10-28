/** Reverses the model's ByteLevel alphabet so even partial UTF-8/emoji tokens remain usable by the grammar. */
export function widgetByteDecoder(): Uint16Array {
  'worklet';
  const decoder = new Uint16Array(512).fill(256);
  let extra = 256;
  for (let byte = 0; byte < 256; byte++) {
    const direct = (byte >= 33 && byte <= 126) || (byte >= 161 && byte <= 172) || byte >= 174;
    decoder[direct ? byte : extra++] = byte;
  }
  return decoder;
}

/** Returns raw token bytes, rejecting special markers and literal JSON control characters. */
export function widgetTokenBytes(encoded: string, decoder: Uint16Array): string {
  'worklet';
  if (!encoded) return '';
  let piece = '';
  for (let index = 0; index < encoded.length; index++) {
    const code = encoded.charCodeAt(index);
    const byte = decoder[code];
    if (byte === undefined || byte >= 256) return '';
    piece += String.fromCharCode(byte);
  }
  return piece;
}
