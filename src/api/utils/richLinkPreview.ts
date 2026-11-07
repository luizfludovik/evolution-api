/**
 * Optional enriched link-preview payload used by the Localizador de Ofertas.
 *
 * No remote URL is fetched here: a bounded thumbnail is supplied as base64
 * by the authenticated caller. This also prevents the Evolution server from
 * fetching arbitrary image URLs supplied through /message/sendText.
 */
export interface RichLinkPreviewPayload {
  url: string;
  title: string;
  description?: string;
  thumbnailBase64: string;
}

const AFFILIATE_HOSTS = [
  'meli.la',
  'mercadolivre.com.br',
  'mercadolivre.com',
  'mercadolibre.com',
  'mercadolibre.com.ar',
  's.shopee.com.br',
  's.shopee.com',
  'shopee.com.br',
  'shopee.com',
  'amzn.to',
  'amazon.com.br',
  'amazon.com',
];
const MAX_THUMBNAIL_BYTES = 1024 * 1024;

export function validateRichLinkPreview(input: RichLinkPreviewPayload, text: string) {
  if (!input || typeof input !== 'object' || typeof text !== 'string') {
    throw new Error('Dados de previa enriquecida invalidos.');
  }
  if (typeof input.url !== 'string' || input.url.length > 2048 || !text.includes(input.url)) {
    throw new Error('Link de afiliado ausente na mensagem.');
  }
  let url: URL;
  try {
    url = new URL(input.url);
  } catch {
    throw new Error('Link de afiliado invalido.');
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !AFFILIATE_HOSTS.some((domain) => host === domain || host.endsWith('.' + domain))) {
    throw new Error('Dominio de afiliado nao permitido.');
  }
  if (typeof input.title !== 'string' || !input.title.trim() ||
      input.title.length > 180 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(input.title)) {
    throw new Error('Titulo de previa invalido.');
  }
  if (input.description !== undefined &&
      (typeof input.description !== 'string' || input.description.length > 320)) {
    throw new Error('Descricao de previa invalida.');
  }
  const b64 = input.thumbnailBase64;
  if (typeof b64 !== 'string' || !b64 || b64.length > Math.ceil(MAX_THUMBNAIL_BYTES * 4 / 3) + 4 ||
      b64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) {
    throw new Error('Miniatura base64 ausente ou excessiva.');
  }
  const thumbnail = Buffer.from(b64, 'base64');
  if (!thumbnail.length || thumbnail.length > MAX_THUMBNAIL_BYTES) {
    throw new Error('Miniatura fora do limite permitido.');
  }
  const jpeg = thumbnail.length >= 3 && thumbnail[0] === 0xff && thumbnail[1] === 0xd8 && thumbnail[2] === 0xff;
  const png = thumbnail.length >= 8 && thumbnail.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const webp = thumbnail.length >= 12 &&
    thumbnail.toString('ascii',0,4) === 'RIFF' && thumbnail.toString('ascii',8,12) === 'WEBP';
  if (!jpeg && !png && !webp) {
    throw new Error('A miniatura deve ser JPEG, PNG ou WebP.');
  }
  return { url: input.url, title: input.title.trim(),
    description: (input.description || '').trim(), thumbnail };
}
