const FORMAT_VERSION = "ZSM1";
const PBKDF2_ITERATIONS = 600_000;
const PASSPHRASE_MIN_LENGTH = 12;
const SALT_LENGTH_BYTES = 16;
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BITS = 128;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });
const formatHeader = textEncoder.encode(FORMAT_VERSION);

const elements = {
  browserWarning: document.querySelector("#browser-warning"),
  encryptForm: document.querySelector("#encrypt-form"),
  plainText: document.querySelector("#plain-text"),
  encryptPassphrase: document.querySelector("#encrypt-passphrase"),
  encryptedText: document.querySelector("#encrypted-text"),
  encryptStatus: document.querySelector("#encrypt-status"),
  copyButton: document.querySelector("#copy-button"),
  decryptForm: document.querySelector("#decrypt-form"),
  encryptedInput: document.querySelector("#encrypted-input"),
  decryptPassphrase: document.querySelector("#decrypt-passphrase"),
  plainResult: document.querySelector("#plain-result"),
  decryptStatus: document.querySelector("#decrypt-status"),
  pasteButton: document.querySelector("#paste-button"),
};

function setStatus(element, message, state = "") {
  element.textContent = message;

  if (state) {
    element.dataset.state = state;
  } else {
    delete element.dataset.state;
  }
}

function getSecureCrypto() {
  if (!window.isSecureContext || !window.crypto?.subtle) {
    throw new Error("Secure Web Crypto is not available in this browser context.");
  }

  return window.crypto;
}

function encodeBase64Url(bytes) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let start = 0; start < bytes.length; start += chunkSize) {
    const chunk = bytes.subarray(start, start + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function decodeBase64Url(value) {
  if (!/^[A-Za-z0-9_-]+$/u.test(value) || value.length % 4 === 1) {
    throw new Error("Invalid Base64 URL value.");
  }

  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const paddingLength = (4 - (base64.length % 4)) % 4;
  const binary = atob(base64 + "=".repeat(paddingLength));
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function deriveAesKey(passphrase, salt, usage) {
  const cryptoApi = getSecureCrypto();
  const passphraseBytes = textEncoder.encode(passphrase);
  const keyMaterial = await cryptoApi.subtle.importKey(
    "raw",
    passphraseBytes,
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return cryptoApi.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    [usage],
  );
}

async function encryptText(plainText, passphrase) {
  const cryptoApi = getSecureCrypto();
  const salt = cryptoApi.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
  const iv = cryptoApi.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const key = await deriveAesKey(passphrase, salt, "encrypt");
  const encryptedBytes = await cryptoApi.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: formatHeader,
      tagLength: AUTH_TAG_LENGTH_BITS,
    },
    key,
    textEncoder.encode(plainText),
  );

  return [
    FORMAT_VERSION,
    encodeBase64Url(salt),
    encodeBase64Url(iv),
    encodeBase64Url(new Uint8Array(encryptedBytes)),
  ].join(".");
}

function parseEncryptedEnvelope(encryptedText) {
  const parts = encryptedText.split(".");

  if (parts.length !== 4 || parts[0] !== FORMAT_VERSION) {
    throw new Error("Unsupported encrypted text format.");
  }

  const salt = decodeBase64Url(parts[1]);
  const iv = decodeBase64Url(parts[2]);
  const ciphertext = decodeBase64Url(parts[3]);

  if (
    salt.length !== SALT_LENGTH_BYTES ||
    iv.length !== IV_LENGTH_BYTES ||
    ciphertext.length < AUTH_TAG_LENGTH_BITS / 8
  ) {
    throw new Error("Invalid encrypted text envelope.");
  }

  return { salt, iv, ciphertext };
}

async function decryptText(encryptedText, passphrase) {
  const cryptoApi = getSecureCrypto();
  const { salt, iv, ciphertext } = parseEncryptedEnvelope(encryptedText);
  const key = await deriveAesKey(passphrase, salt, "decrypt");
  const plainBytes = await cryptoApi.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: formatHeader,
      tagLength: AUTH_TAG_LENGTH_BITS,
    },
    key,
    ciphertext,
  );

  return textDecoder.decode(plainBytes);
}

function decodeLegacyBase64(value) {
  const normalized = value.replace(/\s/gu, "");
  const isBase64 =
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(
      normalized,
    );

  if (!normalized || !isBase64) {
    throw new Error("Invalid legacy Base64 text.");
  }

  return atob(normalized);
}

function decryptLegacyText(encryptedText, passphrase) {
  if (!passphrase) {
    throw new Error("A legacy passphrase is required.");
  }

  const supportsLegacyPassphrase = Array.from(passphrase).every((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint >= 32 && codePoint <= 126;
  });

  if (!supportsLegacyPassphrase) {
    throw new Error("Legacy passphrases must use printable ASCII characters.");
  }

  const decodedText = decodeLegacyBase64(encryptedText);
  let plainText = "";

  for (let index = 0; index < decodedText.length; index += 1) {
    const encryptedCode = decodedText.charCodeAt(index);
    const passphraseCode = passphrase.charCodeAt(index % passphrase.length);
    plainText += String.fromCharCode(encryptedCode - passphraseCode);
  }

  return plainText;
}

