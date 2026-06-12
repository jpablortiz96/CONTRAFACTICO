import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type ArtifactType =
  | "chat"
  | "decision"
  | "email"
  | "meeting_transcript"
  | "memo";

interface CorpusArtifact {
  id: string;
  type: ArtifactType;
  timestamp: string;
  author: string;
  intended_audience: string[];
  readers: string[];
  title: string;
  body: string;
  premise_tags: string[];
  contradicts: string[];
  related_decision_ids: string[];
  status?: "approved" | "closed" | "pending";
}

interface CorpusDecision extends CorpusArtifact {
  type: "decision";
  statement: string;
  premises: string[];
  status: "approved" | "closed" | "pending";
}

interface Company {
  id: string;
  name: string;
  description: string;
  employee_count: number;
  industry: string;
  headquarters: string;
}

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
const corpusDirectory = resolve(repositoryRoot, "corpus");
const docsDirectory = resolve(corpusDirectory, "docs");

const leadership = [
  "Mariana Soto (COO)",
  "Diego Londoño (VP Sales)",
  "Lucía Herrera (VP Product)",
  "Tomás Vega (CFO)",
];

const vendorDecisionMakers = [
  "Mariana Soto (COO)",
  "Ana Restrepo (Procurement)",
  "Camilo Torres (Quality)",
  "Tomás Vega (CFO)",
  "Lucía Herrera (VP Product)",
];

const packagingDecisionMakers = [...vendorDecisionMakers];

const southRegionDecisionMakers = [
  "Mariana Soto (COO)",
  "Diego Londoño (VP Sales)",
  "Lucía Herrera (VP Product)",
  "Paula Méndez (People Operations)",
];

const company: Company = {
  id: "cordillera_components",
  name: "Cordillera Components",
  description:
    "A 140-person manufacturer of industrial sensing and monitoring equipment.",
  employee_count: 140,
  industry: "Industrial sensor manufacturing",
  headquarters: "Bogotá, Colombia",
};

const marchDecision: CorpusDecision = {
    id: "dec_x200_march",
    type: "decision",
    timestamp: "2026-02-22T15:00:00-05:00",
    author: "Mariana Soto (COO)",
    intended_audience: leadership,
    readers: leadership,
    title: "Decision: March launch for X-200",
    statement: "Launch the X-200 sensor line in March.",
    body:
      "Cordillera Components will launch the X-200 sensor line in March 2026. The decision assumes the supplier will deliver on time, a Q1 launch remains viable, and return risk is low.",
    premise_tags: [
      "supplier_on_time",
      "q1_launch_viable",
      "return_risk_low",
    ],
    premises: [
      "supplier_on_time",
      "q1_launch_viable",
      "return_risk_low",
    ],
    contradicts: [],
    related_decision_ids: ["dec_x200_march"],
    status: "approved",
};

const vendorSwitchDecision: CorpusDecision = {
    id: "dec_vendor_switch",
    type: "decision",
    timestamp: "2026-06-08T14:00:00-05:00",
    author: "Ana Restrepo (Procurement)",
    intended_audience: vendorDecisionMakers,
    readers: [
      "Mariana Soto (COO)",
      "Ana Restrepo (Procurement)",
      "Tomás Vega (CFO)",
    ],
    title: "Pending decision: switch enclosure supplier to Vendor B",
    statement:
      "Switch the X-series enclosure supply agreement to Vendor B for the next production cycle.",
    body:
      "The vendor switch remains pending. The working recommendation assumes Vendor B is ready to pass production validation and support the July build.",
    premise_tags: ["vendor_b_ready"],
    premises: ["vendor_b_ready"],
    contradicts: [],
    related_decision_ids: ["dec_vendor_switch"],
    status: "pending",
};

const packagingRushDecision: CorpusDecision = {
  id: "dec_q4_packaging_rush",
  type: "decision",
  timestamp: "2025-10-20T14:30:00-05:00",
  author: "Mariana Soto (COO)",
  intended_audience: packagingDecisionMakers,
  readers: packagingDecisionMakers,
  title: "Decision: Q4 rush packaging vendor",
  statement:
    "Approve Q4 rush packaging vendor without final QA confirmation.",
  body:
    "The leadership group approved the Q4 rush packaging vendor to protect the holiday delivery schedule. The approval treated vendor quality as confirmed even though final QA validation had not been reviewed by the decision group.",
  premise_tags: ["vendor_quality_confirmed"],
  premises: ["vendor_quality_confirmed"],
  contradicts: [],
  related_decision_ids: ["dec_q4_packaging_rush"],
  status: "closed",
};

