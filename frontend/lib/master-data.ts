export type MasterRow = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
};
export type Field = {
  key: string;
  label: string;
  type?: "text" | "email" | "date" | "number" | "textarea";
  required?: boolean;
  max?: number;
  reference?: Resource;
  choices?: string[];
};
export const resources = [
  "customers",
  "projects",
  "lpos",
  "items",
  "categories",
  "units",
  "families",
] as const;
export type Resource = (typeof resources)[number];
export const config: Record<
  Resource,
  { title: string; singular: string; description: string; fields: Field[] }
> = {
  customers: {
    title: "Customers",
    singular: "customer",
    description:
      "One customer identity, with its projects and customer-issued LPO references.",
    fields: [
      { key: "name", label: "Official customer name", required: true },
      { key: "customer_type", label: "Customer type", max: 80 },
      { key: "contact_name", label: "Primary contact", max: 150 },
      { key: "email", label: "Email", type: "email", max: 254 },
      { key: "phone", label: "Phone", max: 50 },
      { key: "address", label: "Address", type: "textarea" },
      { key: "country", label: "Country", required: true, max: 80 },
      { key: "trn", label: "UAE VAT / TRN (15 digits)", max: 15 },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  projects: {
    title: "Projects",
    singular: "project",
    description:
      "Customer sites and projects, independently identified for future orders and deliveries.",
    fields: [
      { key: "name", label: "Project name", required: true },
      {
        key: "customer_id",
        label: "Customer",
        reference: "customers",
        required: true,
      },
      { key: "location", label: "Project location", max: 255 },
      { key: "site_contact", label: "Site contact", max: 150 },
      { key: "phone", label: "Contact phone", max: 50 },
      {
        key: "status",
        label: "Status",
        choices: ["active", "completed", "archived"],
        required: true,
      },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  lpos: {
    title: "LPO references",
    singular: "LPO reference",
    description:
      "Customer-issued Local Purchase Orders. These are separate from supplier purchasing.",
    fields: [
      { key: "name", label: "Reference description", required: true },
      {
        key: "number",
        label: "Customer-issued LPO number",
        required: true,
        max: 150,
      },
      {
        key: "customer_id",
        label: "Customer",
        reference: "customers",
        required: true,
      },
      { key: "project_id", label: "Project (optional)", reference: "projects" },
      { key: "lpo_date", label: "LPO date", type: "date" },
      {
        key: "status",
        label: "Status",
        choices: ["active", "closed", "cancelled"],
        required: true,
      },
      {
        key: "document_reference",
        label: "Supporting document reference",
        max: 255,
      },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  items: {
    title: "Items",
    singular: "item",
    description:
      "Approved products, materials, components and independently identifiable variants.",
    fields: [
      { key: "name", label: "Item name", required: true },
      { key: "description", label: "Description", type: "textarea" },
      {
        key: "item_type",
        label: "Item type",
        required: true,
        choices: ["finished", "raw_material", "component", "accessory", "kit"],
      },
      {
        key: "category_id",
        label: "Category",
        reference: "categories",
        required: true,
      },
      {
        key: "unit_id",
        label: "Unit of measure",
        reference: "units",
        required: true,
      },
      {
        key: "family_id",
        label: "Product family (optional)",
        reference: "families",
      },
      { key: "colour", label: "Colour", max: 80 },
      { key: "dimensions", label: "Dimensions / length", max: 150 },
      { key: "design", label: "Design / type", max: 80 },
      { key: "weight_kg", label: "Weight (kg)", type: "number" },
    ],
  },
  categories: {
    title: "Product categories",
    singular: "category",
    description:
      "Controlled product classifications. Parent relationships cannot form a cycle.",
    fields: [
      { key: "name", label: "Category name", required: true },
      {
        key: "parent_id",
        label: "Parent category (optional)",
        reference: "categories",
      },
    ],
  },
  units: {
    title: "Units of measure",
    singular: "unit",
    description: "Extensible measurement records. No conversions are inferred.",
    fields: [
      { key: "name", label: "Unit name (for example PCS)", required: true },
      {
        key: "decimal_places",
        label: "Decimal places (0–6)",
        type: "number",
        required: true,
      },
    ],
  },
  families: {
    title: "Product families & variants",
    singular: "family",
    description:
      "Define approved attribute values here, then create each approved combination as an item.",
    fields: [
      { key: "name", label: "Family name", required: true },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
};
export function isResource(value: string): value is Resource {
  return resources.includes(value as Resource);
}
export function can(permissions: string[], resource: Resource, action: string) {
  return permissions.includes(
    ["categories", "units", "families"].includes(resource)
      ? `${resource}.manage`
      : `${resource}.${action}`,
  );
}
