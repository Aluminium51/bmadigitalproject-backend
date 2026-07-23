// src/modules/proposals/proposal.schema.ts
import { z } from "@hono/zod-openapi";

// ---------------------------------------------------------------------------
// Draft Schema (Loose) — สำหรับ Auto-Save
// อนุญาตให้ฟิลด์ทุกฟิลด์เป็น Optional เพราะผู้ใช้อาจกรอกไม่ครบ
// ---------------------------------------------------------------------------
export const draftProposalSchema = z.object({
  projectId: z.string().uuid().optional(),
  currentStep: z.coerce.number().optional(),
  draftPayload: z.any().optional().openapi({
      type: 'object',
      description: 'ข้อมูลฟอร์มแบบร่างทั้งหมด (JSON)'
  }),

  // service (upsertDraft)
  projectName: z.string().optional(),
  objective: z.string().optional(),
  totalBudget: z.coerce.number().optional(),
}).partial().openapi('DraftProposalRequest', {
  description: 'Schema สำหรับข้อมูลแบบร่างโครงการ (Auto-Save)'
});

// ---------------------------------------------------------------------------
// Submit Schema (Strict) — สำหรับยื่นเสนอโครงการ (Final Submission)
// บังคับกรอกฟิลด์หลักทั้งหมด ก่อนอนุญาตให้ Insert ลงตาราง proposals
// ---------------------------------------------------------------------------

const budgetByYearSchema = z.object({
  id: z.string().uuid().optional(),
  year: z.coerce.number().int().min(2500).max(2600),
  amount: z.coerce.number().min(1),
  budgetType: z.string().min(1),
});

const relatedProjectSchema = z.object({
  id: z.string().uuid().optional(),
  projectName: z.string().min(1),
  agency: z.string().min(1),
  fiscalYear: z.string().min(4),
  relationType: z.string().min(1),
  remark: z.string().optional(),
});

const manpowerSchema = z.object({
  id: z.string().uuid().optional(),
  agencyPart: z.string().min(1),
  positionLimit: z.coerce.number(),
  occupied: z.coerce.number(),
  vacant: z.coerce.number(),
});

const existingEquipmentSchema = z.object({
  id: z.string().uuid().optional(),
  itemName: z.string().min(1),
  ageYears: z.coerce.number(),
  quantity: z.coerce.number(),
  user: z.string().min(1),
  location: z.string().min(1),
  remark: z.string().optional(),
});

const hardwareCostSchema = z.object({
  id: z.string().uuid().optional(),
  itemName: z.string().min(1),
  quantity: z.coerce.number().min(1),
  unitPrice: z.coerce.number().min(0),
  referenceType: z.enum(["MDES", "MARKET", "PREVIOUS", "OTHER"]),
  mdesMonth: z.string().optional(),
  mdesYear: z.string().optional(),
  mdesItemNo: z.string().optional(),
  marketCount: z.coerce.number().optional(),
  marketCompany: z.string().optional(),
  prevProject: z.string().optional(),
  prevYear: z.string().optional(),
  otherDetail: z.string().optional(),
});

const softwareCostSchema = z.object({
  id: z.string().uuid().optional(),
  itemName: z.string().min(1),
  quantity: z.coerce.number().min(1),
  unitPrice: z.coerce.number().min(0),
  referenceType: z.enum(["MDES", "MARKET", "PREVIOUS", "OTHER"]),
  mdesMonth: z.string().optional(),
  mdesYear: z.string().optional(),
  mdesItemNo: z.string().optional(),
  marketCount: z.coerce.number().optional(),
  marketCompany: z.string().optional(),
  prevProject: z.string().optional(),
  prevYear: z.string().optional(),
  otherDetail: z.string().optional(),
});

const personnelCostSchema = z.object({
  id: z.string().uuid().optional(),
  personnelType: z.enum(["CORE", "ASST", "SUPP"]),
  position: z.string().min(1),
  degree: z.string().min(1),
  fieldOfStudy: z.string().optional(),
  experienceYears: z.coerce.number().min(0),
  baseSalary: z.coerce.number().min(1),
  multiplier: z.coerce.number().optional(),
  personCount: z.coerce.number().min(1),
  durationMonths: z.coerce.number().min(1),
});

const personnelResponsibilitySchema = z.object({
  id: z.string().uuid().optional(),
  position: z.string(),
  responsibility: z.string().min(1),
});

const speakerCostSchema = z.object({
  id: z.string().uuid().optional(),
  itemName: z.string().min(1),
  hours: z.coerce.number().min(1),
  ratePerHour: z.coerce.number().min(0),
  days: z.coerce.number().min(1),
});

const foodCostSchema = z.object({
  id: z.string().uuid().optional(),
  itemName: z.enum(["PARTIAL_MEAL", "FULL_MEAL", "SNACK", "OTHER"]),
  mealsCount: z.coerce.number().min(0),
  ratePerMeal: z.coerce.number().min(0),
  traineesCount: z.coerce.number().min(0),
  days: z.coerce.number().min(0),
});