const southRegionRolloutDecision: CorpusDecision = {
  id: "dec_south_region_rollout",
  type: "decision",
  timestamp: "2025-04-28T15:15:00-05:00",
  author: "Diego Londoño (VP Sales)",
  intended_audience: southRegionDecisionMakers,
  readers: southRegionDecisionMakers,
  title: "Decision: May South Region installer rollout",
  statement: "Roll out the South Region installer program in May.",
  body:
    "The commercial leadership group approved the May rollout for the South Region installer program. The plan assumed field training was complete and that the installer network could support customer activation without additional escalation coverage.",
  premise_tags: ["field_training_complete"],
  premises: ["field_training_complete"],
  contradicts: [],
  related_decision_ids: ["dec_south_region_rollout"],
  status: "closed",
};

const decisions: CorpusDecision[] = [
  southRegionRolloutDecision,
  packagingRushDecision,
  marchDecision,
  vendorSwitchDecision,
];

const historicalArtifacts: CorpusArtifact[] = [
  {
    id: "evt_apr22_south_training_gap",
    type: "memo",
    timestamp: "2025-04-22T09:10:00-05:00",
    author: "Paula Méndez (People Operations)",
    intended_audience: southRegionDecisionMakers,
    readers: ["Paula Méndez (People Operations)"],
    title: "South Region installer training readiness",
    body:
      "The field enablement review found that installer training completion was below the required threshold for the South Region launch. Only 11 of 18 installers had passed the final commissioning assessment, so field training was not complete for a May rollout.",
    premise_tags: ["field_training_below_threshold"],
    contradicts: ["field_training_complete"],
    related_decision_ids: ["dec_south_region_rollout"],
  },
  southRegionRolloutDecision,
  {
    id: "evt_jun06_south_support_escalation",
    type: "memo",
    timestamp: "2025-06-06T16:20:00-05:00",
    author: "Valentina Cruz (Customer Support)",
    intended_audience: southRegionDecisionMakers,
    readers: southRegionDecisionMakers,
    title: "South Region installer support escalation",
    body:
      "Customer Support attributed $20,000 USD in escalation cost to repeat installer callbacks, remote commissioning assistance, and emergency field visits after the May rollout. The cost was avoidable if the training threshold had been met before activation.",
    premise_tags: ["support_escalation_cost", "training_gap"],
    contradicts: ["field_training_complete"],
    related_decision_ids: ["dec_south_region_rollout"],
  },
  {
    id: "evt_oct17_packaging_qa_warning",
    type: "email",
    timestamp: "2025-10-17T11:35:00-05:00",
    author: "Camilo Torres (Quality)",
    intended_audience: packagingDecisionMakers,
    readers: ["Camilo Torres (Quality)"],
    title: "Q4 packaging vendor final QA gap",
    body:
      "Quality had not completed final validation for the proposed Q4 rush packaging vendor. Seal integrity results were still open on two production samples, so vendor quality could not be confirmed before approval.",
    premise_tags: ["packaging_qa_incomplete"],
    contradicts: ["vendor_quality_confirmed"],
    related_decision_ids: ["dec_q4_packaging_rush"],
  },
  packagingRushDecision,
  {
    id: "evt_nov14_packaging_rework",
    type: "memo",
    timestamp: "2025-11-14T17:05:00-05:00",
    author: "Tomás Vega (CFO)",
    intended_audience: packagingDecisionMakers,
    readers: packagingDecisionMakers,
    title: "Q4 packaging rework and delivery exposure",
    body:
      "Finance recorded $42,000 USD in avoidable packaging rework, expedited replacement materials, and delivery-delay credits after seal failures were found in the rush vendor lot. The exposure traces to production released before final QA validation.",
    premise_tags: ["packaging_rework_cost", "delivery_delay"],
    contradicts: ["vendor_quality_confirmed"],
    related_decision_ids: ["dec_q4_packaging_rush"],
  },
];

