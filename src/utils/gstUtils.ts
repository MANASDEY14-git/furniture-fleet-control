/**
 * Indian GST (Goods and Services Tax) Compliance Utilities
 * Implements statutory standards under CGST/SGST/IGST Act, 2017 & Rule 46 Tax Invoicing.
 */

export interface GSTState {
  code: string;
  name: string;
  isUnionTerritory?: boolean;
}

export const INDIAN_STATES: GSTState[] = [
  { code: '01', name: 'Jammu & Kashmir', isUnionTerritory: true },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh', isUnionTerritory: true },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi', isUnionTerritory: true },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '25', name: 'Daman and Diu', isUnionTerritory: true },
  { code: '26', name: 'Dadra and Nagar Haveli', isUnionTerritory: true },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh (Old)' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep', isUnionTerritory: true },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry', isUnionTerritory: true },
  { code: '35', name: 'Andaman & Nicobar Islands', isUnionTerritory: true },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh (New)' },
  { code: '38', name: 'Ladakh', isUnionTerritory: true },
  { code: '97', name: 'Other Territory', isUnionTerritory: true },
];

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function getStateByCode(code?: string | null): GSTState | undefined {
  if (!code) return undefined;
  const padded = code.padStart(2, '0');
  return INDIAN_STATES.find(s => s.code === padded);
}

export function validateGSTIN(gstin: string): {
  isValid: boolean;
  stateCode?: string;
  stateName?: string;
  pan?: string;
  error?: string;
} {
  const trimmed = (gstin || '').trim().toUpperCase();
  if (!trimmed) {
    return { isValid: false, error: 'GSTIN cannot be empty' };
  }
  if (trimmed.length !== 15) {
    return { isValid: false, error: 'GSTIN must be exactly 15 characters long' };
  }
  if (!GSTIN_REGEX.test(trimmed)) {
    return { isValid: false, error: 'Invalid GSTIN format (e.g. 19ABCDE1234F1Z5)' };
  }

  const stateCode = trimmed.substring(0, 2);
  const pan = trimmed.substring(2, 12);
  const state = getStateByCode(stateCode);

  return {
    isValid: true,
    stateCode,
    stateName: state?.name || 'Unknown State',
    pan,
  };
}

export interface TaxCalculationParams {
  grossAmount: number;
  gstRate: number; // e.g. 18 for 18%
  isTaxInclusive?: boolean;
  supplierStateCode?: string;
  placeOfSupplyStateCode?: string;
}

export interface TaxBreakdown {
  taxableAmount: number;
  isIntraState: boolean;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTaxAmount: number;
  totalAmount: number;
}

export function calculateGST(params: TaxCalculationParams): TaxBreakdown {
  const {
    grossAmount,
    gstRate,
    isTaxInclusive = true,
    supplierStateCode = '19', // Default West Bengal
    placeOfSupplyStateCode = '19',
  } = params;

  const isIntraState = (supplierStateCode.padStart(2, '0') === placeOfSupplyStateCode.padStart(2, '0'));
  let taxableAmount = 0;
  let totalAmount = 0;

  if (isTaxInclusive) {
    // Reverse calculation: Taxable = Gross / (1 + Rate / 100)
    taxableAmount = Math.round((grossAmount / (1 + gstRate / 100)) * 100) / 100;
    totalAmount = grossAmount;
  } else {
    taxableAmount = grossAmount;
  }

  let cgstRate = 0;
  let cgstAmount = 0;
  let sgstRate = 0;
  let sgstAmount = 0;
  let igstRate = 0;
  let igstAmount = 0;

  if (isIntraState) {
    cgstRate = gstRate / 2;
    sgstRate = gstRate / 2;
    cgstAmount = Math.round((taxableAmount * (cgstRate / 100)) * 100) / 100;
    sgstAmount = Math.round((taxableAmount * (sgstRate / 100)) * 100) / 100;
  } else {
    igstRate = gstRate;
    igstAmount = Math.round((taxableAmount * (igstRate / 100)) * 100) / 100;
  }

  const totalTaxAmount = Math.round((cgstAmount + sgstAmount + igstAmount) * 100) / 100;

  if (!isTaxInclusive) {
    totalAmount = Math.round((taxableAmount + totalTaxAmount) * 100) / 100;
  }

  return {
    taxableAmount,
    isIntraState,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    totalTaxAmount,
    totalAmount,
  };
}

/**
 * Convert number into words following Indian numbering system (Lakhs, Crores)
 * Required for statutory Rule 46 invoices.
 */
export function numberToWordsINR(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Zero Rupees Only';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const twoDigits = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tensMultiple = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(num: number): string {
    if (num === 0) return '';
    if (num < 10) return singleDigits[num];
    if (num < 20) return twoDigits[num - 10];
    const tens = Math.floor(num / 10);
    const rest = num % 10;
    return tensMultiple[tens] + (rest > 0 ? ' ' + singleDigits[rest] : '');
  }

  function convertThreeDigits(num: number): string {
    const hundreds = Math.floor(num / 100);
    const rest = num % 100;
    let res = '';
    if (hundreds > 0) {
      res += singleDigits[hundreds] + ' Hundred';
      if (rest > 0) res += ' and ';
    }
    if (rest > 0) {
      res += convertTwoDigits(rest);
    }
    return res;
  }

  const rounded = Math.round(amount * 100) / 100;
  const rupeePart = Math.floor(rounded);
  const paisePart = Math.round((rounded - rupeePart) * 100);

  let n = rupeePart;
  const crores = Math.floor(n / 10000000);
  n %= 10000000;
  const lakhs = Math.floor(n / 100000);
  n %= 100000;
  const thousands = Math.floor(n / 1000);
  n %= 1000;
  const hundreds = n;

  const parts: string[] = [];
  if (crores > 0) parts.push(convertTwoDigits(crores) + ' Crore');
  if (lakhs > 0) parts.push(convertTwoDigits(lakhs) + ' Lakh');
  if (thousands > 0) parts.push(convertTwoDigits(thousands) + ' Thousand');
  if (hundreds > 0) parts.push(convertThreeDigits(hundreds));

  let words = 'Rupees ' + (parts.join(' ') || 'Zero');

  if (paisePart > 0) {
    words += ' and ' + convertTwoDigits(paisePart) + ' Paise';
  }

  words += ' Only';
  return words;
}