const trainingCourseSchema = z.object({
  id: z.string().uuid().optional(),
  courseName: z.string().min(1),
  trainingMethod: z.string().min(1),
  locationType: z.enum(["GOVERNMENT", "PRIVATE"]),
  hasSpeakerCost: z.boolean().default(false),
  speakerReason: z.string().optional(),
  speakerCosts: z.array(speakerCostSchema).default([]),
  foodCosts: z.array(foodCostSchema).default([]),
});

const otherCostSchema = z.object({
  id: z.string().uuid().optional(),
  itemName: z.string().min(1),
  quantity: z.coerce.number().min(1),
  unitPrice: z.coerce.number().min(0),
  remark: z.string().optional(),
  costType: z.enum(["IT", "NON_IT"]),
});

const vmRequirementSchema = z.object({
  id: z.string().uuid().optional(),
  vmDescription: z.string().min(1),
  osDatabase: z.string().min(1),
  vcpu: z.coerce.number().min(0),
  ramGb: z.coerce.number().min(0),
  gpuGb: z.coerce.number().min(0),
  storageGb: z.coerce.number().min(0),
  price: z.coerce.number().min(0),
});

const cloudRequestSchema = z.object({
  id: z.string().uuid().optional(),
  systemName: z.string().min(1),
  requestedServiceDate: z.coerce.date(),
  recordedRequestDate: z.coerce.date(),
  vms: z.array(vmRequirementSchema).default([]),
});

const ictPersonnelSchema = z.object({
  id: z.string().uuid().optional(),
  position: z.string().min(1),
  level: z.string().min(1),
  count: z.coerce.number().min(1),
});

export const submitProposalSchema = z.object({
  // Step 1: ข้อมูลเบื้องต้น
  projectName: z.string().min(5),
  agencyName: z.string().min(2),
  headOfAgency: z.string().min(2),
  dcioName: z.string().min(2),
  projectManager: z.string().min(2),
  totalBudget: z.coerce.number().min(1),
  budgetsByYear: z.array(budgetByYearSchema).default([]),

  // Step 2: สาระสำคัญและขอบเขตโครงการ
  background: z.string().min(10),
  objective: z.string().min(10),
  target: z.string().min(10),
  scope: z.string().min(10),
  projectType: z.enum(["NEW", "REPLACEMENT", "CONTINUOUS"]),
  currentSystemStatus: z.string().min(5),
  currentProblems: z.string().min(5),
  relatedProjects: z.array(relatedProjectSchema).default([]),
  manpower: z.array(manpowerSchema).default([]),
  existingEquipment: z.array(existingEquipmentSchema).default([]),

  // Step 3: สถาปัตยกรรมองค์กร
  isBmaPlan: z.boolean().default(false),
  isAgencyPlan: z.boolean().default(false),
  agencyStrategy: z.string().optional(),
  agencyIssue: z.string().optional(),
  agencyKpi: z.string().optional(),
  isGovernorPolicy: z.boolean().default(false),
  governorPolicyCode: z.string().optional(),
  governorPolicyName: z.string().optional(),
  obstacleLaws: z.string().optional(),
  appArchitecture: z.string().min(5),
  dataOwner: z.string().min(2),
  dataExchangePlan: z.string().min(5),

  // Step 4: งบประมาณ
  hardwareCosts: z.array(hardwareCostSchema).default([]),
  softwareCosts: z.array(softwareCostSchema).default([]),
  personnelCoreCosts: z.array(personnelCostSchema).default([]),
  personnelAsstCosts: z.array(personnelCostSchema).default([]),
  personnelSuppCosts: z.array(personnelCostSchema).default([]),
  personnelResponsibilities: z.array(personnelResponsibilitySchema).default([]),
  trainingCourses: z.array(trainingCourseSchema).default([]),
  otherCosts: z.array(otherCostSchema).default([]),

  // Step 5: ความพร้อม
  durationDays: z.coerce.number().min(1),
  ictPersonnel: z.array(ictPersonnelSchema).default([]),
  cloudRequests: z.array(cloudRequestSchema).default([]),
  otherReadiness: z.string().optional(),
  expectedBenefits: z.string().min(1),
  isInRoadmap: z.boolean(),
}).openapi("SubmitProposalRequest");

export const submittedProposalPatchSchema = submitProposalSchema
  .partial()
  .openapi("SubmittedProposalPatchRequest", {
    description: "Partial update for a submitted proposal by an authorized Secretary",
  });

// Keep the old schema name as an alias for backward compatibility
export const upsertProposalSchema = draftProposalSchema;

export const ProposalProjectParamsSchema = z.object({
  projectId: z.string().uuid().openapi({
    example: "018f3a3b-1b2c-7d3e-8f4b-5c6d7e8f9a0b",
    description: "Project UUID",
  }),
}).openapi("ProposalProjectParams");

export type DraftProposalDTO = z.infer<typeof draftProposalSchema>;
export type SubmitProposalDTO = z.infer<typeof submitProposalSchema>;
export type SubmittedProposalPatchDTO = z.infer<typeof submittedProposalPatchSchema>;
