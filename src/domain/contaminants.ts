import { DomainError } from "./errors";

/**
 * Closed catalog of contaminant documentation types.
 * Explainers and index links are product copy. They are not measured results.
 */
export const contaminantDocumentationTypes = [
  {
    code: "HEAVY_METALS",
    name: "Heavy metals",
    explainer:
      "Heavy metals documentation is a supplier file reference for lead, cadmium, arsenic, or mercury, attached to one physical lot or one compliance profile. The Institute of Contaminant Standards publishes the Heavy Metal Index for this class. VLE stores the reference. It does not store a concentration, and it does not treat the file as a qualification result.",
    indexName: "Heavy Metal Index",
    indexUrl: "https://heavymetalindex.com",
  },
  {
    code: "PFAS",
    name: "PFAS / forever chemicals",
    explainer:
      "PFAS documentation is a supplier file reference for per- and polyfluoroalkyl substances, also called forever chemicals, attached to one physical lot or one compliance profile. The Institute of Contaminant Standards publishes the Forever Chemicals Index for this class. A file on record is not a measured value and does not list a lot.",
    indexName: "Forever Chemicals Index",
    indexUrl: "https://foreverchemicalsindex.com",
  },
  {
    code: "MICROPLASTICS",
    name: "Microplastics",
    explainer:
      "Microplastics documentation is a supplier file reference for plastic particles, attached to one physical lot or one compliance profile. The Institute of Contaminant Standards publishes the Microplastics Index for this class. VLE does not invent a particle count, a method, or a pass mark for this type.",
    indexName: "Microplastics Index",
    indexUrl: "https://microplasticsindex.com",
  },
] as const;

export type ContaminantDocumentationCode = (typeof contaminantDocumentationTypes)[number]["code"];

export const contaminantAttachmentSubjects = ["LOT", "PROFILE"] as const;
export type ContaminantAttachmentSubject = (typeof contaminantAttachmentSubjects)[number];

export type ContaminantAttachmentInput = {
  documentationType: ContaminantDocumentationCode;
  subject: ContaminantAttachmentSubject;
  physicalLotId?: string;
  complianceProfileId?: string;
  fileName: string;
  referenceUrl: string;
  documentDate?: Date;
  retestOn?: Date;
  notes?: string;
};

export function contaminantDocumentationType(code: string) {
  return contaminantDocumentationTypes.find((type) => type.code === code) ?? null;
}

export function assertContaminantAttachment(input: ContaminantAttachmentInput) {
  if (!contaminantDocumentationType(input.documentationType)) {
    throw new DomainError("Unknown contaminant documentation type", "INVALID_INPUT");
  }
  const hasLot = Boolean(input.physicalLotId);
  const hasProfile = Boolean(input.complianceProfileId);
  if (input.subject === "LOT" && (!hasLot || hasProfile)) {
    throw new DomainError("A lot document attaches to one physical lot", "INVALID_INPUT");
  }
  if (input.subject === "PROFILE" && (!hasProfile || hasLot)) {
    throw new DomainError("A profile document attaches to one compliance profile", "INVALID_INPUT");
  }
  const fileName = input.fileName.trim();
  if (!fileName || fileName.length > 180) {
    throw new DomainError("File name is required", "INVALID_INPUT");
  }
  let url: URL;
  try {
    url = new URL(input.referenceUrl);
  } catch {
    throw new DomainError("Reference must be an https URL", "INVALID_INPUT");
  }
  if (url.protocol !== "https:") {
    throw new DomainError("Reference must be an https URL", "INVALID_INPUT");
  }
  if (input.notes && input.notes.trim().length > 1000) {
    throw new DomainError("Notes are too long", "INVALID_INPUT");
  }
}
