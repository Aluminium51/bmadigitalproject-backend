// src/db/schema/proposals.ts
import { 
  pgTable, 
  text, 
  varchar, 
  integer, 
  numeric, 
  boolean, 
  timestamp, 
  jsonb, 
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { projects } from "./projects";
// ---------------------------------------------------------------------------
// ENUMS
// ---------------------------------------------------------------------------
export const projectTypeEnum = pgEnum("project_type", ["จัดหาใหม่", "ทดแทนระบบเดิม", "โครงการต่อเนื่อง"]);

// Workflow Status
export const proposalStatusEnum = pgEnum("proposal_status", [
  "draft", "submitted", "passed_1", "rejected_1", "fix_1", 
  "admin_assigned", "passed_2", "rejected_2", "fix_2", 
  "meeting_scheduled", "meeting_passed", "fix_3", "fix_4", "meeting_rejected"
]);

export const referenceTypeEnum = pgEnum("reference_type", ["MDES", "MARKET", "PREVIOUS", "OTHER"]);
export const personnelTypeEnum = pgEnum("personnel_type", ["CORE", "ASST", "SUPP"]);
export const locationTypeEnum = pgEnum("location_type", ["สถานที่ราชการ", "สถานที่เอกชน"]);
export const costTypeEnum = pgEnum("cost_type", ["IT", "NON_IT"]);
export const foodTypeEnum = pgEnum("food_type", ["ค่าอาหาร (ไม่ครบมื้อ)", "ค่าอาหารและเครื่องดื่ม", "ค่าอาหารว่าง", "อื่นๆ"]);

// ---------------------------------------------------------------------------
// MAIN TABLE: Proposal
// ---------------------------------------------------------------------------
export const proposals = pgTable("proposals", {
  id: uuid("id").primaryKey(),
  status: proposalStatusEnum("status").default("draft").notNull(),
  
  projectId: uuid("project_id").references(() => projects.id).unique(), 
  userId: uuid("user_id").references(() => users.userId).notNull(),
  updatedBy: uuid("updated_by").references(() => users.userId),
  version: integer("version").default(1), 

  // --- Step 1: ข้อมูลเบื้องต้น ---
  projectName: text("project_name"), // ใช้ text เพราะชื่อโครงการมักจะยาว
  agencyName: varchar("agency_name", { length: 255 }),
  headOfAgency: varchar("head_of_agency", { length: 255 }),
  dcioName: varchar("dcio_name", { length: 255 }),
  projectManager: varchar("project_manager", { length: 255 }),
  totalBudget: numeric("total_budget", { precision: 15, scale: 2 }), // รองรับหลักสิบล้าน/ร้อยล้าน

  // --- Step 2: สาระสำคัญและขอบเขตโครงการ ---
  background: text("background"),
  objective: text("objective"),
  target: text("target"),
  scope: text("scope"),
  projectType: projectTypeEnum("project_type"),
  currentSystemStatus: text("current_system_status"),
  currentProblems: text("current_problems"),

  // --- Step 3: สถาปัตยกรรมองค์กร ---
  isBmaPlan: boolean("is_bma_plan").default(false),
  
  isAgencyPlan: boolean("is_agency_plan").default(false),
  agencyStrategy: text("agency_strategy"),
  agencyIssue: text("agency_issue"),
  agencyKpi: text("agency_kpi"),

  isGovernorPolicy: boolean("is_governor_policy").default(false),
  governorPolicyCode: varchar("governor_policy_code", { length: 100 }),
  governorPolicyName: text("governor_policy_name"),

  obstacleLaws: text("obstacle_laws"),
  appArchitecture: text("app_architecture"),
  dataOwner: varchar("data_owner", { length: 255 }),
  dataExchangePlan: text("data_exchange_plan"),

  // --- Step 5: ความพร้อมของโครงการ ---
  isReady: boolean("is_ready").default(false),
  readinessDetails: text("readiness_details"),
  durationDays: integer("duration_days"),
  otherReadiness: text("other_readiness"),
  expectedBenefits: text("expected_benefits"),
  isInRoadmap: boolean("is_in_roadmap").default(false),

  // --- Timestamps ---
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// sub TABLE: ตารางงบประมาณรายปี (จาก Step 1)
// ---------------------------------------------------------------------------
export const proposalBudgets = pgTable("proposal_budgets", {
  id: uuid("id").primaryKey(),
  proposalId: uuid("proposal_id").references(() => proposals.id, { onDelete: "cascade" }).notNull(),
  year: integer("year"),
  amount: numeric("amount", { precision: 15, scale: 2 }),
  budgetType: varchar("budget_type", { length: 255 }),
});

// ---------------------------------------------------------------------------
// sub TABLE: ตารางโครงการที่เกี่ยวข้อง (จาก Step 2)
// ---------------------------------------------------------------------------
export const proposalRelatedProjects = pgTable("proposal_related_projects", {
  id: uuid("id").primaryKey(),
  proposalId: uuid("proposal_id").references(() => proposals.id, { onDelete: "cascade" }).notNull(),
  projectName: text("project_name"),
  agency: varchar("agency", { length: 255 }),
  fiscalYear: varchar("fiscal_year", { length: 10 }),
  relationType: varchar("relation_type", { length: 255 }),
  remark: text("remark"),
});

// ---------------------------------------------------------------------------
// sub TABLE: ตารางอัตรากำลัง (จาก Step 2)
// ---------------------------------------------------------------------------
export const proposalManpower = pgTable("proposal_manpower", {
  id: uuid("id").primaryKey(),
  proposalId: uuid("proposal_id").references(() => proposals.id, { onDelete: "cascade" }).notNull(),
  agencyPart: varchar("agency_part", { length: 255 }),
  positionLimit: integer("position_limit"),
  occupied: integer("occupied"),
  vacant: integer("vacant"),
});

// ---------------------------------------------------------------------------
// sub TABLE: ตารางครุภัณฑ์ที่มีอยู่ (จาก Step 2)
// ---------------------------------------------------------------------------
export const proposalExistingEquipments = pgTable("proposal_existing_equipments", {
  id: uuid("id").primaryKey(),
  proposalId: uuid("proposal_id").references(() => proposals.id, { onDelete: "cascade" }).notNull(),
  itemName: varchar("item_name", { length: 255 }),
  ageYears: numeric("age_years", { precision: 5, scale: 2 }),
  quantity: integer("quantity"),
  user: varchar("user_name", { length: 255 }),
  location: text("location"),
  remark: text("remark"),
});

// ---------------------------------------------------------------------------
//sub TABLE: ค่าฮาร์ดแวร์ (Step 4)
// ---------------------------------------------------------------------------
export const proposalHardwareCosts = pgTable("proposal_hardware_costs", {
  id: uuid("id").primaryKey(),
  proposalId: uuid("proposal_id").references(() => proposals.id, { onDelete: "cascade" }).notNull(),
  
  itemName: text("item_name"),
  quantity: integer("quantity"),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }),
  
  referenceType: referenceTypeEnum("reference_type"),
  mdesMonth: varchar("mdes_month", { length: 50 }),
  mdesYear: varchar("mdes_year", { length: 10 }),
  mdesItemNo: varchar("mdes_item_no", { length: 100 }),
  marketCount: integer("market_count"),
  marketCompany: text("market_company"),
  prevProject: text("prev_project"),
  prevYear: varchar("prev_year", { length: 10 }),
  otherDetail: text("other_detail"),
});

// ---------------------------------------------------------------------------
// sub TABLE: ค่าซอฟต์แวร์ (Step 4)
// ---------------------------------------------------------------------------
export const proposalSoftwareCosts = pgTable("proposal_software_costs", {
  id: uuid("id").primaryKey(),
  proposalId: uuid("proposal_id").references(() => proposals.id, { onDelete: "cascade" }).notNull(),
  
  itemName: text("item_name"),
  quantity: integer("quantity"),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }),
  
  referenceType: referenceTypeEnum("reference_type"),
  mdesMonth: varchar("mdes_month", { length: 50 }),
  mdesYear: varchar("mdes_year", { length: 10 }),
  mdesItemNo: varchar("mdes_item_no", { length: 100 }),
  marketCount: integer("market_count"),
  marketCompany: text("market_company"),
  prevProject: text("prev_project"),
  prevYear: varchar("prev_year", { length: 10 }),
  otherDetail: text("other_detail"),
});

