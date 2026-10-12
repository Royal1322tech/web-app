export const documentPolicy = {
  maxBytes: 10 * 1024 * 1024,
  formats: [
    { extensions: ["pdf"], mimeType: "application/pdf" },
    { extensions: ["jpg", "jpeg"], mimeType: "image/jpeg" },
    { extensions: ["png"], mimeType: "image/png" },
  ],
} as const;

export const documentAccept = documentPolicy.formats
  .flatMap(({ extensions }) => extensions.map((extension) => `.${extension}`))
  .join(",");

export const documentHelp = `PDF, JPG/JPEG or PNG. Maximum ${documentPolicy.maxBytes / (1024 * 1024)} MB per file.`;

export const registrationDocuments = [
  { name: "commercialRegistration", label: "Commercial Registration" },
  { name: "tourismLicence", label: "Tourism Licence" },
  { name: "taxCertificate", label: "Tax Certificate" },
] as const;

export type DocumentName = (typeof registrationDocuments)[number]["name"];
