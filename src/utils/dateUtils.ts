import { format, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { utcToZonedTime } from 'date-fns-tz';

// Usa o fuso horário do navegador como padrão
const DEFAULT_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Converte e formata uma data para o fuso horário desejado.
 * @param dateInput Data em string ISO, Date ou timestamp
 * @param formatStr Padrão de formatação (default: "dd/MM/yyyy HH:mm")
 * @param timeZone Fuso horário IANA (ex: "America/Sao_Paulo", "Europe/Lisbon")
 */
export function safeFormatDate(
  dateInput: Date | string | number | null | undefined,
  formatStr: string = 'dd/MM/yyyy HH:mm',
  timeZone: string = DEFAULT_TZ
): string {
  if (!dateInput) return '';

  let dateObj: Date;
  if (dateInput instanceof Date) {
    dateObj = dateInput;
  } else if (typeof dateInput === 'string') {
    dateObj = parseISO(dateInput);
  } else {
    dateObj = new Date(dateInput);
  }

  if (!isValid(dateObj)) return '';

  // Converte UTC para o fuso horário desejado
  const zonedDate = utcToZonedTime(dateObj, timeZone);

  return format(zonedDate, formatStr, { locale: ptBR });
}

/**
 * Retorna a data/hora atual no fuso horário desejado.
 * @param timeZone Fuso horário IANA (default: timezone do navegador)
 */
export function getNow(timeZone: string = DEFAULT_TZ): Date {
  const now = new Date();
  return utcToZonedTime(now, timeZone);
}
