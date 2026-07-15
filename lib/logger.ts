type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogMeta = Record<string, unknown>

const isBrowser = typeof window !== 'undefined'
const isDev = !isBrowser && process?.env?.NODE_ENV !== 'production'

function formatLevel(level: LogLevel): string {
  return level.toUpperCase().padEnd(5)
}

function safeStringify(input: unknown): string {
  try {
    return typeof input === 'string' ? input : JSON.stringify(input)
  } catch {
    return String(input)
  }
}

function emit(level: LogLevel, message: string, meta?: LogMeta): void {
  if (!isDev && level === 'debug') return

  const line = meta ? `${message} ${safeStringify(meta)}` : message

  if (level === 'error') {
    console.error(line)
  } else if (level === 'warn') {
    console.warn(line)
  } else if (level === 'info') {
    console.info(line)
  } else {
    console.log(line)
  }
}

export const logger = {
  debug: (message: string, meta?: LogMeta) => emit('debug', message, meta),
  info: (message: string, meta?: LogMeta) => emit('info', message, meta),
  warn: (message: string, meta?: LogMeta) => emit('warn', message, meta),
  error: (message: string, meta?: LogMeta) => emit('error', message, meta),
}
