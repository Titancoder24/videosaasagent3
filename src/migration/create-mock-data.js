const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.PGSQL_DB_URL,
  ssl: process.env.DATABASE_URL ? {
    rejectUnauthorized: false,
  } : undefined,
});

// Helper function to get random element from array
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper function to get random date
const randomDate = (start, end) => {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
};

// Helper function to get future date
const futureDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

// Mock data arrays
const therapeuticAreas = [
  'oncology', 'cardiovascular', 'autoimmune', 'infectious', 'cns_neurology',
  'endocrinology', 'gastrointestinal', 'dermatology', 'immunology', 'rheumatology', 'haematology'
];

const diseaseTypes = [
  'Breast Cancer', 'Lung Cancer', 'Type 2 Diabetes', 'Hypertension', 'Rheumatoid Arthritis',
  'Multiple Sclerosis', 'Crohn\'s Disease', 'Psoriasis', 'HIV', 'Leukemia', 'Lymphoma'
];

const trialPhases = ['phase_i', 'phase_ii', 'phase_iii', 'phase_i_ii', 'phase_ii_iii'];

const trialStatuses = ['planned', 'open', 'closed', 'completed', 'terminated'];

const developmentStatuses = [
  'launched', 'clinical_phase_1', 'clinical_phase_2', 'clinical_phase_3',
  'preclinical', 'discontinued'
];

const companies = [
  'Pfizer', 'Novartis', 'AstraZeneca', 'Merck', 'Johnson & Johnson',
  'Roche', 'Bristol-Myers Squibb', 'GlaxoSmithKline', 'Sanofi', 'AbbVie', 'Gilead'
];

const countries = [
  'United States', 'Canada', 'United Kingdom', 'Germany', 'France',
  'Italy', 'Spain', 'Japan', 'China', 'India', 'Australia'
];

const regions = ['north_america', 'europe', 'asia_pacific', 'latin_america'];

const mechanismsOfAction = [
  'Monoclonal Antibody', 'Small Molecule', 'Enzyme Inhibitor', 'Receptor Antagonist',
  'Gene Therapy', 'Cell Therapy', 'Vaccine', 'Hormone Therapy', 'Immunotherapy', 'Antibiotic'
];

const deliveryRoutes = ['Oral', 'Intravenous', 'Subcutaneous', 'Intramuscular', 'Topical', 'Inhalation'];

const deliveryMediums = ['Tablet', 'Capsule', 'Injection', 'Infusion', 'Cream', 'Spray'];

