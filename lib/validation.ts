/**
 * Input Validation Utilities
 * Provides comprehensive validation for forms and user inputs
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Email validation
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: "Email is required" };
  }

  const trimmedEmail = email.trim();

  if (trimmedEmail.length < 3) {
    return { isValid: false, error: "Email is too short" };
  }

  if (trimmedEmail.length > 254) {
    return { isValid: false, error: "Email is too long" };
  }

  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }

  // Check for common typos
  const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  const domain = trimmedEmail.split('@')[1]?.toLowerCase();
  const suspiciousDomains = ['gmial.com', 'gmai.com', 'yahooo.com', 'hotmial.com'];
  
  if (domain && suspiciousDomains.includes(domain)) {
    return { isValid: false, error: "Please check your email address for typos" };
  }

  return { isValid: true };
}

/**
 * Phone number validation (Myanmar format)
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone || phone.trim().length === 0) {
    return { isValid: false, error: "Phone number is required" };
  }

  const trimmedPhone = phone.trim();

  // Remove spaces, dashes, and parentheses
  const cleanPhone = trimmedPhone.replace(/[\s\-()]/g, '');

  // Myanmar phone format: 09xxxxxxxxx (11 digits starting with 09)
  const myanmarPhoneRegex = /^(09|\+?959)\d{7,9}$/;

  if (!myanmarPhoneRegex.test(cleanPhone)) {
    return { isValid: false, error: "Please enter a valid Myanmar phone number (e.g., 09xxxxxxxxx)" };
  }

  if (cleanPhone.length < 9) {
    return { isValid: false, error: "Phone number is too short" };
  }

  if (cleanPhone.length > 15) {
    return { isValid: false, error: "Phone number is too long" };
  }

  return { isValid: true };
}

/**
 * Name validation
 */
export function validateName(name: string, fieldName: string = "Name"): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  const trimmedName = name.trim();

  if (trimmedName.length < 2) {
    return { isValid: false, error: `${fieldName} must be at least 2 characters` };
  }

  if (trimmedName.length > 100) {
    return { isValid: false, error: `${fieldName} is too long (max 100 characters)` };
  }

  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  
  if (!nameRegex.test(trimmedName)) {
    return { isValid: false, error: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` };
  }

  return { isValid: true };
}

/**
 * Address validation
 */
export function validateAddress(address: string): ValidationResult {
  if (!address || address.trim().length === 0) {
    return { isValid: false, error: "Address is required" };
  }

  const trimmedAddress = address.trim();

  if (trimmedAddress.length < 10) {
    return { isValid: false, error: "Please enter a complete address (at least 10 characters)" };
  }

  if (trimmedAddress.length > 500) {
    return { isValid: false, error: "Address is too long (max 500 characters)" };
  }

  return { isValid: true };
}

/**
 * City validation
 */
export function validateCity(city: string): ValidationResult {
  if (!city || city.trim().length === 0) {
    return { isValid: false, error: "City is required" };
  }

  const trimmedCity = city.trim();

  if (trimmedCity.length < 2) {
    return { isValid: false, error: "City name is too short" };
  }

  if (trimmedCity.length > 100) {
    return { isValid: false, error: "City name is too long" };
  }

  return { isValid: true };
}

/**
 * Message/Text validation
 */
export function validateMessage(message: string, minLength: number = 10, maxLength: number = 5000): ValidationResult {
  if (!message || message.trim().length === 0) {
    return { isValid: false, error: "Message is required" };
  }

  const trimmedMessage = message.trim();

  if (trimmedMessage.length < minLength) {
    return { isValid: false, error: `Message must be at least ${minLength} characters` };
  }

  if (trimmedMessage.length > maxLength) {
    return { isValid: false, error: `Message is too long (max ${maxLength} characters)` };
  }

  return { isValid: true };
}

/**
 * Subject validation
 */
export function validateSubject(subject: string): ValidationResult {
  if (!subject || subject.trim().length === 0) {
    return { isValid: false, error: "Subject is required" };
  }

  const trimmedSubject = subject.trim();

  if (trimmedSubject.length < 3) {
    return { isValid: false, error: "Subject must be at least 3 characters" };
  }

  if (trimmedSubject.length > 200) {
    return { isValid: false, error: "Subject is too long (max 200 characters)" };
  }

  return { isValid: true };
}

/**
 * Password validation
 */
export function validatePassword(password: string): ValidationResult {
  if (!password || password.length === 0) {
    return { isValid: false, error: "Password is required" };
  }

  if (password.length < 8) {
    return { isValid: false, error: "Password must be at least 8 characters" };
  }

  if (password.length > 128) {
    return { isValid: false, error: "Password is too long (max 128 characters)" };
  }

  // Check for at least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return { isValid: false, error: "Password must contain at least one letter and one number" };
  }

  return { isValid: true };
}

/**
 * Product name validation
 */
export function validateProductName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: "Product name is required" };
  }

  const trimmedName = name.trim();

  if (trimmedName.length < 2) {
    return { isValid: false, error: "Product name must be at least 2 characters" };
  }

  if (trimmedName.length > 200) {
    return { isValid: false, error: "Product name is too long (max 200 characters)" };
  }

  return { isValid: true };
}

/**
 * Price validation
 */
export function validatePrice(price: number | string): ValidationResult {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;

  if (isNaN(numPrice)) {
    return { isValid: false, error: "Please enter a valid price" };
  }

  if (numPrice < 0) {
    return { isValid: false, error: "Price cannot be negative" };
  }

  if (numPrice > 10000000) {
    return { isValid: false, error: "Price is too high" };
  }

  return { isValid: true };
}

/**
 * Stock validation
 */
export function validateStock(stock: number | string): ValidationResult {
  const numStock = typeof stock === 'string' ? parseInt(stock, 10) : stock;

  if (isNaN(numStock)) {
    return { isValid: false, error: "Please enter a valid stock quantity" };
  }

  if (numStock < 0) {
    return { isValid: false, error: "Stock cannot be negative" };
  }

  if (numStock > 100000) {
    return { isValid: false, error: "Stock quantity is too high" };
  }

  if (!Number.isInteger(numStock)) {
    return { isValid: false, error: "Stock must be a whole number" };
  }

  return { isValid: true };
}

/**
 * URL validation
 */
export function validateUrl(url: string, required: boolean = false): ValidationResult {
  if (!url || url.trim().length === 0) {
    if (required) {
      return { isValid: false, error: "URL is required" };
    }
    return { isValid: true };
  }

  const trimmedUrl = url.trim();

  try {
    new URL(trimmedUrl);
    return { isValid: true };
  } catch {
    return { isValid: false, error: "Please enter a valid URL" };
  }
}

/**
 * Sanitize input (remove potentially dangerous characters)
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and > to prevent XSS
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

/**
 * Validate file upload
 */
export function validateFile(
  file: File,
  allowedTypes: string[],
  maxSizeMB: number = 5
): ValidationResult {
  if (!file) {
    return { isValid: false, error: "Please select a file" };
  }

  // Check file type
  const fileType = file.type;
  if (!allowedTypes.includes(fileType)) {
    return { 
      isValid: false, 
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` 
    };
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return { 
      isValid: false, 
      error: `File is too large. Maximum size: ${maxSizeMB}MB` 
    };
  }

  return { isValid: true };
}

/**
 * Validate image file
 */
export function validateImageFile(file: File, maxSizeMB: number = 5): ValidationResult {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  return validateFile(file, allowedTypes, maxSizeMB);
}