const coreArtifacts: CorpusArtifact[] = [
  {
    id: "evt_jan_kickoff",
    type: "meeting_transcript",
    timestamp: "2026-01-12T10:00:00-05:00",
    author: "Mariana Soto (COO)",
    intended_audience: leadership,
    readers: leadership,
    title: "X-200 launch kickoff",
    body:
      "Mariana opened the X-200 kickoff by confirming that the supplier timeline looked safe. Leadership committed to a March launch because the expected sensor delivery left enough time for assembly, validation, and a Q1 release.",
    premise_tags: ["supplier_on_time", "q1_launch_viable"],
    contradicts: [],
    related_decision_ids: ["dec_x200_march"],
  },
  {
    id: "evt_feb14_supplier",
    type: "email",
    timestamp: "2026-02-14T09:42:00-05:00",
    author: "Ana Restrepo (Procurement)",
    intended_audience: leadership,
    readers: [],
    title: "Supplier update: X-200 sensor batch delayed",
    body:
      "The supplier has moved final calibration into late March. The X-200 sensor batch will NOT arrive before April, so the current March assembly and launch plan cannot be supported by confirmed inventory. Please revisit the launch date before the greenlight.",
    premise_tags: ["supplier_delay"],
    contradicts: ["supplier_on_time"],
    related_decision_ids: ["dec_x200_march"],
  },
  {
    id: "evt_feb20_greenlight",
    type: "chat",
    timestamp: "2026-02-20T16:15:00-05:00",
    author: "Diego Londoño (VP Sales)",
    intended_audience: leadership,
    readers: leadership,
    title: "Launch greenlight thread",
    body:
      "The launch team reaffirmed the March date and kept customer announcements on schedule. Participants repeated that supplier delivery was on track; nobody in the thread referred to Ana's February 14 supplier email or showed awareness of the April arrival.",
    premise_tags: ["supplier_on_time"],
    contradicts: [],
    related_decision_ids: ["dec_x200_march"],
  },
  marchDecision,
  {
    id: "evt_mar08_stockout",
    type: "chat",
    timestamp: "2026-03-08T11:30:00-05:00",
    author: "Valentina Cruz (Customer Support)",
    intended_audience: [
      "Mariana Soto (COO)",
      "Diego Londoño (VP Sales)",
      "Lucía Herrera (VP Product)",
    ],
    readers: [
      "Mariana Soto (COO)",
      "Diego Londoño (VP Sales)",
      "Lucía Herrera (VP Product)",
    ],
    title: "Support escalation: stockout and returns",
    body:
      "Support reported that launch inventory had stocked out. Customers were returning X-200 orders because the team had no replacement units available and could not provide a reliable fulfillment date.",
    premise_tags: ["stockout", "return_risk_high"],
    contradicts: ["return_risk_low"],
    related_decision_ids: ["dec_x200_march"],
  },
  {
    id: "evt_mar31_returns",
    type: "memo",
    timestamp: "2026-03-31T17:40:00-05:00",
    author: "Tomás Vega (CFO)",
    intended_audience: leadership,
    readers: leadership,
    title: "Finance memo: Q1 returns exposure",
    body:
      "Finance recorded $80,000 USD in Q1 returns tied to the X-200 launch stockout and the absence of replacement units. The amount excludes internal rework and expedited freight.",
    premise_tags: ["returns_cost", "return_risk_high"],
    contradicts: ["return_risk_low"],
    related_decision_ids: ["dec_x200_march"],
  },
  {
    id: "evt_apr_capacity",
    type: "memo",
    timestamp: "2026-04-03T09:00:00-05:00",
    author: "Santiago Ruiz (Plant Manager)",
    intended_audience: leadership,
    readers: leadership,
    title: "April capacity confirmation",
    body:
      "Plant planning confirmed that April assembly and validation capacity was available for the delayed sensor batch. If the launch had moved to April, replacement inventory could have been staged before customer shipment and the stockout-related returns would likely have been avoided.",
    premise_tags: ["april_capacity", "returns_avoidable"],
    contradicts: [],
    related_decision_ids: ["dec_x200_march"],
  },
];