// Create mock therapeutic trials
async function createMockTherapeutics() {
  console.log('📝 Creating 11 mock therapeutic trials...');
  
  const therapeuticIds = [];
  
  for (let i = 1; i <= 11; i++) {
    const therapeuticArea = randomElement(therapeuticAreas);
    const diseaseType = randomElement(diseaseTypes);
    const phase = randomElement(trialPhases);
    const status = randomElement(trialStatuses);
    const company = randomElement(companies);
    const country = randomElement(countries);
    const region = randomElement(regions);
    
    // Create therapeutic_trial_overview
    const overviewQuery = `
      INSERT INTO therapeutic_trial_overview (
        therapeutic_area, trial_id, trial_identifier, trial_phase, status,
        primary_drugs, other_drugs, title, disease_type, patient_segment,
        line_of_therapy, reference_links, trial_tags, sponsor_collaborators,
        sponsor_field_activity, associated_cro, countries, region, trial_record_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING id;
    `;
    
    const trialId = `TB-${String(i).padStart(4, '0')}`;
    const identifiers = [`NCT${String(Math.floor(Math.random() * 10000000)).padStart(8, '0')}`, `EUCTR-${String(Math.floor(Math.random() * 100000)).padStart(6, '0')}`];
    
    const result = await pool.query(overviewQuery, [
      therapeuticArea,
      trialId,
      identifiers,
      phase,
      status,
      `Drug-${i}`,
      i % 2 === 0 ? `Adjuvant-${i}` : null,
      `Phase ${phase.replace('phase_', '').replace('_', '/').toUpperCase()} Study of Drug-${i} in ${diseaseType}`,
      diseaseType,
      i % 3 === 0 ? 'Adult' : i % 3 === 1 ? 'Pediatric' : 'Elderly',
      i % 2 === 0 ? 'First Line' : 'Second Line',
      [`https://clinicaltrials.gov/ct2/show/${identifiers[0]}`, `https://www.clinicaltrialsregister.eu/ctr-search/trial/${identifiers[1]}`],
      i % 2 === 0 ? 'biomarker_efficacy' : 'first_in_human',
      company,
      'pharmaceutical_company',
      i % 3 === 0 ? 'IQVIA' : null,
      country,
      region,
      'in_production'
    ]);
    
    const trialUuid = result.rows[0].id;
    therapeuticIds.push(trialUuid);
    
    // Create therapeutic_outcome_measured
    const outcomeQuery = `
      INSERT INTO therapeutic_outcome_measured (
        trial_id, purpose_of_trial, summary, primary_outcome_measure,
        other_outcome_measure, study_design_keywords, study_design,
        treatment_regimen, number_of_arms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
    `;
    
    await pool.query(outcomeQuery, [
      trialUuid,
      `To evaluate the efficacy and safety of Drug-${i} in patients with ${diseaseType}`,
      `This is a ${phase.replace('phase_', '').replace('_', '/').toUpperCase()} study designed to assess the primary and secondary endpoints.`,
      'Overall Response Rate (ORR)',
      'Progression-Free Survival (PFS), Overall Survival (OS), Safety',
      'randomized, placebo_control, multi_centre',
      'Randomized, double-blind, placebo-controlled, multi-center study',
      `Drug-${i} administered ${randomElement(deliveryRoutes).toLowerCase()} at recommended dose`,
      i % 2 === 0 ? 2 : 3
    ]);
    
    // Create therapeutic_participation_criteria
    const criteriaQuery = `
      INSERT INTO therapeutic_participation_criteria (
        trial_id, inclusion_criteria, exclusion_criteria, age_from, age_to,
        subject_type, sex, healthy_volunteers, target_no_volunteers, actual_enrolled_volunteers
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
    `;
    
    await pool.query(criteriaQuery, [
      trialUuid,
      `Diagnosed with ${diseaseType}, ECOG performance status 0-1, adequate organ function`,
      'Pregnant or nursing women, active infection, prior malignancy within 5 years',
      '18',
      '75',
      'Patient',
      'both',
      'no',
      String(Math.floor(Math.random() * 200) + 50),
      status === 'completed' || status === 'closed' ? String(Math.floor(Math.random() * 200) + 50) : null
    ]);
    
    // Create therapeutic_timing
    const timingQuery = `
      INSERT INTO therapeutic_timing (
        trial_id, start_date_actual, start_date_estimated, inclusion_period_actual,
        enrollment_closed_estimated, primary_outcome_duration_estimated,
        trial_end_date_estimated, result_published_date_estimated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
    `;
    
    const startDate = randomDate(new Date(2020, 0, 1), new Date(2023, 11, 31));
    const estimatedEnd = futureDate(Math.floor(Math.random() * 365) + 180);
    
    await pool.query(timingQuery, [
      trialUuid,
      status !== 'planned' ? startDate : null,
      status === 'planned' ? futureDate(30) : startDate,
      status !== 'planned' ? '12 months' : null,
      status === 'open' ? futureDate(180) : null,
      '24 months',
      estimatedEnd,
      status === 'completed' ? randomDate(new Date(2023, 0, 1), new Date()) : futureDate(365)
    ]);
    
    // Create therapeutic_results
    if (status === 'completed' || status === 'closed') {
      const resultsQuery = `
        INSERT INTO therapeutic_results (
          trial_id, trial_outcome, reference, trial_results,
          adverse_event_reported, adverse_event_type, results_available,
          endpoints_met, trial_outcome_content
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
      `;
      
      await pool.query(resultsQuery, [
        trialUuid,
        i % 3 === 0 ? 'completed_primary_endpoints_met' : 'completed_primary_endpoints_not_met',
        `Publication PMID: ${Math.floor(Math.random() * 9000000) + 1000000}`,
        ['Primary endpoint met', 'Secondary endpoints partially met', 'Safety profile acceptable'],
        'yes',
        i % 2 === 0 ? 'non_serious' : 'serious',
        'full_results',
        i % 3 === 0 ? 'Yes' : 'Partial',
        `The trial demonstrated ${i % 3 === 0 ? 'significant' : 'moderate'} efficacy with acceptable safety profile.`
      ]);
    }
    
    // Create therapeutic_sites
    const sitesQuery = `
      INSERT INTO therapeutic_sites (
        trial_id, total, notes, study_sites, principal_investigators,
        site_status, site_countries, site_regions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
    `;
    
    const numSites = Math.floor(Math.random() * 20) + 5;
    const siteNames = Array.from({ length: numSites }, (_, idx) => `Site ${idx + 1} - ${country} Medical Center`);
    const investigators = Array.from({ length: numSites }, (_, idx) => `Dr. ${['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'][idx % 5]} ${['A', 'B', 'C', 'D', 'E'][Math.floor(idx / 5)]}`);
    
    await pool.query(sitesQuery, [
      trialUuid,
      numSites,
      `Multi-center trial conducted across ${numSites} sites`,
      siteNames,
      investigators,
      status === 'open' ? 'active' : status === 'completed' ? 'closed' : 'pending',
      [country, ...Array.from({ length: Math.floor(Math.random() * 3) }, () => randomElement(countries))],
      [region]
    ]);
    
    // Create therapeutic_other_sources
    const otherSourcesQuery = `
      INSERT INTO therapeutic_other_sources (trial_id, data) VALUES ($1, $2);
    `;
    
    await pool.query(otherSourcesQuery, [
      trialUuid,
      `Additional data from external sources for ${trialId}`
    ]);
    
    // Create therapeutic_logs
    const logsQuery = `
      INSERT INTO therapeutic_logs (
        trial_id, trial_changes_log, trial_added_date, last_modified_date,
        last_modified_user, full_review_user, next_review_date, internal_note
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
    `;
    
    await pool.query(logsQuery, [
      trialUuid,
      `Trial created on ${startDate}. Status updated to ${status}.`,
      startDate,
      new Date().toISOString().split('T')[0],
      'admin@example.com',
      'reviewer@example.com',
      futureDate(90),
      `Internal notes for ${trialId}: Monitoring ongoing.`
    ]);
    
    // Create therapeutic_notes
    const notesQuery = `
      INSERT INTO therapeutic_notes (trial_id, notes) VALUES ($1, $2);
    `;
    
    await pool.query(notesQuery, [
      trialUuid,
      JSON.stringify({
        general: `Notes for ${trialId}`,
        updates: [`Trial ${trialId} is progressing well`, 'Patient enrollment on track'],
        concerns: []
      })
    ]);
    
    console.log(`  ✅ Created therapeutic trial ${i}/11: ${trialId}`);
  }
  
  console.log('✅ All 11 therapeutic trials created successfully!\n');
  return therapeuticIds;
}