function setButtonBusy(button, isBusy, busyLabel, defaultLabel) {
  button.disabled = isBusy;
  button.textContent = isBusy ? busyLabel : defaultLabel;
}

function setFormDisabled(form, isDisabled) {
  for (const control of form.elements) {
    control.disabled = isDisabled;
  }
}

function clearEncryptionResult() {
  elements.encryptedText.value = "";
  elements.copyButton.disabled = true;
  setStatus(elements.encryptStatus, "");
}

function clearDecryptionResult() {
  elements.plainResult.value = "";
  setStatus(elements.decryptStatus, "");
}

async function handleEncryptSubmit(event) {
  event.preventDefault();
  clearEncryptionResult();

  const plainText = elements.plainText.value;
  const passphrase = elements.encryptPassphrase.value;
  const submitButton =
    event.submitter ?? event.currentTarget.querySelector('button[type="submit"]');

  if (Array.from(passphrase).length < PASSPHRASE_MIN_LENGTH) {
    setStatus(
      elements.encryptStatus,
      `Frasa sandi perlu minimal ${PASSPHRASE_MIN_LENGTH} karakter.`,
      "error",
    );
    return;
  }

  setFormDisabled(elements.encryptForm, true);
  setButtonBusy(submitButton, true, "Sedang mengenkripsi…", "Enkripsi teks");

  try {
    elements.encryptedText.value = await encryptText(plainText, passphrase);
    elements.copyButton.disabled = false;
    setStatus(
      elements.encryptStatus,
      "Enkripsi berhasil. Simpan hasil dan frasa sandi dengan aman.",
      "success",
    );
  } catch {
    setStatus(
      elements.encryptStatus,
      "Enkripsi gagal. Buka aplikasi melalui HTTPS atau localhost, lalu coba lagi.",
      "error",
    );
  } finally {
    setFormDisabled(elements.encryptForm, false);
    setButtonBusy(submitButton, false, "Sedang mengenkripsi…", "Enkripsi teks");
  }
}

async function handleDecryptSubmit(event) {
  event.preventDefault();
  clearDecryptionResult();

  const encryptedText = elements.encryptedInput.value.trim();
  const passphrase = elements.decryptPassphrase.value;
  const submitButton =
    event.submitter ?? event.currentTarget.querySelector('button[type="submit"]');
  const usesCurrentFormat = encryptedText.startsWith(`${FORMAT_VERSION}.`);

  setFormDisabled(elements.decryptForm, true);
  setButtonBusy(submitButton, true, "Sedang mendekripsi…", "Dekripsi teks");

  try {
    if (usesCurrentFormat) {
      elements.plainResult.value = await decryptText(encryptedText, passphrase);
      setStatus(elements.decryptStatus, "Dekripsi berhasil.", "success");
    } else {
      elements.plainResult.value = decryptLegacyText(encryptedText, passphrase);
      setStatus(
        elements.decryptStatus,
        "Hasil format lama dibuka. Format ini tidak memeriksa frasa sandi atau perubahan data; segera enkripsi ulang untuk membuat hasil baru.",
        "warning",
      );
    }
  } catch {
    setStatus(
      elements.decryptStatus,
      "Dekripsi gagal. Periksa frasa sandi dan pastikan teks terenkripsi tidak berubah.",
      "error",
    );
  } finally {
    setFormDisabled(elements.decryptForm, false);
    setButtonBusy(submitButton, false, "Sedang mendekripsi…", "Dekripsi teks");
  }
}

async function copyEncryptedText() {
  if (!elements.encryptedText.value) {
    return;
  }

  try {
    await navigator.clipboard.writeText(elements.encryptedText.value);
    setStatus(elements.encryptStatus, "Hasil berhasil disalin.", "success");
  } catch {
    setStatus(
      elements.encryptStatus,
      "Clipboard tidak tersedia. Pilih dan salin hasil secara manual.",
      "error",
    );
  }
}

async function pasteEncryptedText() {
  try {
    elements.encryptedInput.value = await navigator.clipboard.readText();
    clearDecryptionResult();
    setStatus(elements.decryptStatus, "Teks berhasil ditempel.", "success");
  } catch {
    setStatus(
      elements.decryptStatus,
      "Clipboard tidak tersedia. Tempel teks secara manual.",
      "error",
    );
  }
}

function showBrowserRequirements() {
  const supportsWebCrypto = window.isSecureContext && window.crypto?.subtle;
  elements.browserWarning.hidden = Boolean(supportsWebCrypto);
}

elements.encryptForm.addEventListener("submit", handleEncryptSubmit);
elements.decryptForm.addEventListener("submit", handleDecryptSubmit);
elements.copyButton.addEventListener("click", copyEncryptedText);
elements.pasteButton.addEventListener("click", pasteEncryptedText);

elements.plainText.addEventListener("input", clearEncryptionResult);
elements.encryptPassphrase.addEventListener("input", clearEncryptionResult);
elements.encryptedInput.addEventListener("input", clearDecryptionResult);
elements.decryptPassphrase.addEventListener("input", clearDecryptionResult);

showBrowserRequirements();
