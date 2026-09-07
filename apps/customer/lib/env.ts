function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function turnstileSecretKey(): string {
  return requireEnv("TURNSTILE_SECRET_KEY");
}

export function whatsappPhoneNumber(): string {
  return requireEnv("WHATSAPP_PHONE_NUMBER");
}