// ---------------------------------------------------------------------------
// sub TABLE: ค่าใช้จ่ายบุคลากร (Step 4)
// ยุบรวม CORE, ASST, SUPP ไว้ในตารางเดียว แล้วแยกด้วยคอลัมน์ personnel_type
// ---------------------------------------------------------------------------
export const proposalPersonnelCosts = pgTable("proposal_personnel_costs", {
  id: uuid("id").primaryKey(),
  proposalId: uuid("proposal_id").references(() => proposals.id, { onDelete: "cascade" }).notNull(),
  
  personnelType: personnelTypeEnum("personnel_type").notNull(), // แยกประเภท CORE, ASST, SUPP
  position: varchar("position", { length: 255 }),
  degree: varchar("degree", { length: 255 }),
  fieldOfStudy: varchar("field_of_study", { length: 255 }), // SUPP อาจจะไม่มี ปล่อยว่างได้
  experienceYears: numeric("experience_years", { precision: 4, scale: 1 }),
  baseSalary: numeric("base_salary", { precision: 15, scale: 2 }),
  multiplier: numeric("multiplier", { precision: 5, scale: 2 }), // ตัวคูณ เช่น 1.5
  personCount: integer("person_count"),
  durationMonths: integer("duration_months"),
});

// ---------------------------------------------------------------------------
// sub TABLE: หน้าที่ความรับผิดชอบบุคลากร (Step 4)
// ---------------------------------------------------------------------------
export const proposalPersonnelResponsibilities = pgTable("proposal_personnel_responsibilities", {
  id: uuid("id").primaryKey(),
  proposalId: uuid("proposal_id").references(() => proposals.id, { onDelete: "cascade" }).notNull(),
  
  position: varchar("position", { length: 255 }),
  responsibility: text("responsibility"),
});

