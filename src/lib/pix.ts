/**
 * BR Code / Pix EMV Generator for SchoolVan Subscriptions
 */

function formatField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

export function crc16CCITT(payload: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= (payload.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface GeneratePixOptions {
  pixKey: string;
  merchantName?: string;
  merchantCity?: string;
  amount?: number;
  txid?: string;
}

export function generatePixPayload(options: GeneratePixOptions): string {
  const {
    pixKey = '34657020000151',
    merchantName = 'SchoolVan',
    merchantCity = 'Sao Paulo',
    amount,
    txid = '***'
  } = options;

  const cleanKey = pixKey.trim();
  const cleanName = merchantName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 25);
  const cleanCity = merchantCity.normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 15);
  const cleanTxid = (txid || '***').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***';

  // ID 00: Payload Format Indicator
  let payload = formatField('00', '01');

  // ID 26: Merchant Account Information - Pix
  const gui = formatField('00', 'br.gov.bcb.pix');
  const keyField = formatField('01', cleanKey);
  const merchantInfo = formatField('26', `${gui}${keyField}`);
  payload += merchantInfo;

  // ID 52: Merchant Category Code
  payload += formatField('52', '0000');

  // ID 53: Transaction Currency (986 = BRL)
  payload += formatField('53', '986');

  // ID 54: Transaction Amount
  if (amount && amount > 0) {
    const formattedAmount = amount.toFixed(2);
    payload += formatField('54', formattedAmount);
  }

  // ID 58: Country Code
  payload += formatField('58', 'BR');

  // ID 59: Merchant Name
  payload += formatField('59', cleanName);

  // ID 60: Merchant City
  payload += formatField('60', cleanCity);

  // ID 62: Additional Data Field
  const txidField = formatField('05', cleanTxid);
  payload += formatField('62', txidField);

  // ID 63: CRC16 Header
  payload += '6304';

  const crc = crc16CCITT(payload);
  return `${payload}${crc}`;
}
