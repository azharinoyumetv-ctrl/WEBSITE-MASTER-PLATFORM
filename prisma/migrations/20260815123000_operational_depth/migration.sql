CREATE TABLE "tenant_inventory_batches" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "location_id" UUID NOT NULL,
  "catalog_item_id" UUID NOT NULL,
  "lot_number" VARCHAR(100) NOT NULL,
  "quantity_on_hand" INTEGER NOT NULL DEFAULT 0,
  "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ,
  "supplier" VARCHAR(255),
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "tenant_inventory_batches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_inventory_batches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "system_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "tenant_inventory_batches_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "tenant_inventory_locations"("id") ON DELETE CASCADE,
  CONSTRAINT "tenant_inventory_batches_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "tenant_catalog_items"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "tenant_inventory_batches_tenant_location_item_lot_key"
  ON "tenant_inventory_batches"("tenant_id", "location_id", "catalog_item_id", "lot_number");
CREATE INDEX "tenant_inventory_batches_tenant_expiry_idx"
  ON "tenant_inventory_batches"("tenant_id", "expires_at");

CREATE TABLE "tenant_crm_expenses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "contact_id" UUID,
  "category" VARCHAR(100) NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'IDR',
  "description" TEXT,
  "expense_date" DATE NOT NULL,
  "receipt_url" TEXT,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "tenant_crm_expenses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_crm_expenses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "system_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "tenant_crm_expenses_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "tenant_crm_contacts"("id") ON DELETE SET NULL
);

CREATE INDEX "tenant_crm_expenses_tenant_date_idx"
  ON "tenant_crm_expenses"("tenant_id", "expense_date" DESC);

CREATE TABLE "tenant_booking_staff" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "resource_id" UUID,
  "display_name" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255),
  "phone_number" VARCHAR(64),
  "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "availability" JSONB NOT NULL DEFAULT '{}',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "tenant_booking_staff_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_booking_staff_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "system_tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "tenant_booking_staff_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "tenant_booking_resources"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX "tenant_booking_staff_tenant_email_key"
  ON "tenant_booking_staff"("tenant_id", "email");
CREATE INDEX "tenant_booking_staff_tenant_resource_active_idx"
  ON "tenant_booking_staff"("tenant_id", "resource_id", "is_active");

ALTER TABLE "tenant_bookings" ADD COLUMN "staff_id" UUID;
ALTER TABLE "tenant_bookings"
  ADD CONSTRAINT "tenant_bookings_staff_id_fkey"
  FOREIGN KEY ("staff_id") REFERENCES "tenant_booking_staff"("id") ON DELETE SET NULL;
CREATE INDEX "tenant_bookings_tenant_staff_start_idx"
  ON "tenant_bookings"("tenant_id", "staff_id", "start_time" DESC);