const vendorArtifacts: CorpusArtifact[] = [
  {
    id: "evt_may_vendor_review",
    type: "meeting_transcript",
    timestamp: "2026-05-28T10:30:00-05:00",
    author: "Ana Restrepo (Procurement)",
    intended_audience: vendorDecisionMakers,
    readers: vendorDecisionMakers,
    title: "Vendor B readiness review",
    body:
      "The sourcing group recommended Vendor B for the next enclosure cycle based on the pilot schedule. The group treated production validation as likely to complete before the July build.",
    premise_tags: ["vendor_b_ready"],
    contradicts: [],
    related_decision_ids: ["dec_vendor_switch"],
  },
  {
    id: "evt_jun07_vendor_validation",
    type: "memo",
    timestamp: "2026-06-07T08:20:00-05:00",
    author: "Camilo Torres (Quality)",
    intended_audience: vendorDecisionMakers,
    readers: ["Camilo Torres (Quality)"],
    title: "Vendor B validation hold",
    body:
      "Vendor B failed the latest ingress protection validation on three of five enclosure samples. Quality cannot confirm Vendor B is ready for production, and the July build should not depend on approval until corrective samples pass.",
    premise_tags: ["vendor_b_validation_failed"],
    contradicts: ["vendor_b_ready"],
    related_decision_ids: ["dec_vendor_switch"],
  },
  vendorSwitchDecision,
];