// Create mock drugs
async function createMockDrugs() {
  console.log('📝 Creating 11 mock drugs...');
  
  const drugIds = [];
  
  for (let i = 1; i <= 11; i++) {
    const therapeuticArea = randomElement(therapeuticAreas);
    const diseaseType = randomElement(diseaseTypes);
    const developmentStatus = randomElement(developmentStatuses);
    const company = randomElement(companies);
    const mechanism = randomElement(mechanismsOfAction);
    const route = randomElement(deliveryRoutes);
    const medium = randomElement(deliveryMediums);
    
    // Create drug_overview
    const overviewQuery = `
      INSERT INTO drug_overview (
        drug_name, generic_name, other_name, primary_name, global_status,
        development_status, drug_summary, originator, other_active_companies,
        therapeutic_area, disease_type, regulator_designations, source_link,
        drug_record_status, is_approved
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id;
    `;
    
    const drugName = `Drug-${i}`;
    const genericName = `Generic-${i}`;
    
    const result = await pool.query(overviewQuery, [
      drugName,
      genericName,
      `Alternative-${i}`,
      drugName,
      developmentStatus === 'launched' ? 'Approved' : 'In Development',
      developmentStatus,
      `${drugName} is a ${mechanism} indicated for the treatment of ${diseaseType}. It works by targeting specific biological pathways involved in the disease progression.`,
      company,
      i % 2 === 0 ? `${randomElement(companies)}, ${randomElement(companies)}` : null,
      therapeuticArea,
      diseaseType,
      i % 3 === 0 ? 'Orphan Drug Designation' : i % 3 === 1 ? 'Fast Track Designation' : 'Breakthrough Therapy',
      `https://www.fda.gov/drugs/drug-approvals-and-databases/${drugName.toLowerCase()}`,
      'in_production',
      developmentStatus === 'launched'
    ]);
    
    const drugUuid = result.rows[0].id;
    drugIds.push(drugUuid);
    
    // Create drug_dev_status
    const devStatusQuery = `
      INSERT INTO drug_dev_status (
        drug_over_id, disease_type, therapeutic_class, company, company_type, status, reference
      ) VALUES ($1, $2, $3, $4, $5, $6, $7);
    `;
    
    await pool.query(devStatusQuery, [
      drugUuid,
      diseaseType,
      `${therapeuticArea} therapeutic`,
      company,
      'originator',
      developmentStatus,
      JSON.stringify({
        source: 'Company Pipeline',
        date: new Date().toISOString().split('T')[0],
        notes: `Development status update for ${drugName}`
      })
    ]);
    
    // Create drug_activity
    const activityQuery = `
      INSERT INTO drug_activity (
        drug_over_id, mechanism_of_action, biological_target, drug_technology,
        delivery_route, delivery_medium
      ) VALUES ($1, $2, $3, $4, $5, $6);
    `;
    
    const targets = [
      'PD-1', 'PD-L1', 'VEGFR', 'EGFR', 'HER2', 'CD20', 'TNF-alpha', 'IL-6', 'JAK', 'BTK'
    ];
    
    await pool.query(activityQuery, [
      drugUuid,
      mechanism,
      randomElement(targets),
      i % 2 === 0 ? 'Biologics' : 'Small Molecule',
      route,
      medium
    ]);
    
    // Create drug_development
    const developmentQuery = `
      INSERT INTO drug_development (
        drug_over_id, preclinical, trial_id, title, primary_drugs, status, sponsor
      ) VALUES ($1, $2, $3, $4, $5, $6, $7);
    `;
    
    await pool.query(developmentQuery, [
      drugUuid,
      developmentStatus === 'preclinical' ? 'Preclinical studies completed successfully' : 'Preclinical data available',
      `TB-${String(i).padStart(4, '0')}`,
      `Development program for ${drugName}`,
      drugName,
      developmentStatus,
      company
    ]);
    
    // Create drug_other_sources
    const otherSourcesQuery = `
      INSERT INTO drug_other_sources (drug_over_id, data) VALUES ($1, $2);
    `;
    
    await pool.query(otherSourcesQuery, [
      drugUuid,
      `Additional data from external sources for ${drugName}`
    ]);
    
    // Create drug_licences_marketing
    const licencesQuery = `
      INSERT INTO drug_licences_marketing (
        drug_over_id, agreement, licensing_availability, marketing_approvals
      ) VALUES ($1, $2, $3, $4);
    `;
    
    await pool.query(licencesQuery, [
      drugUuid,
      developmentStatus === 'launched' ? `Licensing agreement with ${randomElement(companies)}` : null,
      developmentStatus === 'launched' ? 'Available for licensing in select regions' : 'Not available',
      developmentStatus === 'launched' ? `FDA Approved ${randomDate(new Date(2020, 0, 1), new Date())}` : 'Pending approval'
    ]);
    
    // Create drug_logs
    const logsQuery = `
      INSERT INTO drug_logs (
        drug_over_id, drug_changes_log, created_date, last_modified_user,
        full_review_user, next_review_date, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7);
    `;
    
    const createdDate = randomDate(new Date(2020, 0, 1), new Date(2023, 11, 31));
    
    await pool.query(logsQuery, [
      drugUuid,
      `Drug record created on ${createdDate}. Status: ${developmentStatus}.`,
      createdDate,
      'admin@example.com',
      'reviewer@example.com',
      futureDate(90),
      `Internal notes for ${drugName}: Development progressing as planned.`
    ]);
    
    console.log(`  ✅ Created drug ${i}/11: ${drugName}`);
  }
  
  console.log('✅ All 11 drugs created successfully!\n');
  return drugIds;
}

