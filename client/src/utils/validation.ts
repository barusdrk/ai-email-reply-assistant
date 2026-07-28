const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(
  email: string
): string | null {
  const value = email.trim();

  if (!value) {
    return "Email is required.";
  }

  if (!EMAIL_REGEX.test(value)) {
    return "Please enter a valid email address.";
  }

  return null;
}

export function validatePassword(
  password: string
): string | null {
  if (!password) {
    return "Password is required.";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  return null;
}

export function validateConfirmPassword(
  password: string,
  confirmPassword: string
): string | null {
  if (!confirmPassword) {
    return "Please confirm your password.";
  }

  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }

  return null;
}

export function validateReply(
  reply: string
): string | null {
  if (!reply.trim()) {
    return "Reply cannot be empty.";
  }

  if (reply.length < 20) {
    return "Reply is too short.";
  }

  return null;
}

export function validateSignature(
  signature: string
): string | null {
  if (!signature.trim()) {
    return "Signature is required.";
  }

  if (signature.length > 100) {
    return "Signature must be under 100 characters.";
  }

  return null;
}

export function validateRequired(
  value: string,
  fieldName: string
): string | null {
  if (!value.trim()) {
    return `${fieldName} is required.`;
  }

  return null;
}

export function validateMinLength(
  value: string,
  minLength: number,
  fieldName: string
): string | null {
  if (value.trim().length < minLength) {
    return `${fieldName} must be at least ${minLength} characters.`;
  }

  return null;
}

export function validateMaxLength(
  value: string,
  maxLength: number,
  fieldName: string
): string | null {
  if (value.length > maxLength) {
    return `${fieldName} must be less than ${maxLength} characters.`;
  }

  return null;
}