const decoyArtifacts: CorpusArtifact[] = [
  {
    id: "evt_decoy_001",
    type: "email",
    timestamp: "2026-01-05T08:15:00-05:00",
    author: "Paula Méndez (People Operations)",
    intended_audience: ["All managers"],
    readers: ["All managers"],
    title: "January manager onboarding schedule",
    body:
      "People Operations published the January manager onboarding schedule, including payroll, safety, and performance review sessions for six recently promoted supervisors.",
    premise_tags: ["manager_onboarding"],
    contradicts: [],
    related_decision_ids: [],
  },
  {
    id: "evt_decoy_002",
    type: "memo",
    timestamp: "2026-01-07T14:30:00-05:00",
    author: "Tomás Vega (CFO)",
    intended_audience: ["Finance team"],
    readers: ["Finance team"],
    title: "Foreign exchange planning rate",
    body:
      "Finance set the internal planning rate for euro-denominated component purchases and requested monthly variance reporting from accounts payable.",
    premise_tags: ["fx_planning"],
    contradicts: [],
    related_decision_ids: [],
  },
  {
    id: "evt_decoy_003",
    type: "chat",
    timestamp: "2026-01-09T11:05:00-05:00",
    author: "Nicolás Arias (IT)",
    intended_audience: ["Operations channel"],
    readers: ["Operations channel"],
    title: "Warehouse scanner maintenance",
    body:
      "IT scheduled firmware maintenance for warehouse barcode scanners after the Friday shipping cutoff. No shipping interruption was expected.",
    premise_tags: ["warehouse_systems"],
    contradicts: [],
    related_decision_ids: [],
  },
  {
    id: "evt_decoy_004",
    type: "meeting_transcript",
    timestamp: "2026-01-15T09:00:00-05:00",
    author: "Santiago Ruiz (Plant Manager)",
    intended_audience: ["Plant supervisors"],
    readers: ["Plant supervisors"],
    title: "Weekly safety review",
    body:
      "Plant supervisors reviewed near-miss reports, approved new floor markings near the loading area, and assigned a refresher briefing for forklift operators.",
    premise_tags: ["plant_safety"],
    contradicts: [],
    related_decision_ids: [],
  },
  {
    id: "evt_decoy_005",
    type: "email",
    timestamp: "2026-01-19T13:25:00-05:00",
    author: "Juliana Pardo (Marketing)",
    intended_audience: ["Marketing team"],
    readers: ["Marketing team"],
    title: "Trade show booth copy review",
    body:
      "Marketing circulated revised booth copy for the Andean Automation Expo and asked product managers to verify environmental rating claims.",
    premise_tags: ["trade_show"],
    contradicts: [],
    related_decision_ids: [],
  },
  {
    id: "evt_decoy_006",
    type: "memo",
    timestamp: "2026-01-22T16:10:00-05:00",
    author: "Camilo Torres (Quality)",
    intended_audience: ["Quality team"],
    readers: ["Quality team"],
    title: "Calibration audit closeout",
    body:
      "Quality closed the calibration audit after confirming that all reference instruments had current certificates and traceable maintenance records.",
    premise_tags: ["calibration_compliance"],
    contradicts: [],
    related_decision_ids: [],
  },
  {
    id: "evt_decoy_007",
    type: "chat",
    timestamp: "2026-01-27T10:45:00-05:00",
    author: "Valentina Cruz (Customer Support)",
    intended_audience: ["Support team"],
    readers: ["Support team"],
    title: "Support macro cleanup",
    body:
      "The support team retired nine outdated response macros and assigned owners to review warranty language for current products.",
    premise_tags: ["support_operations"],
    contradicts: [],
    related_decision_ids: [],
  },
  {
    id: "evt_decoy_008",
    type: "email",
    timestamp: "2026-02-02T08:50:00-05:00",
    author: "Ana Restrepo (Procurement)",
    intended_audience: ["Procurement team"],
    readers: ["Procurement team"],
    title: "Packaging resin quotation",
    body:
      "Procurement received a revised quotation for recyclable packaging resin. The change affected accessory packaging but not sensor components or launch inventory.",
    premise_tags: ["packaging_cost"],
    contradicts: [],
    related_decision_ids: [],
  },
  {
    id: "evt_decoy_009",
    type: "meeting_transcript",
    timestamp: "2026-02-05T15:00:00-05:00",
    author: "Diego Londoño (VP Sales)",
    intended_audience: ["Regional sales leads"],
    readers: ["Regional sales leads"],
    title: "Distributor territory review",
    body:
      "Sales reviewed distributor territory overlaps in Ecuador and Peru and agreed to preserve existing account ownership through the second quarter.",
    premise_tags: ["channel_coverage"],
    contradicts: [],
    related_decision_ids: [],
  },
  {
    id: "evt_decoy_010",
    type: "memo",
    timestamp: "2026-02-09T12:20:00-05:00",
    author: "Nicolás Arias (IT)",
    intended_audience: ["Security committee"],
    readers: ["Security committee"],
    title: "Quarterly access review",
    body:
      "The security committee completed its quarterly application access review and removed inactive contractor accounts from the service portal.",
    premise_tags: ["access_governance"],
    contradicts: [],
    related_decision_ids: [],
  },
  {
    id: "evt_decoy_011",
    type: "chat",
    timestamp: "2026-02-12T17:05:00-05:00",
    author: "Lucía Herrera (VP Product)",
    intended_audience: ["Product channel"],
    readers: ["Product channel"],
    title: "Temperature probe naming",
    body:
      "Product selected the T-45 name for the revised temperature probe and reserved final catalog copy for legal review.",
    premise_tags: ["product_naming"],
    contradicts: [],
    related_decision_ids: [],
  },
  {
    id: "evt_decoy_012",
    type: "email",
    timestamp: "2026-02-17T09:35:00-05:00",
    author: "Paula Méndez (People Operations)",
    intended_audience: ["All employees"],
    readers: ["All employees"],
    title: "Benefits enrollment reminder",
    body:
      "Employees received a reminder that benefits enrollment would close Friday and that dependent records required supporting documentation.",
    premise_tags: ["benefits_enrollment"],
    contradicts: [],
    related_decision_ids: [],
  },
  {
    id: "evt_decoy_013",
    type: "memo",
    timestamp: "2026-02-25T14:10:00-05:00",
    author: "Santiago Ruiz (Plant Manager)",
    intended_audience: ["Facilities team"],
    readers: ["Facilities team"],
    title: "Compressed air inspection",
    body:
      "Facilities identified two minor compressed air leaks and scheduled repairs during the next planned maintenance window.",
    premise_tags: ["facility_maintenance"],
    contradicts: [],
    related_decision_ids: [],
  },
  {
    id: "evt_decoy_014",
    type: "chat",
    timestamp: "2026-03-03T10:00:00-05:00",
    author: "Juliana Pardo (Marketing)",
    intended_audience: ["Marketing channel"],
    readers: ["Marketing channel"],
    title: "Customer webinar attendance",
    body:
      "Marketing reported 184 registrations for the predictive maintenance webinar and planned a follow-up session focused on food processing facilities.",
    premise_tags: ["webinar_pipeline"],
    contradicts: [],
    related_decision_ids: [],
  },
  {
    id: "evt_decoy_015",
    type: "email",
    timestamp: "2026-03-06T16:45:00-05:00",
    author: "Tomás Vega (CFO)",
    intended_audience: ["Department leaders"],
    readers: ["Department leaders"],
    title: "Travel approval threshold",
    body:
      "Finance raised the preapproval threshold for domestic travel and retained CFO approval for international bookings made less than fourteen days ahead.",
    premise_tags: ["travel_policy"],
    contradicts: [],
    related_decision_ids: [],
  },
  {
    id: "evt_decoy_016",
    type: "meeting_transcript",
    timestamp: "2026-03-12T08:30:00-05:00",
    author: "Camilo Torres (Quality)",
    intended_audience: ["Quality and engineering"],
    readers: ["Quality and engineering"],
    title: "Humidity chamber utilization",
    body:
      "Quality and engineering agreed on a shared booking calendar for the humidity chamber to reduce test scheduling conflicts.",
    premise_tags: ["lab_capacity"],
    contradicts: [],
    related_decision_ids: [],
  },
  {
    id: "evt_decoy_017",
    type: "memo",
    timestamp: "2026-03-18T13:15:00-05:00",
    author: "Nicolás Arias (IT)",
    intended_audience: ["Executive team"],
    readers: ["Executive team"],
    title: "Network redundancy test",
    body:
      "IT completed the network failover test in seven minutes and documented one monitoring alert that requires a configuration update.",
    premise_tags: ["network_reliability"],
    contradicts: [],
    related_decision_ids: [],
  },
  {
    id: "evt_decoy_018",
    type: "email",
    timestamp: "2026-03-24T09:55:00-05:00",
    author: "Ana Restrepo (Procurement)",
    intended_audience: ["Procurement team"],
    readers: ["Procurement team"],
    title: "Fastener supplier renewal",
    body:
      "Procurement renewed the stainless fastener agreement for twelve months with unchanged lead times and a two percent unit price increase.",
    premise_tags: ["fastener_supply"],
    contradicts: [],
    related_decision_ids: [],
  },
  {
    id: "evt_decoy_019",
    type: "chat",
    timestamp: "2026-04-08T11:40:00-05:00",
    author: "Valentina Cruz (Customer Support)",
    intended_audience: ["Support channel"],
    readers: ["Support channel"],
    title: "Portal translation review",
    body:
      "Support completed a terminology review for the Portuguese customer portal and flagged four installation phrases for engineering confirmation.",
    premise_tags: ["localization"],
    contradicts: [],
    related_decision_ids: [],
  },
  {
    id: "evt_decoy_020",
    type: "memo",
    timestamp: "2026-04-15T15:25:00-05:00",
    author: "Paula Méndez (People Operations)",
    intended_audience: ["Executive team"],
    readers: ["Executive team"],
    title: "Engineering hiring pipeline",
    body:
      "People Operations reported eight active candidates for two embedded engineering roles and expected first-round interviews to finish by month end.",
    premise_tags: ["hiring_pipeline"],
    contradicts: [],
    related_decision_ids: [],
  },
  {
    id: "evt_decoy_021",
    type: "meeting_transcript",
    timestamp: "2026-04-22T10:10:00-05:00",
    author: "Lucía Herrera (VP Product)",
    intended_audience: ["Product council"],
    readers: ["Product council"],
    title: "Legacy gateway retirement",
    body:
      "The product council approved a twelve-month notice period before retiring the G-10 gateway and assigned migration documentation to solutions engineering.",
    premise_tags: ["product_retirement"],
    contradicts: [],
    related_decision_ids: [],
  },
  {
    id: "evt_decoy_022",
    type: "email",
    timestamp: "2026-05-04T08:40:00-05:00",
    author: "Santiago Ruiz (Plant Manager)",
    intended_audience: ["Plant employees"],
    readers: ["Plant employees"],
    title: "Cafeteria renovation schedule",
    body:
      "Facilities announced a two-week cafeteria renovation and arranged staggered meal service in the training room.",
    premise_tags: ["facility_project"],
    contradicts: [],
    related_decision_ids: [],
  },
  {
    id: "evt_decoy_023",
    type: "chat",
    timestamp: "2026-05-12T14:05:00-05:00",
    author: "Diego Londoño (VP Sales)",
    intended_audience: ["Sales channel"],
    readers: ["Sales channel"],
    title: "Mining account forecast",
    body:
      "Sales updated the mining account forecast after two customers shifted routine maintenance purchases from May into June.",
    premise_tags: ["sales_forecast"],
    contradicts: [],
    related_decision_ids: [],
  },
  {
    id: "evt_decoy_024",
    type: "memo",
    timestamp: "2026-05-20T16:35:00-05:00",
    author: "Tomás Vega (CFO)",
    intended_audience: ["Finance team"],
    readers: ["Finance team"],
    title: "Insurance renewal assumptions",
    body:
      "Finance documented property insurance renewal assumptions and requested updated equipment values from facilities and laboratory operations.",
    premise_tags: ["insurance_renewal"],
    contradicts: [],
    related_decision_ids: [],
  },
  {
    id: "evt_decoy_025",
    type: "email",
    timestamp: "2026-06-02T09:20:00-05:00",
    author: "Juliana Pardo (Marketing)",
    intended_audience: ["Product and sales"],
    readers: ["Product and sales"],
    title: "Case study interview plan",
    body:
      "Marketing scheduled interviews with two cold-chain customers for a case study about remote temperature monitoring and alert response time.",
    premise_tags: ["customer_story"],
    contradicts: [],
    related_decision_ids: [],
  },
];