// ---------------------------------------------------------------------------
// sub TABLE: โครงการฝึกอบรม (Step 4)
// ---------------------------------------------------------------------------
export const proposalTrainings = pgTable("proposal_trainings", {
  id: uuid("id").primaryKey(),
  proposalId: uuid("proposal_id").references(() => proposals.id, { onDelete: "cascade" }).notNull(),
  
  courseName: text("course_name"),
  trainingMethod: varchar("training_method", { length: 255 }),
  locationType: locationTypeEnum("location_type"),
  
  hasSpeakerCost: boolean("has_speaker_cost").default(false),
  speakerReason: text("speaker_reason"),
});

export const proposalTrainingSpeakerCosts = pgTable("proposal_training_speaker_costs", {
  id: uuid("id").primaryKey(),
  trainingId: uuid("training_id").references(() => proposalTrainings.id, { onDelete: "cascade" }).notNull(),
  
  itemName: text("item_name").notNull(),
  hours: integer("hours").notNull(),
  ratePerHour: numeric("rate_per_hour", { precision: 10, scale: 2 }).notNull(),
  days: integer("days").notNull(),
});

export const proposalTrainingFoodCosts = pgTable("proposal_training_food_costs", {
  id: uuid("id").primaryKey(),
  trainingId: uuid("training_id").references(() => proposalTrainings.id, { onDelete: "cascade" }).notNull(),
  
  // lookup: อาหารกลางวัน, อาหารว่าง, อาหารเย็น, อื่นๆ
  itemName: foodTypeEnum("item_name").notNull(),
  mealsCount: integer("meals_count").notNull(),
  ratePerMeal: numeric("rate_per_meal", { precision: 10, scale: 2 }).notNull(),
  traineesCount: integer("trainees_count").notNull(),
  days: integer("days").notNull(),
});

// ---------------------------------------------------------------------------
// sub TABLE: ค่าใช้จ่ายอื่นๆ (Step 4)
// ---------------------------------------------------------------------------
export const proposalOtherCosts = pgTable("proposal_other_costs", {
  id: uuid("id").primaryKey(),
  proposalId: uuid("proposal_id").references(() => proposals.id, { onDelete: "cascade" }).notNull(),
  
  itemName: text("item_name"),
  quantity: integer("quantity"),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }),
  remark: text("remark"),
  costType: costTypeEnum("cost_type"), // IT, NON_IT
});

// ---------------------------------------------------------------------------
// sub TABLE: บุคลากรด้าน ICT ที่มีอยู่ (Step 5)
// ---------------------------------------------------------------------------
export const proposalIctPersonnel = pgTable("proposal_ict_personnel", {
  id: uuid("id").primaryKey(),
  proposalId: uuid("proposal_id").references(() => proposals.id, { onDelete: "cascade" }).notNull(),
  
  position: varchar("position", { length: 255 }),
  level: varchar("level", { length: 255 }),
  count: integer("count"),
});

// ---------------------------------------------------------------------------
// ผูก Relations (สำคัญมาก: ช่วยให้เวลา Query)
// ---------------------------------------------------------------------------

// 1 proposalTrainings มีหลาย proposalTrainingSpeakerCosts และ proposalTrainingFoodCosts
export const proposalTrainingsRelations = relations(proposalTrainings, ({ many }) => ({
  speakerCosts: many(proposalTrainingSpeakerCosts),
  foodCosts: many(proposalTrainingFoodCosts),
}));

// 1 proposalTrainingSpeakerCosts belongs to 1 proposalTrainings
export const speakerCostsRelations = relations(proposalTrainingSpeakerCosts, ({ one }) => ({
  training: one(proposalTrainings, {
    fields: [proposalTrainingSpeakerCosts.trainingId],
    references: [proposalTrainings.id],
  }),
}));

// 1 proposalTrainingFoodCosts belongs to 1 proposalTrainings
export const foodCostsRelations = relations(proposalTrainingFoodCosts, ({ one }) => ({
  training: one(proposalTrainings, {
    fields: [proposalTrainingFoodCosts.trainingId],
    references: [proposalTrainings.id],
  }),
}));

// ---------------------------------------------------------------------------
// ผูก Relations สำหรับตารางหลัก Proposals
// ---------------------------------------------------------------------------
export const proposalsRelations = relations(proposals, ({ many }) => ({
  budgets: many(proposalBudgets), // 1 proposal มีหลาย proposalBudgets
  relatedProjects: many(proposalRelatedProjects), // 1 proposal มีหลาย proposalRelatedProjects
  manpower: many(proposalManpower),
  existingEquipments: many(proposalExistingEquipments),
  hardwareCosts: many(proposalHardwareCosts),
  softwareCosts: many(proposalSoftwareCosts),
  personnelCosts: many(proposalPersonnelCosts),
  personnelResponsibilities: many(proposalPersonnelResponsibilities),
  trainings: many(proposalTrainings), // 1 proposal มีหลาย proposalTrainings
  otherCosts: many(proposalOtherCosts),
  ictPersonnel: many(proposalIctPersonnel),
}));
