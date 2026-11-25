import { REGIONAL_CEP_DIRECTORY } from '../constants/index.ts';
import { ValidationResult } from '../types/index.ts';

export function onlyDigits(value: string): string {
  return (value || '').replace(/\D/g, '');
}

/**
 * Formata valor numérico para moeda brasileira BRL (R$ 1.250,00)
 */
export function formatCurrencyBRL(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formata data ISO ou objeto Date para padrão brasileiro DD/MM/AAAA
 */
export function formatDateBR(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return '--/--/----';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(d);
}

/**
 * Formata data e hora para DD/MM/AAAA HH:mm (24h, America/Sao_Paulo)
 */
export function formatDateTimeBR(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return '--/--/---- --:--';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Sao_Paulo',
  }).format(d);
}

/**
 * Máscara de CPF: 000.000.000-00
 */
export function maskCPF(raw: string): string {
  const digits = onlyDigits(raw).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Validação matemática completa de CPF (dígitos verificadores + bloqueio de sequência repetida)
 */
export function validateCPF(raw: string): ValidationResult {
  const digits = onlyDigits(raw);
  const formatted = maskCPF(digits);

  if (!digits) {
    return { valid: false, formatted, error: 'Informe o CPF.' };
  }
  if (digits.length !== 11) {
    return { valid: false, formatted, error: 'O CPF deve conter 11 dígitos.' };
  }
  if (/^(\d)\1{10}$/.test(digits)) {
    return {
      valid: false,
      formatted,
      error: 'CPF inválido: sequência de dígitos repetidos não é permitida.',
    };
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i), 10) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits.charAt(9), 10)) {
    return { valid: false, formatted, error: 'CPF inválido: primeiro dígito verificador incorreto.' };
  }

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i), 10) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits.charAt(10), 10)) {
    return { valid: false, formatted, error: 'CPF inválido: segundo dígito verificador incorreto.' };
  }

  return { valid: true, formatted };
}

/**
 * Máscara de CNPJ: 00.000.000/0000-00
 */
export function maskCNPJ(raw: string): string {
  const digits = onlyDigits(raw).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Validação matemática completa de CNPJ (pesos módulo 11 + bloqueio de sequência)
 */
export function validateCNPJ(raw: string): ValidationResult {
  const digits = onlyDigits(raw);
  const formatted = maskCNPJ(digits);

  if (!digits) {
    return { valid: false, formatted, error: 'Informe o CNPJ da empresa.' };
  }
  if (digits.length !== 14) {
    return { valid: false, formatted, error: 'O CNPJ deve conter 14 dígitos.' };
  }
  if (/^(\d)\1{13}$/.test(digits)) {
    return {
      valid: false,
      formatted,
      error: 'CNPJ inválido: sequência repetida bloqueada.',
    };
  }

  const calcDigit = (slice: string, weights: number[]): number => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += parseInt(slice.charAt(i), 10) * weights[i];
    }
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const d1 = calcDigit(digits.slice(0, 12), weights1);
  if (d1 !== parseInt(digits.charAt(12), 10)) {
    return { valid: false, formatted, error: 'CNPJ inválido: dígitos verificadores não conferem.' };
  }

  const d2 = calcDigit(digits.slice(0, 13), weights2);
  if (d2 !== parseInt(digits.charAt(13), 10)) {
    return { valid: false, formatted, error: 'CNPJ inválido: dígitos verificadores não conferem.' };
  }

  return { valid: true, formatted };
}

/**
 * Máscara de CEP: 00000-000
 */
export function maskCEP(raw: string): string {
  const digits = onlyDigits(raw).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}

export function validateCEP(raw: string): ValidationResult {
  const digits = onlyDigits(raw);
  const formatted = maskCEP(digits);
  if (digits.length !== 8) {
    return { valid: false, formatted, error: 'O CEP deve conter 8 dígitos (00000-000).' };
  }
  if (/^(\d)\1{7}$/.test(digits)) {
    return { valid: false, formatted, error: 'CEP inválido.' };
  }
  return { valid: true, formatted };
}

/**
 * Consulta inteligente de CEP (Diretório local Manhuaçu + fallback ViaCEP seguro)
 */