function assertUniqueIds(artifacts: CorpusArtifact[]): void {
  const ids = new Set<string>();

  for (const artifact of artifacts) {
    if (ids.has(artifact.id)) {
      throw new Error(`Duplicate artifact id: ${artifact.id}`);
    }
    ids.add(artifact.id);
  }
}

function formatList(values: string[]): string {
  return values.length === 0 ? "None" : values.join("; ");
}

function formatTags(values: string[]): string {
  return values.length === 0
    ? "None"
    : values.map((value) => `\`${value}\``).join(", ");
}

function renderArtifactDocument(artifact: CorpusArtifact): string {
  const decisionDetails =
    artifact.type === "decision"
      ? `- **Status:** ${artifact.status ?? "approved"}
- **Decision statement:** ${(artifact as CorpusDecision).statement}
- **Decision premises:** ${formatTags((artifact as CorpusDecision).premises)}
`
      : artifact.status === undefined
        ? ""
        : `- **Status:** ${artifact.status}
`;

  return `# ${artifact.title}

This source record belongs to the Cordillera Components organizational decision corpus.

## Artifact Details

- **Artifact ID:** \`${artifact.id}\`
- **Title:** ${artifact.title}
- **Type:** \`${artifact.type}\`
- **Timestamp:** ${artifact.timestamp}
- **Author:** ${artifact.author}
- **Intended audience count:** ${artifact.intended_audience.length}
- **Intended audience:** ${formatList(artifact.intended_audience)}
- **Readers count:** ${artifact.readers.length}
- **Readers:** ${formatList(artifact.readers)}
- **Premise tags:** ${formatTags(artifact.premise_tags)}
- **Contradicts:** ${formatTags(artifact.contradicts)}
- **Related decisions:** ${formatTags(artifact.related_decision_ids)}
${decisionDetails}
## Body

${artifact.body}
`;
}

