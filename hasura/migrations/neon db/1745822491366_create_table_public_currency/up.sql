CREATE TABLE "public"."currency" ("label" text NOT NULL, "value" text NOT NULL, PRIMARY KEY ("value","label") , UNIQUE ("value"), UNIQUE ("label"));
