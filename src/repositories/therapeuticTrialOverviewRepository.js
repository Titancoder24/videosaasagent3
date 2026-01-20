const { pool } = require("../infrastructure/PgDB/connect");

class TherapeuticTrialOverviewRepository {
  constructor(dbPool = pool) {
    this.pool = dbPool;
  }

  async create(data) {
    // Generate TB-XXXXXX trial identifier if not provided or empty
    let trialIdentifier = data.trial_identifier;
    let displayTrialId;
    
    // Generate a single unique TB ID that will be used for both trial_identifier and trial_id
    // This ensures consistency and prevents duplicate generation
    const generatedId = await this.generateTrialId();
    
    if (!trialIdentifier || (Array.isArray(trialIdentifier) && trialIdentifier.length === 0) || 
        (Array.isArray(trialIdentifier) && trialIdentifier.every(id => !id || id.trim() === ''))) {
      trialIdentifier = [generatedId];
    }

    // Use the same generated ID for display purposes to ensure consistency
    displayTrialId = generatedId;

    const query = `
      INSERT INTO "therapeutic_trial_overview" (
        therapeutic_area, trial_identifier, trial_phase, status, primary_drugs, other_drugs,
        title, disease_type, patient_segment, line_of_therapy, reference_links, trial_tags,
        sponsor_collaborators, sponsor_field_activity, associated_cro, countries, region,
        trial_record_status, trial_id
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,$11,$12,
        $13,$14,$15,$16,$17,$18,$19
      ) RETURNING *
    `;
    const values = [
      data.therapeutic_area || null,
      trialIdentifier,
      data.trial_phase || null,
      data.status || null,
      data.primary_drugs || null,
      data.other_drugs || null,
      data.title || null,
      data.disease_type || null,
      data.patient_segment || null,
      data.line_of_therapy || null,
      data.reference_links || null,
      data.trial_tags || null,
      data.sponsor_collaborators || null,
      data.sponsor_field_activity || null,
      data.associated_cro || null,
      data.countries || null,
      data.region || null,
      data.trial_record_status || null,
      displayTrialId,
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async createWithClient(client, data) {
    // Generate TB-XXXXXX trial identifier if not provided or empty
    let trialIdentifier = data.trial_identifier;
    let displayTrialId;
    
    // Generate a single unique TB ID that will be used for both trial_identifier and trial_id
    // Pass the client to use the same transaction and ensure consistency
    const generatedId = await this.generateTrialId(client);
    
    if (!trialIdentifier || (Array.isArray(trialIdentifier) && trialIdentifier.length === 0) || 
        (Array.isArray(trialIdentifier) && trialIdentifier.every(id => !id || id.trim() === ''))) {
      trialIdentifier = [generatedId];
    }

    // Use the same generated ID for display purposes to ensure consistency
    displayTrialId = generatedId;

    const query = `
      INSERT INTO "therapeutic_trial_overview" (
        therapeutic_area, trial_identifier, trial_phase, status, primary_drugs, other_drugs,
        title, disease_type, patient_segment, line_of_therapy, reference_links, trial_tags,
        sponsor_collaborators, sponsor_field_activity, associated_cro, countries, region,
        trial_record_status, trial_id
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,$11,$12,
        $13,$14,$15,$16,$17,$18,$19
      ) RETURNING *
    `;
    const values = [
      data.therapeutic_area || null,
      trialIdentifier,
      data.trial_phase || null,
      data.status || null,
      data.primary_drugs || null,
      data.other_drugs || null,
      data.title || null,
      data.disease_type || null,
      data.patient_segment || null,
      data.line_of_therapy || null,
      data.reference_links || null,
      data.trial_tags || null,
      data.sponsor_collaborators || null,
      data.sponsor_field_activity || null,
      data.associated_cro || null,
      data.countries || null,
      data.region || null,
      data.trial_record_status || null,
      displayTrialId,
    ];
    const result = await client.query(query, values);
    return result.rows[0];
  }

  async findAll() {
    const result = await this.pool.query(
      'SELECT * FROM "therapeutic_trial_overview" ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async findById(id) {
    const result = await this.pool.query(
      'SELECT * FROM "therapeutic_trial_overview" WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async update(id, updates) {
    const entries = Object.entries(updates).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return null;
    const fields = entries.map(([k]) => k);
    const values = entries.map(([, v]) => v);
    const setClause = fields.map((f, idx) => `${f} = $${idx + 2}`).join(", ");
    const query = `UPDATE "therapeutic_trial_overview" SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`;
    const result = await this.pool.query(query, [id, ...values]);
    return result.rows[0] || null;
  }

  async delete(id) {
    const result = await this.pool.query(
      'DELETE FROM "therapeutic_trial_overview" WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rowCount > 0;
  }

  async deleteByTrialId(trialId) {
    const result = await this.pool.query(
      'DELETE FROM "therapeutic_trial_overview" WHERE id = $1 RETURNING id',
      [trialId]
    );
    return result.rowCount;
  }

  async generateTrialId(client = null) {
    const queryClient = client || this.pool;
    const maxRetries = 20;
    const lockId = 123456; // Advisory lock ID for TB ID generation
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Use advisory lock to prevent concurrent ID generation
        // pg_advisory_lock (not xact_lock) works across connections and must be manually released
        if (!client) {
          // If not in a transaction, use session-level lock
          await queryClient.query(`SELECT pg_advisory_lock(${lockId})`);
        } else {
          // If in a transaction, use transaction-level lock (auto-released)
          await queryClient.query(`SELECT pg_advisory_xact_lock(${lockId})`);
        }
        
        try {
          // Find the maximum existing TB ID number by extracting numeric part
          // This handles cases where records might be deleted
          const maxResult = await queryClient.query(`
            SELECT 
              COALESCE(
                MAX(
                  CAST(
                    SUBSTRING(trial_id FROM 'TB-([0-9]+)') AS INTEGER
                  )
                ),
                0
              ) as max_number
            FROM "therapeutic_trial_overview"
            WHERE trial_id ~ '^TB-[0-9]+$'
          `);
          
          const maxNumber = parseInt(maxResult.rows[0]?.max_number || 0);
          let nextNumber = maxNumber + 1;
          
          // Keep trying until we find a unique ID
          let foundUnique = false;
          let attempts = 0;
          const maxUniqueAttempts = 100;
          
          while (!foundUnique && attempts < maxUniqueAttempts) {
            // Format as TB-XXXXXX (6 digits with leading zeros)
            const formattedNumber = nextNumber.toString().padStart(6, '0');
            const newTrialId = `TB-${formattedNumber}`;
            
            // Verify uniqueness
            const checkResult = await queryClient.query(
              'SELECT id FROM "therapeutic_trial_overview" WHERE trial_id = $1 LIMIT 1',
              [newTrialId]
            );
            
            if (checkResult.rows.length === 0) {
              // Release the lock before returning
              if (!client) {
                await queryClient.query(`SELECT pg_advisory_unlock(${lockId})`);
              }
              return newTrialId;
            }
            
            // ID exists, try next number
            nextNumber++;
            attempts++;
          }
          
          // Release lock if we didn't find unique ID
          if (!client) {
            await queryClient.query(`SELECT pg_advisory_unlock(${lockId})`);
          }
          
          throw new Error(`Could not find unique TB ID after checking ${maxUniqueAttempts} numbers`);
        } catch (innerError) {
          // Release lock on inner error
          if (!client) {
            try {
              await queryClient.query(`SELECT pg_advisory_unlock(${lockId})`);
            } catch (unlockError) {
              // Ignore unlock errors
            }
          }
          throw innerError;
        }
      } catch (error) {
        // If it's a lock acquisition error or uniqueness error, retry
        if (attempt < maxRetries - 1) {
          // Wait a bit before retrying (exponential backoff with jitter)
          const delay = 10 * Math.pow(2, attempt) + Math.random() * 10;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Last attempt failed, throw error
        throw new Error(`Failed to generate unique TB ID after ${maxRetries} attempts: ${error.message}`);
      }
    }
    
    throw new Error('Failed to generate unique TB ID: Max retries exceeded');
  }
}

module.exports = { TherapeuticTrialOverviewRepository };