async function main(): Promise<void> {
  const events = [
    ...historicalArtifacts,
    ...coreArtifacts,
    ...vendorArtifacts,
    ...decoyArtifacts,
  ].sort(
    (left, right) =>
      left.timestamp.localeCompare(right.timestamp) ||
      left.id.localeCompare(right.id),
  );

  assertUniqueIds(events);
  await mkdir(docsDirectory, { recursive: true });
  const existingDocuments = (await readdir(docsDirectory)).filter((filename) =>
    filename.endsWith(".md"),
  );
  await Promise.all(
    existingDocuments.map((filename) =>
      unlink(resolve(docsDirectory, filename)),
    ),
  );

  await Promise.all([
    writeFile(
      resolve(corpusDirectory, "company.json"),
      `${JSON.stringify(company, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      resolve(corpusDirectory, "decisions.json"),
      `${JSON.stringify(decisions, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      resolve(corpusDirectory, "events.jsonl"),
      `${events.map((event) => JSON.stringify(event)).join("\n")}\n`,
      "utf8",
    ),
    ...events.map((event) =>
      writeFile(
        resolve(docsDirectory, `${event.id}.md`),
        renderArtifactDocument(event),
        "utf8",
      ),
    ),
  ]);

  console.log(
    `Generated ${decisions.length} decisions, ${events.length} events, and ${events.length} documents.`,
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