// Cleanup function to remove existing data
async function cleanupExistingData() {
  console.log('🧹 Cleaning up existing data...');
  
  try {
    // Delete therapeutic-related data (child tables first due to foreign keys)
    await pool.query('DELETE FROM saved_queries');
    await pool.query('DELETE FROM therapeutic_notes');
    await pool.query('DELETE FROM therapeutic_logs');
    await pool.query('DELETE FROM therapeutic_other_sources');
    await pool.query('DELETE FROM therapeutic_sites');
    await pool.query('DELETE FROM therapeutic_results');
    await pool.query('DELETE FROM therapeutic_timing');
    await pool.query('DELETE FROM therapeutic_participation_criteria');
    await pool.query('DELETE FROM therapeutic_outcome_measured');
    await pool.query('DELETE FROM therapeutic_trial_overview');
    
    // Delete drug-related data (child tables first due to foreign keys)
    await pool.query('DELETE FROM drug_logs');
    await pool.query('DELETE FROM drug_licences_marketing');
    await pool.query('DELETE FROM drug_other_sources');
    await pool.query('DELETE FROM drug_development');
    await pool.query('DELETE FROM drug_activity');
    await pool.query('DELETE FROM drug_dev_status');
    await pool.query('DELETE FROM drug_overview');
    
    console.log('✅ Existing data cleaned up successfully!\n');
  } catch (error) {
    console.error('❌ Error cleaning up existing data:', error.message);
    throw error;
  }
}

// Main function
async function createMockData() {
  try {
    console.log('🔄 Starting mock data creation...');
    console.log('📊 Connection string:', process.env.DATABASE_URL ? 'Production DB' : process.env.PGSQL_DB_URL ? 'Development DB' : 'Not configured');
    console.log('');
    
    // Clean up existing data first
    await cleanupExistingData();
    
    const therapeuticIds = await createMockTherapeutics();
    const drugIds = await createMockDrugs();
    
    console.log('✅ Mock data creation completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Therapeutic Trials: ${therapeuticIds.length}`);
    console.log(`   - Drugs: ${drugIds.length}`);
    
  } catch (error) {
    console.error('❌ Error creating mock data:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
createMockData();

