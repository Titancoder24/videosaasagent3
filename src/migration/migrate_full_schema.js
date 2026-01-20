const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.PGSQL_DB_URL,
  ssl: process.env.DATABASE_URL ? {
    rejectUnauthorized: false,
  } : undefined,
});

async function migrateFullSchema() {
  try {
    console.log('🔄 Starting full schema migration...');
    console.log('📊 Connection string:', process.env.DATABASE_URL ? 'Production DB' : process.env.PGSQL_DB_URL ? 'Development DB' : 'Not configured');
    
    const ddl = `
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

      -- Indexes for saved_queries table
      CREATE INDEX IF NOT EXISTS idx_saved_queries_user_id ON saved_queries(user_id);
      CREATE INDEX IF NOT EXISTS idx_saved_queries_trial_id ON saved_queries(trial_id);
      CREATE INDEX IF NOT EXISTS idx_saved_queries_created_at ON saved_queries(created_at);
      CREATE INDEX IF NOT EXISTS idx_saved_queries_title ON saved_queries(title);
    `;

    console.log('📝 Creating all tables...');
    await pool.query(ddl);
    console.log('✅ All base tables created successfully!');
    
    // Apply dropdown management schema
    console.log('\n📝 Applying dropdown management schema...');
    const dropdownSchema = `
      -- Dropdown Categories Table
      CREATE TABLE IF NOT EXISTS dropdown_categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Dropdown Options Table
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

      -- Indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_dropdown_options_category_id ON dropdown_options(category_id);
      CREATE INDEX IF NOT EXISTS idx_dropdown_options_active ON dropdown_options(is_active);
      CREATE INDEX IF NOT EXISTS idx_dropdown_categories_active ON dropdown_categories(is_active);

      -- Insert default dropdown categories
      INSERT INTO dropdown_categories (name, description) VALUES
      ('therapeutic_area', 'Therapeutic areas for drugs and trials'),
      ('disease_type', 'Types of diseases and conditions'),
      ('trial_phase', 'Clinical trial phases'),
      ('trial_status', 'Trial status options'),
      ('development_status', 'Drug development status'),
      ('mechanism_of_action', 'Mechanism of action for drugs'),
      ('biological_target', 'Biological targets for drugs'),
      ('delivery_route', 'Drug delivery routes'),
      ('delivery_medium', 'Drug delivery mediums'),
      ('company_type', 'Types of pharmaceutical companies'),
      ('country', 'Countries for trials and companies'),
      ('sponsor_field_activity', 'Sponsor field activity types'),
      ('line_of_therapy', 'Lines of therapy for treatments'),
      ('patient_segment', 'Patient segments for trials'),
      ('trial_tags', 'Tags for categorizing trials'),
      ('sex', 'Sex options for trials'),
      ('healthy_volunteers', 'Healthy volunteer options'),
      ('trial_record_status', 'Trial record status options'),
      ('study_design_keywords', 'Study design keywords for outcome measured tab'),
      ('registry_type', 'Registry types for timing tab'),
      ('trial_outcome', 'Trial outcome options for results tab'),
      ('result_type', 'Result type options for results tab'),
      ('adverse_event_reported', 'Adverse event reported options for results tab'),
      ('adverse_event_type', 'Adverse event type options for results tab'),
      ('log_type', 'Log type options for logs tab'),
      ('sponsor_collaborators', 'Sponsor and collaborators options'),
      ('associated_cro', 'Associated CRO options'),
      ('region', 'Region options for trials')
      ON CONFLICT (name) DO NOTHING;

      -- Insert default options for each category
      -- Therapeutic Area
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'autoimmune', 'Autoimmune', 1 FROM dropdown_categories WHERE name = 'therapeutic_area'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'cardiovascular', 'Cardiovascular', 2 FROM dropdown_categories WHERE name = 'therapeutic_area'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'endocrinology', 'Endocrinology', 3 FROM dropdown_categories WHERE name = 'therapeutic_area'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'gastrointestinal', 'Gastrointestinal', 4 FROM dropdown_categories WHERE name = 'therapeutic_area'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'infectious', 'Infectious', 5 FROM dropdown_categories WHERE name = 'therapeutic_area'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'oncology', 'Oncology', 6 FROM dropdown_categories WHERE name = 'therapeutic_area'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'dermatology', 'Dermatology', 7 FROM dropdown_categories WHERE name = 'therapeutic_area'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'vaccines', 'Vaccines', 8 FROM dropdown_categories WHERE name = 'therapeutic_area'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'cns_neurology', 'CNS/Neurology', 9 FROM dropdown_categories WHERE name = 'therapeutic_area'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'ophthalmology', 'Ophthalmology', 10 FROM dropdown_categories WHERE name = 'therapeutic_area'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'immunology', 'Immunology', 11 FROM dropdown_categories WHERE name = 'therapeutic_area'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'rheumatology', 'Rheumatology', 12 FROM dropdown_categories WHERE name = 'therapeutic_area'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'haematology', 'Haematology', 13 FROM dropdown_categories WHERE name = 'therapeutic_area'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'nephrology', 'Nephrology', 14 FROM dropdown_categories WHERE name = 'therapeutic_area'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'urology', 'Urology', 15 FROM dropdown_categories WHERE name = 'therapeutic_area'
      ON CONFLICT (category_id, value) DO NOTHING;

      -- Trial Phase
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'phase_i', 'Phase I', 1 FROM dropdown_categories WHERE name = 'trial_phase'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'phase_i_ii', 'Phase I/II', 2 FROM dropdown_categories WHERE name = 'trial_phase'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'phase_ii', 'Phase II', 3 FROM dropdown_categories WHERE name = 'trial_phase'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'phase_ii_iii', 'Phase II/III', 4 FROM dropdown_categories WHERE name = 'trial_phase'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'phase_iii', 'Phase III', 5 FROM dropdown_categories WHERE name = 'trial_phase'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'phase_iii_iv', 'Phase III/IV', 6 FROM dropdown_categories WHERE name = 'trial_phase'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'phase_iv', 'Phase IV', 7 FROM dropdown_categories WHERE name = 'trial_phase'
      ON CONFLICT (category_id, value) DO NOTHING;

      -- Trial Status
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'planned', 'Planned', 1 FROM dropdown_categories WHERE name = 'trial_status'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'open', 'Open', 2 FROM dropdown_categories WHERE name = 'trial_status'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'closed', 'Closed', 3 FROM dropdown_categories WHERE name = 'trial_status'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'completed', 'Completed', 4 FROM dropdown_categories WHERE name = 'trial_status'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'terminated', 'Terminated', 5 FROM dropdown_categories WHERE name = 'trial_status'
      ON CONFLICT (category_id, value) DO NOTHING;

      -- Development Status
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'launched', 'Launched', 1 FROM dropdown_categories WHERE name = 'development_status'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'no_development_reported', 'No Development Reported', 2 FROM dropdown_categories WHERE name = 'development_status'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'discontinued', 'Discontinued', 3 FROM dropdown_categories WHERE name = 'development_status'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'clinical_phase_1', 'Clinical Phase I', 4 FROM dropdown_categories WHERE name = 'development_status'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'clinical_phase_2', 'Clinical Phase II', 5 FROM dropdown_categories WHERE name = 'development_status'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'clinical_phase_3', 'Clinical Phase III', 6 FROM dropdown_categories WHERE name = 'development_status'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'clinical_phase_4', 'Clinical Phase IV', 7 FROM dropdown_categories WHERE name = 'development_status'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'preclinical', 'Preclinical', 8 FROM dropdown_categories WHERE name = 'development_status'
      ON CONFLICT (category_id, value) DO NOTHING;

      -- Company Type
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'originator', 'Originator', 1 FROM dropdown_categories WHERE name = 'company_type'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'generic', 'Generic', 2 FROM dropdown_categories WHERE name = 'company_type'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'biosimilar', 'Biosimilar', 3 FROM dropdown_categories WHERE name = 'company_type'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'licensed', 'Licensed', 4 FROM dropdown_categories WHERE name = 'company_type'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'partnership', 'Partnership', 5 FROM dropdown_categories WHERE name = 'company_type'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'open_source', 'Open Source', 6 FROM dropdown_categories WHERE name = 'company_type'
      ON CONFLICT (category_id, value) DO NOTHING;

      -- Sex
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'male', 'Male', 1 FROM dropdown_categories WHERE name = 'sex'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'female', 'Female', 2 FROM dropdown_categories WHERE name = 'sex'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'both', 'Both', 3 FROM dropdown_categories WHERE name = 'sex'
      ON CONFLICT (category_id, value) DO NOTHING;

      -- Healthy Volunteers
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'yes', 'Yes', 1 FROM dropdown_categories WHERE name = 'healthy_volunteers'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'no', 'No', 2 FROM dropdown_categories WHERE name = 'healthy_volunteers'
      ON CONFLICT (category_id, value) DO NOTHING;

      -- Study Design Keywords
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'placebo_control', 'Placebo-control', 1 FROM dropdown_categories WHERE name = 'study_design_keywords'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'active_control', 'Active control', 2 FROM dropdown_categories WHERE name = 'study_design_keywords'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'randomized', 'Randomized', 3 FROM dropdown_categories WHERE name = 'study_design_keywords'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'non_randomized', 'Non-Randomized', 4 FROM dropdown_categories WHERE name = 'study_design_keywords'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'multiple_blinded', 'Multiple-Blinded', 5 FROM dropdown_categories WHERE name = 'study_design_keywords'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'single_blinded', 'Single-Blinded', 6 FROM dropdown_categories WHERE name = 'study_design_keywords'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'open', 'Open', 7 FROM dropdown_categories WHERE name = 'study_design_keywords'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'multi_centre', 'Multi-centre', 8 FROM dropdown_categories WHERE name = 'study_design_keywords'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'safety', 'Safety', 9 FROM dropdown_categories WHERE name = 'study_design_keywords'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'efficacy', 'Efficacy', 10 FROM dropdown_categories WHERE name = 'study_design_keywords'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'tolerability', 'Tolerability', 11 FROM dropdown_categories WHERE name = 'study_design_keywords'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'pharmacokinetics', 'Pharmacokinetics', 12 FROM dropdown_categories WHERE name = 'study_design_keywords'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'pharmacodynamics', 'Pharmacodynamics', 13 FROM dropdown_categories WHERE name = 'study_design_keywords'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'interventional', 'Interventional', 14 FROM dropdown_categories WHERE name = 'study_design_keywords'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'treatment', 'Treatment', 15 FROM dropdown_categories WHERE name = 'study_design_keywords'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'parallel_assignment', 'Parallel Assignment', 16 FROM dropdown_categories WHERE name = 'study_design_keywords'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'single_group_assignment', 'Single group assignment', 17 FROM dropdown_categories WHERE name = 'study_design_keywords'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'prospective', 'Prospective', 18 FROM dropdown_categories WHERE name = 'study_design_keywords'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'cohort', 'Cohort', 19 FROM dropdown_categories WHERE name = 'study_design_keywords'
      ON CONFLICT (category_id, value) DO NOTHING;

      -- Registry Type
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'clinicaltrials_gov', 'ClinicalTrials.gov', 1 FROM dropdown_categories WHERE name = 'registry_type'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'euctr', 'EUCTR', 2 FROM dropdown_categories WHERE name = 'registry_type'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'ctri', 'CTRI', 3 FROM dropdown_categories WHERE name = 'registry_type'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'anzctr', 'ANZCTR', 4 FROM dropdown_categories WHERE name = 'registry_type'
      ON CONFLICT (category_id, value) DO NOTHING;

      -- Trial Outcome
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'completed_primary_endpoints_met', 'Completed – Primary endpoints met.', 1 FROM dropdown_categories WHERE name = 'trial_outcome'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'completed_primary_endpoints_not_met', 'Completed – Primary endpoints not met.', 2 FROM dropdown_categories WHERE name = 'trial_outcome'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'completed_outcome_unknown', 'Completed – Outcome unknown', 3 FROM dropdown_categories WHERE name = 'trial_outcome'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'completed_outcome_indeterminate', 'Completed – Outcome indeterminate', 4 FROM dropdown_categories WHERE name = 'trial_outcome'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'terminated_safety_adverse_effects', 'Terminated – Safety/adverse effects', 5 FROM dropdown_categories WHERE name = 'trial_outcome'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'terminated_lack_of_efficacy', 'Terminated – Lack of efficacy', 6 FROM dropdown_categories WHERE name = 'trial_outcome'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'terminated_insufficient_enrolment', 'Terminated – Insufficient enrolment', 7 FROM dropdown_categories WHERE name = 'trial_outcome'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'terminated_business_drug_strategy_shift', 'Terminated – Business Decision, Drug strategy shift', 8 FROM dropdown_categories WHERE name = 'trial_outcome'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'terminated_business_pipeline_reprioritization', 'Terminated - Business Decision, Pipeline Reprioritization', 9 FROM dropdown_categories WHERE name = 'trial_outcome'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'terminated_business_other', 'Terminated - Business Decision, Other', 10 FROM dropdown_categories WHERE name = 'trial_outcome'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'terminated_lack_of_funding', 'Terminated – Lack of funding', 11 FROM dropdown_categories WHERE name = 'trial_outcome'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'terminated_planned_but_never_initiated', 'Terminated – Planned but never initiated', 12 FROM dropdown_categories WHERE name = 'trial_outcome'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'terminated_other', 'Terminated – Other', 13 FROM dropdown_categories WHERE name = 'trial_outcome'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'terminated_unknown', 'Terminated – Unknown', 14 FROM dropdown_categories WHERE name = 'trial_outcome'
      ON CONFLICT (category_id, value) DO NOTHING;

      -- Result Type
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'interim', 'Interim', 1 FROM dropdown_categories WHERE name = 'result_type'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'full_results', 'Full Results', 2 FROM dropdown_categories WHERE name = 'result_type'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'primary_endpoint_results', 'Primary Endpoint Results', 3 FROM dropdown_categories WHERE name = 'result_type'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'analysis', 'Analysis', 4 FROM dropdown_categories WHERE name = 'result_type'
      ON CONFLICT (category_id, value) DO NOTHING;

      -- Adverse Event Reported
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'yes', 'Yes', 1 FROM dropdown_categories WHERE name = 'adverse_event_reported'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'no', 'No', 2 FROM dropdown_categories WHERE name = 'adverse_event_reported'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'not_reported', 'Not Reported', 3 FROM dropdown_categories WHERE name = 'adverse_event_reported'
      ON CONFLICT (category_id, value) DO NOTHING;

      -- Adverse Event Type
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'serious', 'Serious', 1 FROM dropdown_categories WHERE name = 'adverse_event_type'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'non_serious', 'Non-Serious', 2 FROM dropdown_categories WHERE name = 'adverse_event_type'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'severe', 'Severe', 3 FROM dropdown_categories WHERE name = 'adverse_event_type'
      ON CONFLICT (category_id, value) DO NOTHING;

      -- Log Type
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'creation', 'Creation', 1 FROM dropdown_categories WHERE name = 'log_type'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'update', 'Update', 2 FROM dropdown_categories WHERE name = 'log_type'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'deletion', 'Deletion', 3 FROM dropdown_categories WHERE name = 'log_type'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'approval', 'Approval', 4 FROM dropdown_categories WHERE name = 'log_type'
      ON CONFLICT (category_id, value) DO NOTHING;

      -- Trial Record Status
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'development_in_progress', 'Development In Progress (DIP)', 1 FROM dropdown_categories WHERE name = 'trial_record_status'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'in_production', 'In Production (IP)', 2 FROM dropdown_categories WHERE name = 'trial_record_status'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'update_in_progress', 'Update In Progress (UIP)', 3 FROM dropdown_categories WHERE name = 'trial_record_status'
      ON CONFLICT (category_id, value) DO NOTHING;

      -- Trial Tags
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'biomarker_efficacy', 'Biomarker-Efficacy', 1 FROM dropdown_categories WHERE name = 'trial_tags'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'biomarker_toxicity', 'Biomarker-Toxicity', 2 FROM dropdown_categories WHERE name = 'trial_tags'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'expanded_access', 'Expanded Access', 3 FROM dropdown_categories WHERE name = 'trial_tags'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'expanded_indication', 'Expanded Indication', 4 FROM dropdown_categories WHERE name = 'trial_tags'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'first_in_human', 'First in Human', 5 FROM dropdown_categories WHERE name = 'trial_tags'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'investigator_initiated', 'Investigator-Initiated', 6 FROM dropdown_categories WHERE name = 'trial_tags'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'io_cytotoxic_combination', 'IO/Cytotoxic Combination', 7 FROM dropdown_categories WHERE name = 'trial_tags'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'io_hormonal_combination', 'IO/Hormonal Combination', 8 FROM dropdown_categories WHERE name = 'trial_tags'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'io_io_combination', 'IO/IO Combination', 9 FROM dropdown_categories WHERE name = 'trial_tags'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'io_other_combination', 'IO/Other Combination', 10 FROM dropdown_categories WHERE name = 'trial_tags'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'io_radiotherapy_combination', 'IO/Radiotherapy Combination', 11 FROM dropdown_categories WHERE name = 'trial_tags'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'io_targeted_combination', 'IO/Targeted Combination', 12 FROM dropdown_categories WHERE name = 'trial_tags'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'microdosing', 'Microdosing', 13 FROM dropdown_categories WHERE name = 'trial_tags'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'pgx_biomarker_identification', 'PGX-Biomarker Identification/Evaluation', 14 FROM dropdown_categories WHERE name = 'trial_tags'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'pgx_pathogen', 'PGX-Pathogen', 15 FROM dropdown_categories WHERE name = 'trial_tags'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'pgx_patient_preselection', 'PGX-Patient Preselection/Stratification', 16 FROM dropdown_categories WHERE name = 'trial_tags'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'post_marketing_commitment', 'Post-Marketing Commitment', 17 FROM dropdown_categories WHERE name = 'trial_tags'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'registration', 'Registration', 18 FROM dropdown_categories WHERE name = 'trial_tags'
      ON CONFLICT (category_id, value) DO NOTHING;

      -- Sponsor and Collaborators
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'Pfizer', 'Pfizer', 1 FROM dropdown_categories WHERE name = 'sponsor_collaborators'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'Novartis', 'Novartis', 2 FROM dropdown_categories WHERE name = 'sponsor_collaborators'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'AstraZeneca', 'AstraZeneca', 3 FROM dropdown_categories WHERE name = 'sponsor_collaborators'
      ON CONFLICT (category_id, value) DO NOTHING;

      -- Sponsor Field of Activity
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'pharmaceutical_company', 'Pharmaceutical Company', 1 FROM dropdown_categories WHERE name = 'sponsor_field_activity'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'university_academy', 'University/Academy', 2 FROM dropdown_categories WHERE name = 'sponsor_field_activity'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'investigator', 'Investigator', 3 FROM dropdown_categories WHERE name = 'sponsor_field_activity'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'cro', 'CRO', 4 FROM dropdown_categories WHERE name = 'sponsor_field_activity'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'hospital', 'Hospital', 5 FROM dropdown_categories WHERE name = 'sponsor_field_activity'
      ON CONFLICT (category_id, value) DO NOTHING;

      -- Associated CRO
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'IQVIA', 'IQVIA', 1 FROM dropdown_categories WHERE name = 'associated_cro'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'Syneos', 'Syneos', 2 FROM dropdown_categories WHERE name = 'associated_cro'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'PPD', 'PPD', 3 FROM dropdown_categories WHERE name = 'associated_cro'
      ON CONFLICT (category_id, value) DO NOTHING;

      -- Countries
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'united_states', 'United States', 1 FROM dropdown_categories WHERE name = 'country'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'canada', 'Canada', 2 FROM dropdown_categories WHERE name = 'country'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'united_kingdom', 'United Kingdom', 3 FROM dropdown_categories WHERE name = 'country'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'germany', 'Germany', 4 FROM dropdown_categories WHERE name = 'country'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'france', 'France', 5 FROM dropdown_categories WHERE name = 'country'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'italy', 'Italy', 6 FROM dropdown_categories WHERE name = 'country'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'spain', 'Spain', 7 FROM dropdown_categories WHERE name = 'country'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'japan', 'Japan', 8 FROM dropdown_categories WHERE name = 'country'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'china', 'China', 9 FROM dropdown_categories WHERE name = 'country'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'india', 'India', 10 FROM dropdown_categories WHERE name = 'country'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'australia', 'Australia', 11 FROM dropdown_categories WHERE name = 'country'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'brazil', 'Brazil', 12 FROM dropdown_categories WHERE name = 'country'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'mexico', 'Mexico', 13 FROM dropdown_categories WHERE name = 'country'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'south_korea', 'South Korea', 14 FROM dropdown_categories WHERE name = 'country'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'switzerland', 'Switzerland', 15 FROM dropdown_categories WHERE name = 'country'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'netherlands', 'Netherlands', 16 FROM dropdown_categories WHERE name = 'country'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'belgium', 'Belgium', 17 FROM dropdown_categories WHERE name = 'country'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'sweden', 'Sweden', 18 FROM dropdown_categories WHERE name = 'country'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'norway', 'Norway', 19 FROM dropdown_categories WHERE name = 'country'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'denmark', 'Denmark', 20 FROM dropdown_categories WHERE name = 'country'
      ON CONFLICT (category_id, value) DO NOTHING;

      -- Region
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'north_america', 'North America', 1 FROM dropdown_categories WHERE name = 'region'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'europe', 'Europe', 2 FROM dropdown_categories WHERE name = 'region'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'asia_pacific', 'Asia Pacific', 3 FROM dropdown_categories WHERE name = 'region'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'latin_america', 'Latin America', 4 FROM dropdown_categories WHERE name = 'region'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'africa', 'Africa', 5 FROM dropdown_categories WHERE name = 'region'
      ON CONFLICT (category_id, value) DO NOTHING;
      INSERT INTO dropdown_options (category_id, value, label, sort_order) 
      SELECT id, 'middle_east', 'Middle East', 6 FROM dropdown_categories WHERE name = 'region'
      ON CONFLICT (category_id, value) DO NOTHING;
    `;
    await pool.query(dropdownSchema);
    console.log('✅ Dropdown management schema applied successfully!');
    
    // Now add the additional columns to therapeutic_timing that aren't in the base schema
    console.log('\n📝 Adding additional columns to therapeutic_timing...');
    const timingMigrations = [
      {
        name: 'Add overall_duration_complete column',
        query: `
          DO $$ 
          BEGIN 
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name='therapeutic_timing' AND column_name='overall_duration_complete'
            ) THEN
              ALTER TABLE therapeutic_timing ADD COLUMN overall_duration_complete TEXT;
              RAISE NOTICE 'Column overall_duration_complete added successfully';
            ELSE
              RAISE NOTICE 'Column overall_duration_complete already exists';
            END IF;
          END $$;
        `
      },
      {
        name: 'Add overall_duration_publish column',
        query: `
          DO $$ 
          BEGIN 
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name='therapeutic_timing' AND column_name='overall_duration_publish'
            ) THEN
              ALTER TABLE therapeutic_timing ADD COLUMN overall_duration_publish TEXT;
              RAISE NOTICE 'Column overall_duration_publish added successfully';
            ELSE
              RAISE NOTICE 'Column overall_duration_publish already exists';
            END IF;
          END $$;
        `
      },
      {
        name: 'Add timing_references column (JSONB)',
        query: `
          DO $$ 
          BEGIN 
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name='therapeutic_timing' AND column_name='timing_references'
            ) THEN
              ALTER TABLE therapeutic_timing ADD COLUMN timing_references JSONB;
              RAISE NOTICE 'Column timing_references added successfully';
            ELSE
              RAISE NOTICE 'Column timing_references already exists';
            END IF;
          END $$;
        `
      }
    ];
    
    for (const migration of timingMigrations) {
      console.log(`  📝 ${migration.name}...`);
      await pool.query(migration.query);
      console.log(`  ✅ ${migration.name} - Done`);
    }
    
    // Add missing columns to therapeutic_results table
    console.log('\n📝 Adding additional columns to therapeutic_results...');
    const resultsMigrations = [
      {
        name: 'Add results_available column',
        query: `
          DO $$ 
          BEGIN 
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name='therapeutic_results' AND column_name='results_available'
            ) THEN
              ALTER TABLE therapeutic_results ADD COLUMN results_available TEXT;
              RAISE NOTICE 'Column results_available added successfully';
            ELSE
              RAISE NOTICE 'Column results_available already exists';
            END IF;
          END $$;
        `
      },
      {
        name: 'Add endpoints_met column',
        query: `
          DO $$ 
          BEGIN 
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name='therapeutic_results' AND column_name='endpoints_met'
            ) THEN
              ALTER TABLE therapeutic_results ADD COLUMN endpoints_met TEXT;
              RAISE NOTICE 'Column endpoints_met added successfully';
            ELSE
              RAISE NOTICE 'Column endpoints_met already exists';
            END IF;
          END $$;
        `
      },
      {
        name: 'Add trial_outcome_content column',
        query: `
          DO $$ 
          BEGIN 
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name='therapeutic_results' AND column_name='trial_outcome_content'
            ) THEN
              ALTER TABLE therapeutic_results ADD COLUMN trial_outcome_content TEXT;
              RAISE NOTICE 'Column trial_outcome_content added successfully';
            ELSE
              RAISE NOTICE 'Column trial_outcome_content already exists';
            END IF;
          END $$;
        `
      },
      {
        name: 'Add trial_outcome_link column',
        query: `
          DO $$ 
          BEGIN 
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name='therapeutic_results' AND column_name='trial_outcome_link'
            ) THEN
              ALTER TABLE therapeutic_results ADD COLUMN trial_outcome_link TEXT;
              RAISE NOTICE 'Column trial_outcome_link added successfully';
            ELSE
              RAISE NOTICE 'Column trial_outcome_link already exists';
            END IF;
          END $$;
        `
      },
      {
        name: 'Add trial_outcome_attachment column',
        query: `
          DO $$ 
          BEGIN 
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name='therapeutic_results' AND column_name='trial_outcome_attachment'
            ) THEN
              ALTER TABLE therapeutic_results ADD COLUMN trial_outcome_attachment TEXT;
              RAISE NOTICE 'Column trial_outcome_attachment added successfully';
            ELSE
              RAISE NOTICE 'Column trial_outcome_attachment already exists';
            END IF;
          END $$;
        `
      },
      {
        name: 'Add site_notes column (JSONB)',
        query: `
          DO $$ 
          BEGIN 
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name='therapeutic_results' AND column_name='site_notes'
            ) THEN
              ALTER TABLE therapeutic_results ADD COLUMN site_notes JSONB;
              RAISE NOTICE 'Column site_notes added successfully';
            ELSE
              RAISE NOTICE 'Column site_notes already exists';
            END IF;
          END $$;
        `
      }
    ];
    
    for (const migration of resultsMigrations) {
      console.log(`  📝 ${migration.name}...`);
      await pool.query(migration.query);
      console.log(`  ✅ ${migration.name} - Done`);
    }
    
    // Add missing columns to therapeutic_logs table
    console.log('\n📝 Adding additional columns to therapeutic_logs...');
    const logsMigrations = [
      {
        name: 'Add attachment column',
        query: `
          DO $$ 
          BEGIN 
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name='therapeutic_logs' AND column_name='attachment'
            ) THEN
              ALTER TABLE therapeutic_logs ADD COLUMN attachment TEXT;
              RAISE NOTICE 'Column attachment added successfully';
            ELSE
              RAISE NOTICE 'Column attachment already exists';
            END IF;
          END $$;
        `
      }
    ];
    
    for (const migration of logsMigrations) {
      console.log(`  📝 ${migration.name}...`);
      await pool.query(migration.query);
      console.log(`  ✅ ${migration.name} - Done`);
    }
    
    console.log('\n✅ Full schema migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during migration:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
migrateFullSchema();

