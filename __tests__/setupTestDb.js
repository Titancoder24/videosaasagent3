const {
  pool,
  connect_PgSQL_DB,
} = require("../src/infrastructure/PgDB/connect");

beforeAll(async () => {
  process.env.PGSQL_DB_URL =
    process.env.PGSQL_DB_URL || process.env.TEST_PGSQL_DB_URL;
  await connect_PgSQL_DB();

  // Ensure required extension and tables exist for tests
  const ddl = `
    DROP TABLE IF EXISTS dropdown_options CASCADE;
    DROP TABLE IF EXISTS dropdown_categories CASCADE;
    DROP TABLE IF EXISTS saved_queries CASCADE;
    DROP TABLE IF EXISTS therapeutic_notes CASCADE;
    DROP TABLE IF EXISTS therapeutic_logs CASCADE;
    DROP TABLE IF EXISTS therapeutic_other_sources CASCADE;
    DROP TABLE IF EXISTS therapeutic_sites CASCADE;
    DROP TABLE IF EXISTS therapeutic_results CASCADE;
    DROP TABLE IF EXISTS therapeutic_timing CASCADE;
    DROP TABLE IF EXISTS therapeutic_participation_criteria CASCADE;
    DROP TABLE IF EXISTS therapeutic_outcome_measured CASCADE;
    DROP TABLE IF EXISTS therapeutic_trial_overview CASCADE;
    DROP TABLE IF EXISTS drug_logs CASCADE;
    DROP TABLE IF EXISTS drug_licences_marketing CASCADE;
    DROP TABLE IF EXISTS drug_other_sources CASCADE;
    DROP TABLE IF EXISTS drug_development CASCADE;
    DROP TABLE IF EXISTS drug_activity CASCADE;
    DROP TABLE IF EXISTS drug_dev_status CASCADE;
    DROP TABLE IF EXISTS drug_overview CASCADE;
    DROP TABLE IF EXISTS user_roles CASCADE;
    DROP TABLE IF EXISTS pending_changes CASCADE;
    DROP TABLE IF EXISTS user_activity CASCADE;
    DROP TABLE IF EXISTS roles CASCADE;
    DROP TABLE IF EXISTS users CASCADE;

    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      company TEXT,
      designation TEXT,
      phone TEXT,
      country TEXT,
      region TEXT,
      sex TEXT,
      age INT,
      plan TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS roles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      role_name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      CONSTRAINT user_roles_unique UNIQUE (user_id, role_id)
    );

    CREATE TABLE IF NOT EXISTS pending_changes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      target_table TEXT NOT NULL,
      target_record_id UUID,
      proposed_data JSONB NOT NULL,
      change_type TEXT NOT NULL CHECK (change_type IN ('INSERT', 'UPDATE', 'DELETE')),
      submitted_by UUID NOT NULL REFERENCES users(id),
      submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      is_approved BOOLEAN DEFAULT FALSE,
      approved_by UUID REFERENCES users(id),
      approved_at TIMESTAMP WITH TIME ZONE,
      rejected BOOLEAN DEFAULT FALSE,
      rejection_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS user_activity (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id),
      table_name TEXT NOT NULL,
      record_id UUID,
      action_type TEXT NOT NULL CHECK (action_type IN ('INSERT','UPDATE','DELETE','APPROVE','REJECT')),
      change_details JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS drug_overview (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      drug_name TEXT,
      generic_name TEXT,
      other_name TEXT,
      primary_name TEXT,
      global_status TEXT,
      development_status TEXT,
      drug_summary TEXT,
      originator TEXT,
      other_active_companies TEXT,
      therapeutic_area TEXT,
      disease_type TEXT,
      regulator_designations TEXT,
      source_link TEXT,
      drug_record_status TEXT,
      is_approved BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS drug_dev_status (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      drug_over_id UUID REFERENCES drug_overview(id) ON DELETE CASCADE,
      disease_type TEXT,
      therapeutic_class TEXT,
      company TEXT,
      company_type TEXT,
      status TEXT,
      reference JSONB
    );

    CREATE TABLE IF NOT EXISTS drug_activity (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      drug_over_id UUID REFERENCES drug_overview(id) ON DELETE CASCADE,
      mechanism_of_action TEXT,
      biological_target TEXT,
      drug_technology TEXT,
      delivery_route TEXT,
      delivery_medium TEXT
    );

    CREATE TABLE IF NOT EXISTS drug_development (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      drug_over_id UUID REFERENCES drug_overview(id) ON DELETE CASCADE,
      preclinical TEXT,
      trial_id TEXT,
      title TEXT,
      primary_drugs TEXT,
      status TEXT,
      sponsor TEXT
    );

    CREATE TABLE IF NOT EXISTS drug_other_sources (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      drug_over_id UUID REFERENCES drug_overview(id) ON DELETE CASCADE,
      data TEXT
    );

    CREATE TABLE IF NOT EXISTS drug_licences_marketing (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      drug_over_id UUID REFERENCES drug_overview(id) ON DELETE CASCADE,
      agreement TEXT,
      licensing_availability TEXT,
      marketing_approvals TEXT
    );

    CREATE TABLE IF NOT EXISTS drug_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      drug_over_id UUID REFERENCES drug_overview(id) ON DELETE CASCADE,
      drug_changes_log TEXT,
      created_date DATE,
      last_modified_user TEXT,
      full_review_user TEXT,
      next_review_date DATE,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS therapeutic_trial_overview (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      therapeutic_area TEXT,
      trial_id TEXT,
      trial_identifier TEXT[],
      trial_phase TEXT,
      status TEXT,
      primary_drugs TEXT,
      other_drugs TEXT,
      title TEXT,
      disease_type TEXT,
      patient_segment TEXT,
      line_of_therapy TEXT,
      reference_links TEXT[],
      trial_tags TEXT,
      sponsor_collaborators TEXT,
      sponsor_field_activity TEXT,
      associated_cro TEXT,
      countries TEXT,
      region TEXT,
      trial_record_status TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS therapeutic_outcome_measured (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      trial_id UUID REFERENCES therapeutic_trial_overview(id) ON DELETE CASCADE,
      purpose_of_trial TEXT,
      summary TEXT,
      primary_outcome_measure TEXT,
      other_outcome_measure TEXT,
      study_design_keywords TEXT,
      study_design TEXT,
      treatment_regimen TEXT,
      number_of_arms INT
    );

    CREATE TABLE IF NOT EXISTS therapeutic_participation_criteria (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      trial_id UUID REFERENCES therapeutic_trial_overview(id) ON DELETE CASCADE,
      inclusion_criteria TEXT,
      exclusion_criteria TEXT,
      age_from TEXT,
      subject_type TEXT,
      age_to TEXT,
      sex TEXT,
      healthy_volunteers TEXT,
      target_no_volunteers TEXT,
      actual_enrolled_volunteers TEXT
    );

    CREATE TABLE IF NOT EXISTS therapeutic_timing (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      trial_id UUID REFERENCES therapeutic_trial_overview(id) ON DELETE CASCADE,
      start_date_actual DATE,
      start_date_benchmark DATE,
      start_date_estimated DATE,
      inclusion_period_actual TEXT,
      inclusion_period_benchmark TEXT,
      inclusion_period_estimated TEXT,
      enrollment_closed_actual DATE,
      enrollment_closed_benchmark DATE,
      enrollment_closed_estimated DATE,
      primary_outcome_duration_actual TEXT,
      primary_outcome_duration_benchmark TEXT,
      primary_outcome_duration_estimated TEXT,
      trial_end_date_actual DATE,
      trial_end_date_benchmark DATE,
      trial_end_date_estimated DATE,
      result_duration_actual TEXT,
      result_duration_benchmark TEXT,
      result_duration_estimated TEXT,
      result_published_date_actual DATE,
      result_published_date_benchmark DATE,
      result_published_date_estimated DATE
    );

    CREATE TABLE IF NOT EXISTS therapeutic_results (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      trial_id UUID REFERENCES therapeutic_trial_overview(id) ON DELETE CASCADE,
      trial_outcome TEXT,
      reference TEXT,
      trial_results TEXT[],
      adverse_event_reported TEXT,
      adverse_event_type TEXT,
      treatment_for_adverse_events TEXT,
      results_available TEXT,
      endpoints_met TEXT,
      trial_outcome_content TEXT,
      trial_outcome_link TEXT,
      trial_outcome_attachment TEXT,
      site_notes JSONB
    );

    CREATE TABLE IF NOT EXISTS therapeutic_sites (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      trial_id UUID REFERENCES therapeutic_trial_overview(id) ON DELETE CASCADE,
      total INT,
      notes TEXT,
      study_sites TEXT[],
      principal_investigators TEXT[],
      site_status TEXT,
      site_countries TEXT[],
      site_regions TEXT[],
      site_contact_info TEXT[],
      site_notes JSONB
    );

    CREATE TABLE IF NOT EXISTS therapeutic_other_sources (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      trial_id UUID REFERENCES therapeutic_trial_overview(id) ON DELETE CASCADE,
      data TEXT
    );

    CREATE TABLE IF NOT EXISTS therapeutic_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      trial_id UUID REFERENCES therapeutic_trial_overview(id) ON DELETE CASCADE,
      trial_changes_log TEXT,
      trial_added_date DATE,
      last_modified_date DATE,
      last_modified_user TEXT,
      full_review_user TEXT,
      next_review_date DATE,
      internal_note TEXT,
      attachment TEXT
    );

    CREATE TABLE IF NOT EXISTS therapeutic_notes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      trial_id UUID REFERENCES therapeutic_trial_overview(id) ON DELETE CASCADE,
      notes JSONB
    );

    CREATE TABLE IF NOT EXISTS saved_queries (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title TEXT NOT NULL,
      description TEXT,
      trial_id UUID NOT NULL REFERENCES therapeutic_trial_overview(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      query_type TEXT DEFAULT 'trial' CHECK (query_type IN ('trial', 'drug', 'custom')),
      query_data JSONB,
      filters JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS dropdown_categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dropdown_options (
      id SERIAL PRIMARY KEY,
      category_id INTEGER NOT NULL REFERENCES dropdown_categories(id) ON DELETE CASCADE,
      value VARCHAR(255) NOT NULL,
      label VARCHAR(255) NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(category_id, value)
    );

    CREATE INDEX IF NOT EXISTS idx_dropdown_options_category_id ON dropdown_options(category_id);
    CREATE INDEX IF NOT EXISTS idx_dropdown_options_active ON dropdown_options(is_active);
    CREATE INDEX IF NOT EXISTS idx_dropdown_categories_active ON dropdown_categories(is_active);
  `;

  await pool.query(ddl);

  // Clean tables before tests
  await pool.query(`
    TRUNCATE TABLE dropdown_options, dropdown_categories, saved_queries, therapeutic_notes, therapeutic_logs, therapeutic_other_sources, therapeutic_sites, therapeutic_results, therapeutic_timing, therapeutic_participation_criteria, therapeutic_outcome_measured, therapeutic_trial_overview, drug_logs, drug_licences_marketing, drug_other_sources, drug_development, drug_activity, drug_dev_status, drug_overview, user_roles, pending_changes, user_activity, roles, users RESTART IDENTITY CASCADE;
  `);
});

afterAll(async () => {
  await pool.end();
});
