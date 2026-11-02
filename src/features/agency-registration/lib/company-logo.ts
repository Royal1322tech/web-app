export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const logoAccept = "image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp";

export const logoRequired = "Company logo is required.";
export const logoUnsupported = "Unsupported file type. Upload a PNG, JPG or WEBP image.";
export const logoTooLarge = "This file is larger than 2MB. Upload a smaller logo.";
export const logoEmpty = "This file is empty. Select a different logo.";
export const logoUnreadable = "This file is not a valid image. Upload a PNG, JPG or WEBP image.";

const allowedTypes: readonly string[] = ["image/png", "image/jpeg", "image/webp"];

/** Checks that need no file reading. The registration schema uses these on every step. */
export function logoFileIssue(file: File | null | undefined): string | undefined {
  if (!file) return logoRequired;
  if (file.type && !allowedTypes.includes(file.type)) return logoUnsupported;
  if (file.size > LOGO_MAX_BYTES) return logoTooLarge;
  if (file.size === 0) return logoEmpty;
  return undefined;
}

/** Identifies the format from the file's own leading bytes, whatever its name or stated type. */
export function detectLogoFormat(bytes: Uint8Array): "png" | "jpeg" | "webp" | undefined {
  const matches = (signature: readonly number[], offset = 0) => signature.every((value, index) => bytes[offset + index] === value);
  if (matches([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (matches([0xff, 0xd8, 0xff])) return "jpeg";
  if (matches([0x52, 0x49, 0x46, 0x46]) && matches([0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  return undefined;
}

/**
 * Full check of a selected file, run before it enters the form: the rules above, then its real
 * content, then whether the browser can decode it. Returns the problem, or undefined when valid.
 * The file stays in this browser; nothing is uploaded.
 */
export async function inspectLogoFile(file: File): Promise<string | undefined> {
  const issue = logoFileIssue(file);
  if (issue) return issue;
  try {
    if (!detectLogoFormat(new Uint8Array(await file.slice(0, 12).arrayBuffer()))) return logoUnreadable;
    (await createImageBitmap(file)).close();
    return undefined;
  } catch {
    return logoUnreadable;
  }
}