export async function lookupCEP(rawCep: string): Promise<{
  found: boolean;
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  error?: string;
}> {
  const validation = validateCEP(rawCep);
  if (!validation.valid) {
    return {
      found: false,
      cep: validation.formatted,
      street: '',
      neighborhood: '',
      city: '',
      state: '',
      error: validation.error,
    };
  }

  const localMatch = REGIONAL_CEP_DIRECTORY[validation.formatted];
  if (localMatch) {
    return {
      found: true,
      cep: validation.formatted,
      ...localMatch,
    };
  }

  const digits = onlyDigits(rawCep);
  // Faixa de CEP de Manhuaçu - MG (36900-000 a 36904-999)
  if (digits.startsWith('3690')) {
    return {
      found: true,
      cep: validation.formatted,
      street: 'Via Urbana Manhuaçu',
      neighborhood: 'Centro',
      city: 'Manhuaçu',
      state: 'MG',
    };
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (res.ok) {
      const data = await res.json();
      if (!data.erro) {
        return {
          found: true,
          cep: validation.formatted,
          street: data.logradouro || '',
          neighborhood: data.bairro || 'Centro',
          city: data.localidade || 'Manhuaçu',
          state: data.uf || 'MG',
        };
      }
    }
  } catch {
    // Fallback offline silencioso
  }

  return {
    found: false,
    cep: validation.formatted,
    street: '',
    neighborhood: '',
    city: 'Manhuaçu',
    state: 'MG',
    error: 'CEP não localizado automaticamente. Preencha o logradouro manualmente.',
  };
}

/**
 * Máscara de Telefone Brasileiro: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export function maskPhoneBR(raw: string): string {
  const digits = onlyDigits(raw).slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35,
  37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64,
  65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88,
  89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

export function validatePhoneBR(raw: string): ValidationResult {
  const digits = onlyDigits(raw);
  const formatted = maskPhoneBR(digits);
  if (digits.length < 10 || digits.length > 11) {
    return {
      valid: false,
      formatted,
      error: 'Informe um telefone válido com DDD: (XX) XXXXX-XXXX.',
    };
  }
  const ddd = parseInt(digits.slice(0, 2), 10);
  if (!VALID_DDDS.has(ddd)) {
    return {
      valid: false,
      formatted,
      error: `DDD (${ddd}) inválido no Brasil.`,
    };
  }
  if (digits.length === 11 && digits.charAt(2) !== '9') {
    return {
      valid: false,
      formatted,
      error: 'Celulares de 11 dígitos devem iniciar com 9 após o DDD.',
    };
  }
  return { valid: true, formatted };
}

/**
 * Validação e normalização de E-mail
 */
export function validateEmail(raw: string): ValidationResult {
  const normalized = (raw || '').trim().toLowerCase();
  if (!normalized) {
    return { valid: false, formatted: '', error: 'Informe um endereço de e-mail.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(normalized)) {
    return {
      valid: false,
      formatted: normalized,
      error: 'Formato de e-mail inválido (exemplo: contato@empresa.com.br).',
    };
  }
  return { valid: true, formatted: normalized };
}

/**
 * Validação de data real no formato DD/MM/AAAA ou AAAA-MM-DD (com bloqueio opcional de data futura)
 */
export function validateDateBR(
  raw: string,
  options: { allowFuture?: boolean } = { allowFuture: false }
): ValidationResult {
  const trimmed = (raw || '').trim();
  if (!trimmed) {
    return { valid: false, formatted: '', error: 'Informe uma data válida.' };
  }

  let day = 0;
  let month = 0;
  let year = 0;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('/');
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parts = trimmed.split('-');
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else {
    return {
      valid: false,
      formatted: trimmed,
      error: 'Use o formato brasileiro DD/MM/AAAA.',
    };
  }

  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return { valid: false, formatted: trimmed, error: 'Data inexistente no calendário.' };
  }

  const constructed = new Date(year, month - 1, day);
  if (
    constructed.getFullYear() !== year ||
    constructed.getMonth() !== month - 1 ||
    constructed.getDate() !== day
  ) {
    return { valid: false, formatted: trimmed, error: 'Dia inválido para o mês informado.' };
  }

  const formatted = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;

  if (!options.allowFuture) {
    const now = new Date();
    if (constructed.getTime() > now.getTime() + 86400000) {
      return {
        valid: false,
        formatted,
        error: 'Não são permitidas datas futuras para este registro.',
      };
    }
  }

  return { valid: true, formatted };
}
