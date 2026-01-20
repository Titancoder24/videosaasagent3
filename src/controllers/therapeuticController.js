const { StatusCodes } = require("http-status-codes");
const { logUserActivity } = require("../utils/activityLogger");

// NOTE: Activity logging has been added to CUD operations throughout this controller.
// Pattern: All CUD operations now require user_id in request body for activity logging.
// After successful CREATE/UPDATE/DELETE operations, logTherapeuticActivity() is called
// to record user activities in the user_activity table for audit purposes.
const {
  TherapeuticTrialOverviewRepository,
} = require("../repositories/therapeuticTrialOverviewRepository");
const {
  TherapeuticOutcomeMeasuredRepository,
} = require("../repositories/therapeuticOutcomeMeasuredRepository");
const {
  TherapeuticParticipationCriteriaRepository,
} = require("../repositories/therapeuticParticipationCriteriaRepository");
const {
  TherapeuticTimingRepository,
} = require("../repositories/therapeuticTimingRepository");
const {
  TherapeuticResultsRepository,
} = require("../repositories/therapeuticResultsRepository");
const {
  TherapeuticSitesRepository,
} = require("../repositories/therapeuticSitesRepository");
const {
  TherapeuticOtherSourcesRepository,
} = require("../repositories/therapeuticOtherSourcesRepository");
const {
  TherapeuticLogsRepository,
} = require("../repositories/therapeuticLogsRepository");
const {
  TherapeuticNotesRepository,
} = require("../repositories/therapeuticNotesRepository");

const trialRepo = new TherapeuticTrialOverviewRepository();
const outcomeRepo = new TherapeuticOutcomeMeasuredRepository();
const criteriaRepo = new TherapeuticParticipationCriteriaRepository();
const timingRepo = new TherapeuticTimingRepository();
const resultsRepo = new TherapeuticResultsRepository();
const sitesRepo = new TherapeuticSitesRepository();
const otherRepo = new TherapeuticOtherSourcesRepository();
const logsRepo = new TherapeuticLogsRepository();
const notesRepo = new TherapeuticNotesRepository();

// Generic helpers
const respondNotFound = (res, resource = "Record") =>
  res.status(StatusCodes.NOT_FOUND).json({ message: `${resource} not found` });

const { UserRepository } = require("../repositories/userRepository");
const bcrypt = require("bcryptjs");

// Create instances of repositories
const userRepository = new UserRepository();

// Ensure system admin user exists
const ensureSystemAdmin = async () => {
  try {
    const existingAdmin = await userRepository.findByUsername("admin");
    if (!existingAdmin) {
      console.log("Creating system admin user for activity logging...");
      const hashedPassword = await bcrypt.hash("admin123", 10);
      const adminUser = await userRepository.create({
        username: "admin",
        email: "admin@system.local",
        password: hashedPassword,
        company: "System",
        designation: "System Administrator",
        plan: "admin"
      });
      console.log("System admin user created:", adminUser.id);
      return adminUser.id;
    }
    return existingAdmin.id;
  } catch (error) {
    console.error("Failed to ensure system admin user:", error);
    return null;
  }
};

const logTherapeuticActivity = async (
  action_type,
  table_name,
  record_id,
  change_details,
  user_id
) => {
  let actualUserId = user_id;

  if (!user_id) {
    console.warn("user_id is required for therapeutic activity logging");
    return;
  }

  try {
    await logUserActivity({
      user_id: actualUserId,
      table_name,
      record_id,
      action_type,
      change_details,
    });
  } catch (error) {
    console.error("Failed to log therapeutic activity:", error);
    // If the user doesn't exist, try to create a system user or use a fallback
    if (error.code === '23503' || error.message.includes('foreign key')) {
      console.warn(`User ${user_id} not found in database, ensuring system admin exists...`);
      const systemAdminId = await ensureSystemAdmin();
      if (systemAdminId) {
        try {
          await logUserActivity({
            user_id: systemAdminId,
            table_name,
            record_id,
            action_type,
            change_details: {
              ...change_details,
              original_user: user_id,
              note: "Logged by system admin due to missing user"
            },
          });
        } catch (retryError) {
          console.error("Failed to log with system admin:", retryError);
        }
      }
    }
  }
};

// Helper function to ensure array fields are properly formatted
const ensureArrayFields = (data, arrayFields) => {
  const processed = { ...data };

  arrayFields.forEach((field) => {
    if (processed[field] !== undefined && processed[field] !== null) {
      if (typeof processed[field] === "string") {
        // Convert comma-separated string to array
        processed[field] = processed[field]
          .split(",")
          .map((item) => item.trim());
      } else if (!Array.isArray(processed[field])) {
        // Convert single values to array
        processed[field] = [String(processed[field])];
      }
      // Ensure all array elements are strings
      processed[field] = processed[field].map((item) => String(item));
    }
  });

  return processed;
};

// Helper function to ensure string fields are properly formatted
const ensureStringFields = (data, stringFields) => {
  const processed = { ...data };

  stringFields.forEach((field) => {
    if (processed[field] !== undefined && processed[field] !== null) {
      if (Array.isArray(processed[field])) {
        processed[field] = processed[field].join(", ");
      } else {
        processed[field] = String(processed[field]);
      }
    }
  });

  return processed;
};

// NEW: Fetch all therapeutic data for a specific trial
const fetchAllTherapeuticData = async (req, res) => {
  const { trial_id } = req.params;

  if (!trial_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "trial_id is required" });
  }

  try {
    // Fetch data from all therapeutic tables
    const [
      overview,
      outcomes,
      criteria,
      timing,
      results,
      sites,
      other,
      logs,
      notes,
    ] = await Promise.all([
      trialRepo.findById(trial_id),
      outcomeRepo.findByTrialId(trial_id),
      criteriaRepo.findByTrialId(trial_id),
      timingRepo.findByTrialId(trial_id),
      resultsRepo.findByTrialId(trial_id),
      sitesRepo.findByTrialId(trial_id),
      otherRepo.findByTrialId(trial_id),
      logsRepo.findByTrialId(trial_id),
      notesRepo.findByTrialId(trial_id),
    ]);

    if (!overview) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Therapeutic trial not found" });
    }

    return res.status(StatusCodes.OK).json({
      message: "Therapeutic trial data retrieved successfully",
      trial_id,
      data: {
        overview,
        outcomes: outcomes || [],
        criteria: criteria || [],
        timing: timing || [],
        results: results || [],
        sites: sites || [],
        other: other || [],
        logs: logs || [],
        notes: notes || [],
      },
    });
  } catch (error) {
    console.error("Error fetching therapeutic trial data:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to fetch therapeutic trial data",
      error: error.message,
    });
  }
};

// NEW: Fetch all therapeutic trials with their associated data
// OPTIMIZED: Uses bulk queries instead of N+1 queries for much better performance
const fetchAllTherapeuticTrials = async (req, res) => {
  try {
    const startTime = Date.now();

    // Fetch ALL data from all tables in parallel (only 9 queries total, regardless of trial count)
    const [
      allOverviews,
      allOutcomes,
      allCriteria,
      allTiming,
      allResults,
      allSites,
      allOther,
      allLogs,
      allNotes,
    ] = await Promise.all([
      trialRepo.findAll(),
      outcomeRepo.findAll(),
      criteriaRepo.findAll(),
      timingRepo.findAll(),
      resultsRepo.findAll(),
      sitesRepo.findAll(),
      otherRepo.findAll(),
      logsRepo.findAll(),
      notesRepo.findAll(),
    ]);

    console.log(`[fetchAllTherapeuticTrials] Bulk queries completed in ${Date.now() - startTime}ms`);

    if (!allOverviews || allOverviews.length === 0) {
      return res.status(StatusCodes.OK).json({
        message: "No therapeutic trials found",
        trials: [],
      });
    }

    // Create lookup maps for O(1) access (much faster than filtering arrays)
    const mapByTrialId = (items) => {
      const map = new Map();
      for (const item of items) {
        const trialId = item.trial_id;
        if (!map.has(trialId)) {
          map.set(trialId, []);
        }
        map.get(trialId).push(item);
      }
      return map;
    };

    const outcomesMap = mapByTrialId(allOutcomes);
    const criteriaMap = mapByTrialId(allCriteria);
    const timingMap = mapByTrialId(allTiming);
    const resultsMap = mapByTrialId(allResults);
    const sitesMap = mapByTrialId(allSites);
    const otherMap = mapByTrialId(allOther);
    const logsMap = mapByTrialId(allLogs);
    const notesMap = mapByTrialId(allNotes);

    // Build the response by mapping data in memory (no additional DB queries)
    const trialsWithData = allOverviews.map((overview) => {
      const trialId = overview.id;
      return {
        trial_id: trialId,
        overview,
        outcomes: outcomesMap.get(trialId) || [],
        criteria: criteriaMap.get(trialId) || [],
        timing: timingMap.get(trialId) || [],
        results: resultsMap.get(trialId) || [],
        sites: sitesMap.get(trialId) || [],
        other: otherMap.get(trialId) || [],
        logs: logsMap.get(trialId) || [],
        notes: notesMap.get(trialId) || [],
      };
    });

    const totalTime = Date.now() - startTime;
    console.log(`[fetchAllTherapeuticTrials] Total processing time: ${totalTime}ms for ${trialsWithData.length} trials`);

    return res.status(StatusCodes.OK).json({
      message: "All therapeutic trials data retrieved successfully",
      total_trials: trialsWithData.length,
      trials: trialsWithData,
    });
  } catch (error) {
    console.error("Error fetching all therapeutic trials data:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to fetch all therapeutic trials data",
      error: error.message,
    });
  }
};

// NEW: Create comprehensive trial with all data
const createWithAllData = async (req, res) => {
  const {
    user_id,
    overview,
    outcome,
    criteria,
    timing,
    results,
    sites,
    other,
    logs,
    notes,
  } = req.body || {};

  if (!user_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "user_id is required for activity logging" });
  }

  if (!overview) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "overview data is required" });
  }

  try {
    // Process overview data based on actual schema
    // Arrays: trial_identifier, reference_links
    // Strings: all others
    const overviewArrayFields = ["trial_identifier", "reference_links"];
    const overviewStringFields = [
      "primary_drugs",
      "other_drugs",
      "trial_tags",
      "sponsor_collaborators",
      "countries",
      "region",
    ];

    let processedOverview = ensureArrayFields(overview, overviewArrayFields);
    processedOverview = ensureStringFields(
      processedOverview,
      overviewStringFields
    );

    // Create overview first
    const createdOverview = await trialRepo.create(processedOverview);
    const trial_id = createdOverview.id;

    // Log overview creation
    await logTherapeuticActivity(
      "INSERT",
      "therapeutic_trial_overview",
      trial_id,
      processedOverview,
      user_id
    );

    const createdData = { overview: createdOverview };

    // Create outcome data if provided
    if (outcome) {
      const outcomeWithTrial = { ...outcome, trial_id };
      const createdOutcome = await outcomeRepo.create(outcomeWithTrial);
      await logTherapeuticActivity(
        "INSERT",
        "therapeutic_outcome_measured",
        createdOutcome.id,
        outcomeWithTrial,
        user_id
      );
      createdData.outcome = createdOutcome;
    }

    // Create criteria data if provided
    if (criteria) {
      const criteriaWithTrial = { ...criteria, trial_id };
      // Convert numeric fields to strings if needed
      if (
        criteriaWithTrial.age_from &&
        typeof criteriaWithTrial.age_from === "number"
      ) {
        criteriaWithTrial.age_from = criteriaWithTrial.age_from.toString();
      }
      if (
        criteriaWithTrial.age_to &&
        typeof criteriaWithTrial.age_to === "number"
      ) {
        criteriaWithTrial.age_to = criteriaWithTrial.age_to.toString();
      }
      if (
        criteriaWithTrial.healthy_volunteers &&
        typeof criteriaWithTrial.healthy_volunteers === "boolean"
      ) {
        criteriaWithTrial.healthy_volunteers =
          criteriaWithTrial.healthy_volunteers.toString();
      }

      const createdCriteria = await criteriaRepo.create(criteriaWithTrial);
      await logTherapeuticActivity(
        "INSERT",
        "therapeutic_participation_criteria",
        createdCriteria.id,
        criteriaWithTrial,
        user_id
      );
      createdData.criteria = createdCriteria;
    }

    // Create timing data if provided
    if (timing) {
      const timingWithTrial = { ...timing, trial_id };
      const createdTiming = await timingRepo.create(timingWithTrial);
      await logTherapeuticActivity(
        "INSERT",
        "therapeutic_timing",
        createdTiming.id,
        timingWithTrial,
        user_id
      );
      createdData.timing = createdTiming;
    }

    // Create results data if provided
    if (results) {
      const resultsWithTrial = { ...results, trial_id };

      // Handle trial_results array field properly
      if (resultsWithTrial.trial_results) {
        resultsWithTrial.trial_results = ensureArrayFields(
          { trial_results: resultsWithTrial.trial_results },
          ["trial_results"]
        ).trial_results;
      }

      // Convert boolean to string if needed
      if (
        resultsWithTrial.adverse_event_reported &&
        typeof resultsWithTrial.adverse_event_reported === "boolean"
      ) {
        resultsWithTrial.adverse_event_reported =
          resultsWithTrial.adverse_event_reported.toString();
      }

      const createdResults = await resultsRepo.create(resultsWithTrial);
      await logTherapeuticActivity(
        "INSERT",
        "therapeutic_results",
        createdResults.id,
        resultsWithTrial,
        user_id
      );
      createdData.results = createdResults;
    }

    // Create sites data if provided
    if (sites) {
      const sitesWithTrial = { ...sites, trial_id };
      const createdSites = await sitesRepo.create(sitesWithTrial);
      await logTherapeuticActivity(
        "INSERT",
        "therapeutic_sites",
        createdSites.id,
        sitesWithTrial,
        user_id
      );
      createdData.sites = createdSites;
    }

    // Create other sources data if provided
    // Handle both old 'other' and new 'other_sources' format
    const otherSourcesData = req.body.other_sources || other;
    console.log('=== OTHER SOURCES DATA RECEIVED ===');
    console.log('req.body keys:', Object.keys(req.body || {}));
    console.log('req.body.other_sources exists:', !!req.body.other_sources);
    console.log('req.body.other exists:', !!other);
    console.log('otherSourcesData:', JSON.stringify(otherSourcesData, null, 2));
    console.log('otherSourcesData type:', typeof otherSourcesData);
    console.log('otherSourcesData is null/undefined:', otherSourcesData === null || otherSourcesData === undefined);
    if (otherSourcesData) {
      console.log('otherSourcesData keys:', Object.keys(otherSourcesData));
      console.log('Has pipeline_data:', !!otherSourcesData?.pipeline_data, 'Count:', otherSourcesData?.pipeline_data?.length);
      console.log('Has press_releases:', !!otherSourcesData?.press_releases, 'Count:', otherSourcesData?.press_releases?.length);
      console.log('Has publications:', !!otherSourcesData?.publications, 'Count:', otherSourcesData?.publications?.length);
      console.log('Has trial_registries:', !!otherSourcesData?.trial_registries, 'Count:', otherSourcesData?.trial_registries?.length);
      console.log('Has associated_studies:', !!otherSourcesData?.associated_studies, 'Count:', otherSourcesData?.associated_studies?.length);
    } else {
      console.log('⚠️ otherSourcesData is falsy - not processing other sources');
    }

    if (otherSourcesData) {
      // Check if other_sources is an object with multiple arrays (new format)
      // IMPORTANT: Check if arrays exist AND have items (not just empty arrays)
      const hasPipelineData = otherSourcesData.pipeline_data && Array.isArray(otherSourcesData.pipeline_data) && otherSourcesData.pipeline_data.length > 0;
      const hasPressReleases = otherSourcesData.press_releases && Array.isArray(otherSourcesData.press_releases) && otherSourcesData.press_releases.length > 0;
      const hasPublications = otherSourcesData.publications && Array.isArray(otherSourcesData.publications) && otherSourcesData.publications.length > 0;
      const hasTrialRegistries = otherSourcesData.trial_registries && Array.isArray(otherSourcesData.trial_registries) && otherSourcesData.trial_registries.length > 0;
      const hasAssociatedStudies = otherSourcesData.associated_studies && Array.isArray(otherSourcesData.associated_studies) && otherSourcesData.associated_studies.length > 0;

      const hasNewFormat = hasPipelineData || hasPressReleases || hasPublications || hasTrialRegistries || hasAssociatedStudies;

      console.log('Checking new format arrays:');
      console.log('  - pipeline_data:', hasPipelineData, `(${otherSourcesData.pipeline_data?.length || 0} items)`);
      console.log('  - press_releases:', hasPressReleases, `(${otherSourcesData.press_releases?.length || 0} items)`);
      console.log('  - publications:', hasPublications, `(${otherSourcesData.publications?.length || 0} items)`);
      console.log('  - trial_registries:', hasTrialRegistries, `(${otherSourcesData.trial_registries?.length || 0} items)`);
      console.log('  - associated_studies:', hasAssociatedStudies, `(${otherSourcesData.associated_studies?.length || 0} items)`);
      console.log('Has new format arrays with data:', hasNewFormat);

      if (hasNewFormat) {

        // Process each type of other source
        const allOtherSources = [];

        // Pipeline Data
        if (otherSourcesData.pipeline_data && Array.isArray(otherSourcesData.pipeline_data)) {
          for (const item of otherSourcesData.pipeline_data) {
            const sourceData = {
              type: 'pipeline_data',
              date: item.date,
              information: item.information,
              url: item.url,
              file: item.file,
              fileUrl: item.fileUrl,
              isVisible: item.isVisible !== false
            };
            const created = await otherRepo.create({
              trial_id,
              data: JSON.stringify(sourceData)
            });
            allOtherSources.push(created);
          }
        }

        // Press Releases
        if (otherSourcesData.press_releases && Array.isArray(otherSourcesData.press_releases)) {
          for (const item of otherSourcesData.press_releases) {
            const sourceData = {
              type: 'press_releases',
              date: item.date,
              title: item.title,
              description: item.description,
              url: item.url,
              file: item.file,
              fileUrl: item.fileUrl,
              isVisible: item.isVisible !== false
            };
            const created = await otherRepo.create({
              trial_id,
              data: JSON.stringify(sourceData)
            });
            allOtherSources.push(created);
          }
        }

        // Publications
        if (otherSourcesData.publications && Array.isArray(otherSourcesData.publications)) {
          console.log(`Processing ${otherSourcesData.publications.length} publications`);
          for (const item of otherSourcesData.publications) {
            console.log('Publication item:', JSON.stringify(item, null, 2));
            const sourceData = {
              type: 'publications',
              date: item.date || "", // Include date field
              publicationType: item.type,
              title: item.title,
              description: item.description,
              url: item.url,
              file: item.file,
              fileUrl: item.fileUrl,
              isVisible: item.isVisible !== false
            };
            console.log('Creating publication with sourceData:', JSON.stringify(sourceData, null, 2));
            try {
              const created = await otherRepo.create({
                trial_id,
                data: JSON.stringify(sourceData)
              });
              console.log('✅ Created publication:', created.id);
              allOtherSources.push(created);
            } catch (error) {
              console.error('❌ Error creating publication:', error);
            }
          }
        }

        // Trial Registries
        if (otherSourcesData.trial_registries && Array.isArray(otherSourcesData.trial_registries)) {
          console.log(`Processing ${otherSourcesData.trial_registries.length} trial registries`);
          for (const item of otherSourcesData.trial_registries) {
            console.log('Trial registry item:', JSON.stringify(item, null, 2));
            const sourceData = {
              type: 'trial_registries',
              date: item.date || "", // Include date field
              registry: item.registry,
              identifier: item.identifier,
              description: item.description,
              url: item.url,
              file: item.file,
              fileUrl: item.fileUrl,
              isVisible: item.isVisible !== false
            };
            console.log('Creating trial registry with sourceData:', JSON.stringify(sourceData, null, 2));
            try {
              const created = await otherRepo.create({
                trial_id,
                data: JSON.stringify(sourceData)
              });
              console.log('✅ Created trial registry:', created.id);
              allOtherSources.push(created);
            } catch (error) {
              console.error('❌ Error creating trial registry:', error);
            }
          }
        }

        // Associated Studies
        if (otherSourcesData.associated_studies && Array.isArray(otherSourcesData.associated_studies)) {
          console.log(`Processing ${otherSourcesData.associated_studies.length} associated studies`);
          for (const item of otherSourcesData.associated_studies) {
            console.log('Associated study item:', JSON.stringify(item, null, 2));
            const sourceData = {
              type: 'associated_studies',
              date: item.date || "", // Include date field
              studyType: item.type,
              title: item.title,
              description: item.description,
              url: item.url,
              file: item.file,
              fileUrl: item.fileUrl,
              isVisible: item.isVisible !== false
            };
            console.log('Creating associated study with sourceData:', JSON.stringify(sourceData, null, 2));
            try {
              const created = await otherRepo.create({
                trial_id,
                data: JSON.stringify(sourceData)
              });
              console.log('✅ Created associated study:', created.id);
              allOtherSources.push(created);
            } catch (error) {
              console.error('❌ Error creating associated study:', error);
            }
          }
        }

        console.log(`Total other sources created: ${allOtherSources.length}`);
        if (allOtherSources.length > 0) {
          await logTherapeuticActivity(
            "INSERT",
            "therapeutic_other_sources",
            trial_id,
            { count: allOtherSources.length },
            user_id
          );
          createdData.other_sources = allOtherSources;
          console.log('✅ Successfully saved other_sources to database');
        } else {
          console.log('⚠️ No other sources were created (all arrays were empty or filtered out)');
        }
      } else {
        // Old format - single other source
        const otherWithTrial = { ...otherSourcesData, trial_id };
        const createdOther = await otherRepo.create(otherWithTrial);
        await logTherapeuticActivity(
          "INSERT",
          "therapeutic_other_sources",
          createdOther.id,
          otherWithTrial,
          user_id
        );
        createdData.other = createdOther;
      }
    }

    // Create logs data if provided
    if (logs) {
      const logsWithTrial = { ...logs, trial_id };
      const createdLogs = await logsRepo.create(logsWithTrial);
      await logTherapeuticActivity(
        "INSERT",
        "therapeutic_logs",
        createdLogs.id,
        logsWithTrial,
        user_id
      );
      createdData.logs = createdLogs;
    }

    // Create notes data if provided
    if (notes) {
      console.log('[TherapeuticController] Creating notes with data:', { trial_id, notes: typeof notes });

      // Normalize notes to JSONB format
      // The notes field should be a JSONB array/object containing all note data
      let notesData = notes.notes;

      // If notes.notes is already a string (JSON), parse it
      if (typeof notesData === "string") {
        try {
          notesData = JSON.parse(notesData);
        } catch (e) {
          console.warn('[TherapeuticController] Failed to parse notes JSON string, using as-is');
          notesData = notesData;
        }
      }

      // If notes.notes is not provided but other note fields are, create structure
      if (!notesData && (notes.date_type || notes.link || notes.attachments)) {
        notesData = {
          date_type: notes.date_type || null,
          link: notes.link || null,
          attachments: notes.attachments || [],
        };
      }

      // Ensure notesData is an array or object
      if (!notesData) {
        notesData = [];
      }

      const notesWithTrial = {
        trial_id,
        notes: notesData, // Store all note data in JSONB field
      };

      console.log('[TherapeuticController] Notes payload:', { trial_id, notes: typeof notesWithTrial.notes });

      const createdNotes = await notesRepo.create(notesWithTrial);
      await logTherapeuticActivity(
        "INSERT",
        "therapeutic_notes",
        createdNotes.id,
        notesWithTrial,
        user_id
      );
      createdData.notes = createdNotes;
    }

    // Log a summary of the trial creation
    await logTherapeuticActivity(
      "INSERT",
      "therapeutic_trial_summary",
      trial_id,
      {
        summary: "Complete therapeutic trial created",
        trial_title: processedOverview.title || "Untitled Trial",
        trial_phase: processedOverview.trial_phase || "Unknown",
        status: processedOverview.status || "Unknown",
        sections_created: Object.keys(createdData).length,
        created_sections: Object.keys(createdData)
      },
      user_id
    );

    return res.status(StatusCodes.CREATED).json({
      message: "Trial created successfully with all data",
      trial_id: createdOverview.trial_id || trial_id, // Use formatted TB-000XXX trial_id, fallback to UUID
      trial_identifier: createdOverview.trial_identifier && createdOverview.trial_identifier.length > 0
        ? createdOverview.trial_identifier[0]
        : null,
      data: createdData,
    });
  } catch (error) {
    console.error("Error creating trial with all data:", error);

    // Handle database constraint errors
    if (error.code === "22P02") {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Invalid data format - array field error",
        error: `Database array format error. Please check: trial_identifier and reference_links should be arrays, trial_results should be an array. Error: ${error.message}`,
        code: error.code,
        details: error.message,
      });
    }

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to create trial",
      error: error.message,
    });
  }
};

// Overview
const createOverview = async (req, res) => {
  const { user_id, ...overviewData } = req.body || {};

  if (!user_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "user_id is required for activity logging" });
  }

  const created = await trialRepo.create(overviewData);

  // Log overview creation activity
  await logTherapeuticActivity(
    "INSERT",
    "therapeutic_trial_overview",
    created.id,
    overviewData,
    user_id
  );

  return res.status(StatusCodes.CREATED).json({ overview: created });
};
const listOverview = async (_req, res) => {
  const items = await trialRepo.findAll();
  return res.status(StatusCodes.OK).json({ overviews: items });
};
const getOverview = async (req, res) => {
  const item = await trialRepo.findById(req.params.id);
  if (!item) return respondNotFound(res, "Overview");
  return res.status(StatusCodes.OK).json({ overview: item });
};
const updateOverview = async (req, res) => {
  const { user_id, ...updateData } = req.body || {};

  if (!user_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "user_id is required for activity logging" });
  }

  console.log("[TherapeuticController] updateOverview payload:", {
    overview_id: req.params.id,
    updateData,
  });

  const item = await trialRepo.update(req.params.id, updateData);
  if (!item) return respondNotFound(res, "Overview");

  // Log overview update activity
  await logTherapeuticActivity(
    "UPDATE",
    "therapeutic_trial_overview",
    item.id,
    updateData,
    user_id
  );

  return res.status(StatusCodes.OK).json({ overview: item });
};
const deleteOverview = async (req, res) => {
  const { user_id } = req.body || {};

  if (!user_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "user_id is required for activity logging" });
  }

  // Get overview info before deletion for logging
  const overviewToDelete = await trialRepo.findById(req.params.id);
  if (!overviewToDelete) return respondNotFound(res, "Overview");

  const ok = await trialRepo.delete(req.params.id);
  if (!ok) return respondNotFound(res, "Overview");

  // Log overview deletion activity
  await logTherapeuticActivity(
    "DELETE",
    "therapeutic_trial_overview",
    overviewToDelete.id,
    {
      deleted_overview: {
        id: overviewToDelete.id,
        title: overviewToDelete.title,
      },
    },
    user_id
  );

  return res.status(StatusCodes.OK).json({ success: true });
};

// Outcome measured
const createOutcome = async (req, res) => {
  const { user_id, ...outcomeData } = req.body || {};

  if (!user_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "user_id is required for activity logging" });
  }

  const created = await outcomeRepo.create(outcomeData);
  await logTherapeuticActivity(
    "INSERT",
    "therapeutic_outcome_measured",
    created.id,
    outcomeData,
    user_id
  );
  return res.status(StatusCodes.CREATED).json({ outcome: created });
};
const listOutcomes = async (req, res) => {
  const items = await outcomeRepo.findAll({ trial_id: req.query.trial_id });
  return res.status(StatusCodes.OK).json({ outcomes: items });
};
const listOutcomesByTrial = async (req, res) => {
  const items = await outcomeRepo.findByTrialId(req.params.trial_id);
  return res.status(StatusCodes.OK).json({ outcomes: items });
};
const getOutcome = async (req, res) => {
  const item = await outcomeRepo.findById(req.params.id);
  if (!item) return respondNotFound(res, "Outcome");
  return res.status(StatusCodes.OK).json({ outcome: item });
};
const updateOutcome = async (req, res) => {
  const { user_id, ...updateData } = req.body || {};

  if (!user_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "user_id is required for activity logging" });
  }

  const item = await outcomeRepo.update(req.params.id, updateData);
  if (!item) return respondNotFound(res, "Outcome");
  await logTherapeuticActivity(
    "UPDATE",
    "therapeutic_outcome_measured",
    item.id,
    updateData,
    user_id
  );
  return res.status(StatusCodes.OK).json({ outcome: item });
};
const updateOutcomeByTrial = async (req, res) => {
  const { trial_id } = req.params;
  const { user_id, ...rawUpdate } = req.body || {};

  console.log("[TherapeuticController] updateOutcomeByTrial payload:", {
    trial_id,
    user_id,
    rawUpdate,
  });

  if (!user_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "user_id is required for activity logging" });
  }

  if (!trial_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "trial_id is required" });
  }

  // Ensure payload fields are strings where necessary
  const stringFields = [
    "purpose_of_trial",
    "summary",
    "primary_outcome_measure",
    "other_outcome_measure",
    "study_design_keywords",
    "study_design",
    "treatment_regimen",
  ];

  const processedUpdate = ensureStringFields(rawUpdate, stringFields);

  // number_of_arms should be integer or null
  if (
    Object.prototype.hasOwnProperty.call(processedUpdate, "number_of_arms") &&
    processedUpdate.number_of_arms !== null &&
    processedUpdate.number_of_arms !== undefined
  ) {
    const parsedArms = parseInt(processedUpdate.number_of_arms, 10);
    processedUpdate.number_of_arms = Number.isNaN(parsedArms)
      ? null
      : parsedArms;
  }

  try {
    const updatedItems = await outcomeRepo.updateByTrialId(
      trial_id,
      processedUpdate
    );

    if (updatedItems.length === 0) {
      // No existing outcome rows; create a new one
      const toCreate = {
        trial_id,
        ...processedUpdate,
      };

      console.log("[TherapeuticController] No outcome rows found. Creating new outcome:", toCreate);

      const createdOutcome = await outcomeRepo.create(toCreate);
      await logTherapeuticActivity(
        "INSERT",
        "therapeutic_outcome_measured",
        createdOutcome.id,
        toCreate,
        user_id
      );
      return res.status(StatusCodes.CREATED).json({
        outcome: createdOutcome,
        created: true,
      });
    }

    // Log update for first updated row (all share same trial_id)
    await logTherapeuticActivity(
      "UPDATE",
      "therapeutic_outcome_measured",
      updatedItems[0].id,
      processedUpdate,
      user_id
    );

    console.log("[TherapeuticController] Outcome rows updated:", {
      trial_id,
      count: updatedItems.length,
    });

    return res.status(StatusCodes.OK).json({ outcomes: updatedItems });
  } catch (error) {
    console.error("Failed to update outcome for trial:", {
      trial_id,
      error,
    });
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to update outcome data",
      error: error.message,
    });
  }
};
const deleteOutcome = async (req, res) => {
  const { user_id } = req.body || {};

  if (!user_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "user_id is required for activity logging" });
  }

  const outcomeToDelete = await outcomeRepo.findById(req.params.id);
  if (!outcomeToDelete) return respondNotFound(res, "Outcome");
  const ok = await outcomeRepo.delete(req.params.id);
  if (!ok) return respondNotFound(res, "Outcome");
  await logTherapeuticActivity(
    "DELETE",
    "therapeutic_outcome_measured",
    outcomeToDelete.id,
    {
      deleted_outcome: {
        id: outcomeToDelete.id,
        trial_id: outcomeToDelete.trial_id,
      },
    },
    user_id
  );
  return res.status(StatusCodes.OK).json({ success: true });
};
const deleteOutcomeByTrial = async (req, res) => {
  const count = await outcomeRepo.deleteByTrialId(req.params.trial_id);
  return res.status(StatusCodes.OK).json({ deleted: count });
};

// Participation criteria
const createCriteria = async (req, res) => {
  const { user_id, ...criteriaData } = req.body || {};

  if (!user_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "user_id is required for activity logging" });
  }

  const created = await criteriaRepo.create(criteriaData);
  await logTherapeuticActivity(
    "INSERT",
    "therapeutic_participation_criteria",
    created.id,
    criteriaData,
    user_id
  );
  return res.status(StatusCodes.CREATED).json({ criteria: created });
};
const listCriteria = async (req, res) => {
  const items = await criteriaRepo.findAll({ trial_id: req.query.trial_id });
  return res.status(StatusCodes.OK).json({ criteria: items });
};
const listCriteriaByTrial = async (req, res) => {
  const items = await criteriaRepo.findByTrialId(req.params.trial_id);
  return res.status(StatusCodes.OK).json({ criteria: items });
};
const getCriteria = async (req, res) => {
  const item = await criteriaRepo.findById(req.params.id);
  if (!item) return respondNotFound(res, "Criteria");
  return res.status(StatusCodes.OK).json({ criteria: item });
};
const updateCriteria = async (req, res) => {
  const item = await criteriaRepo.update(req.params.id, req.body || {});
  if (!item) return respondNotFound(res, "Criteria");
  return res.status(StatusCodes.OK).json({ criteria: item });
};
const updateCriteriaByTrial = async (req, res) => {
  const { trial_id } = req.params;
  const { user_id, ...rawUpdate } = req.body || {};

  console.log("[TherapeuticController] updateCriteriaByTrial payload:", {
    trial_id,
    user_id,
    rawUpdate,
  });

  if (!user_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "user_id is required for activity logging" });
  }

  try {
    const updatedItems = await criteriaRepo.updateByTrialId(
      trial_id,
      rawUpdate
    );

    if (updatedItems.length === 0) {
      // No existing criteria rows; create a new one
      const toCreate = {
        trial_id,
        ...rawUpdate,
      };

      console.log(
        "[TherapeuticController] No criteria rows found. Creating new criteria:",
        toCreate
      );

      const createdCriteria = await criteriaRepo.create(toCreate);
      await logTherapeuticActivity(
        "INSERT",
        "therapeutic_participation_criteria",
        createdCriteria.id,
        toCreate,
        user_id
      );
      return res.status(StatusCodes.CREATED).json({
        criteria: [createdCriteria], // Return as array to be consistent
        created: true,
      });
    }

    // Log update
    await logTherapeuticActivity(
      "UPDATE",
      "therapeutic_participation_criteria",
      updatedItems[0].id,
      rawUpdate,
      user_id
    );

    return res.status(StatusCodes.OK).json({ criteria: updatedItems });
  } catch (error) {
    console.error("Failed to update criteria for trial:", {
      trial_id,
      error,
    });
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to update criteria data",
      error: error.message,
    });
  }
};
const deleteCriteria = async (req, res) => {
  const ok = await criteriaRepo.delete(req.params.id);
  if (!ok) return respondNotFound(res, "Criteria");
  return res.status(StatusCodes.OK).json({ success: true });
};
const deleteCriteriaByTrial = async (req, res) => {
  const count = await criteriaRepo.deleteByTrialId(req.params.trial_id);
  return res.status(StatusCodes.OK).json({ deleted: count });
};

// Timing
const createTiming = async (req, res) => {
  const created = await timingRepo.create(req.body || {});
  return res.status(StatusCodes.CREATED).json({ timing: created });
};
const listTiming = async (req, res) => {
  const items = await timingRepo.findAll({ trial_id: req.query.trial_id });
  return res.status(StatusCodes.OK).json({ timings: items });
};
const listTimingByTrial = async (req, res) => {
  const items = await timingRepo.findByTrialId(req.params.trial_id);
  return res.status(StatusCodes.OK).json({ timings: items });
};
const getTiming = async (req, res) => {
  const item = await timingRepo.findById(req.params.id);
  if (!item) return respondNotFound(res, "Timing");
  return res.status(StatusCodes.OK).json({ timing: item });
};
const updateTiming = async (req, res) => {
  const item = await timingRepo.update(req.params.id, req.body || {});
  if (!item) return respondNotFound(res, "Timing");
  return res.status(StatusCodes.OK).json({ timing: item });
};
const updateTimingByTrial = async (req, res) => {
  console.log("[TherapeuticController] updateTimingByTrial payload:", {
    trial_id: req.params.trial_id,
    body: req.body,
  });
  const items = await timingRepo.updateByTrialId(
    req.params.trial_id,
    req.body || {}
  );
  return res.status(StatusCodes.OK).json({ timings: items });
};
const deleteTiming = async (req, res) => {
  const ok = await timingRepo.delete(req.params.id);
  if (!ok) return respondNotFound(res, "Timing");
  return res.status(StatusCodes.OK).json({ success: true });
};
const deleteTimingByTrial = async (req, res) => {
  const count = await timingRepo.deleteByTrialId(req.params.trial_id);
  return res.status(StatusCodes.OK).json({ deleted: count });
};

// Results
const createResults = async (req, res) => {
  const created = await resultsRepo.create(req.body || {});
  return res.status(StatusCodes.CREATED).json({ results: created });
};
const listResults = async (req, res) => {
  const items = await resultsRepo.findAll({ trial_id: req.query.trial_id });
  return res.status(StatusCodes.OK).json({ results: items });
};
const listResultsByTrial = async (req, res) => {
  const items = await resultsRepo.findByTrialId(req.params.trial_id);
  return res.status(StatusCodes.OK).json({ results: items });
};
const getResults = async (req, res) => {
  const item = await resultsRepo.findById(req.params.id);
  if (!item) return respondNotFound(res, "Results");
  return res.status(StatusCodes.OK).json({ results: item });
};
const updateResults = async (req, res) => {
  const item = await resultsRepo.update(req.params.id, req.body || {});
  if (!item) return respondNotFound(res, "Results");
  return res.status(StatusCodes.OK).json({ results: item });
};
const updateResultsByTrial = async (req, res) => {
  console.log("[TherapeuticController] updateResultsByTrial payload:", {
    trial_id: req.params.trial_id,
    body: req.body,
  });
  const items = await resultsRepo.updateByTrialId(
    req.params.trial_id,
    req.body || {}
  );
  return res.status(StatusCodes.OK).json({ results: items });
};
const deleteResults = async (req, res) => {
  const ok = await resultsRepo.delete(req.params.id);
  if (!ok) return respondNotFound(res, "Results");
  return res.status(StatusCodes.OK).json({ success: true });
};
const deleteResultsByTrial = async (req, res) => {
  const count = await resultsRepo.deleteByTrialId(req.params.trial_id);
  return res.status(StatusCodes.OK).json({ deleted: count });
};

// Sites
const createSites = async (req, res) => {
  const created = await sitesRepo.create(req.body || {});
  return res.status(StatusCodes.CREATED).json({ sites: created });
};
const listSites = async (req, res) => {
  const items = await sitesRepo.findAll({ trial_id: req.query.trial_id });
  return res.status(StatusCodes.OK).json({ sites: items });
};
const listSitesByTrial = async (req, res) => {
  const items = await sitesRepo.findByTrialId(req.params.trial_id);
  return res.status(StatusCodes.OK).json({ sites: items });
};
const getSites = async (req, res) => {
  const item = await sitesRepo.findById(req.params.id);
  if (!item) return respondNotFound(res, "Sites");
  return res.status(StatusCodes.OK).json({ sites: item });
};
const updateSites = async (req, res) => {
  const item = await sitesRepo.update(req.params.id, req.body || {});
  if (!item) return respondNotFound(res, "Sites");
  return res.status(StatusCodes.OK).json({ sites: item });
};
const updateSitesByTrial = async (req, res) => {
  const items = await sitesRepo.updateByTrialId(
    req.params.trial_id,
    req.body || {}
  );
  return res.status(StatusCodes.OK).json({ sites: items });
};
const deleteSites = async (req, res) => {
  const ok = await sitesRepo.delete(req.params.id);
  if (!ok) return respondNotFound(res, "Sites");
  return res.status(StatusCodes.OK).json({ success: true });
};
const deleteSitesByTrial = async (req, res) => {
  const count = await sitesRepo.deleteByTrialId(req.params.trial_id);
  return res.status(StatusCodes.OK).json({ deleted: count });
};

// Other sources
const createOther = async (req, res) => {
  try {
    console.log('=== CREATE OTHER SOURCE ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('trial_id:', req.body?.trial_id);
    console.log('data:', req.body?.data);
    console.log('data type:', typeof req.body?.data);

    if (!req.body || !req.body.trial_id) {
      console.error('❌ Missing trial_id in request body');
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "trial_id is required",
        error: "Missing trial_id in request body"
      });
    }

    const created = await otherRepo.create(req.body || {});
    console.log('✅ Successfully created other source:', created.id);
    console.log('Created data:', JSON.stringify(created, null, 2));
    return res.status(StatusCodes.CREATED).json({ other: created });
  } catch (error) {
    console.error('❌ Error creating other source:', error);
    console.error('Error stack:', error.stack);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to create other source",
      error: error.message
    });
  }
};
const listOther = async (req, res) => {
  const items = await otherRepo.findAll({ trial_id: req.query.trial_id });
  return res.status(StatusCodes.OK).json({ other_sources: items });
};
const listOtherByTrial = async (req, res) => {
  const items = await otherRepo.findByTrialId(req.params.trial_id);
  return res.status(StatusCodes.OK).json({ other_sources: items });
};
const getOther = async (req, res) => {
  const item = await otherRepo.findById(req.params.id);
  if (!item) return respondNotFound(res, "Other Source");
  return res.status(StatusCodes.OK).json({ other: item });
};
const updateOther = async (req, res) => {
  const item = await otherRepo.update(req.params.id, req.body || {});
  if (!item) return respondNotFound(res, "Other Source");
  return res.status(StatusCodes.OK).json({ other: item });
};
const updateOtherByTrial = async (req, res) => {
  const items = await otherRepo.updateByTrialId(
    req.params.trial_id,
    req.body || {}
  );
  return res.status(StatusCodes.OK).json({ other: items });
};
const deleteOther = async (req, res) => {
  const ok = await otherRepo.delete(req.params.id);
  if (!ok) return respondNotFound(res, "Other Source");
  return res.status(StatusCodes.OK).json({ success: true });
};
const deleteOtherByTrial = async (req, res) => {
  const count = await otherRepo.deleteByTrialId(req.params.trial_id);
  return res.status(StatusCodes.OK).json({ deleted: count });
};

// Logs
const createLog = async (req, res) => {
  const created = await logsRepo.create(req.body || {});
  return res.status(StatusCodes.CREATED).json({ log: created });
};
const listLogs = async (req, res) => {
  const items = await logsRepo.findAll({ trial_id: req.query.trial_id });
  return res.status(StatusCodes.OK).json({ logs: items });
};
const listLogsByTrial = async (req, res) => {
  const items = await logsRepo.findByTrialId(req.params.trial_id);
  return res.status(StatusCodes.OK).json({ logs: items });
};
const getLog = async (req, res) => {
  const item = await logsRepo.findById(req.params.id);
  if (!item) return respondNotFound(res, "Log");
  return res.status(StatusCodes.OK).json({ log: item });
};
const updateLog = async (req, res) => {
  const item = await logsRepo.update(req.params.id, req.body || {});
  if (!item) return respondNotFound(res, "Log");
  return res.status(StatusCodes.OK).json({ log: item });
};
const updateLogsByTrial = async (req, res) => {
  const items = await logsRepo.updateByTrialId(
    req.params.trial_id,
    req.body || {}
  );
  return res.status(StatusCodes.OK).json({ logs: items });
};
const deleteLog = async (req, res) => {
  const ok = await logsRepo.delete(req.params.id);
  if (!ok) return respondNotFound(res, "Log");
  return res.status(StatusCodes.OK).json({ success: true });
};
const deleteLogsByTrial = async (req, res) => {
  const count = await logsRepo.deleteByTrialId(req.params.trial_id);
  return res.status(StatusCodes.OK).json({ deleted: count });
};

// Notes
const createNote = async (req, res) => {
  const created = await notesRepo.create(req.body || {});
  return res.status(StatusCodes.CREATED).json({ note: created });
};
const listNotes = async (req, res) => {
  const items = await notesRepo.findAll({ trial_id: req.query.trial_id });
  return res.status(StatusCodes.OK).json({ notes: items });
};
const listNotesByTrial = async (req, res) => {
  const items = await notesRepo.findByTrialId(req.params.trial_id);
  return res.status(StatusCodes.OK).json({ notes: items });
};
const getNote = async (req, res) => {
  const item = await notesRepo.findById(req.params.id);
  if (!item) return respondNotFound(res, "Note");
  return res.status(StatusCodes.OK).json({ note: item });
};
const updateNote = async (req, res) => {
  const item = await notesRepo.update(req.params.id, req.body || {});
  if (!item) return respondNotFound(res, "Note");
  return res.status(StatusCodes.OK).json({ note: item });
};
const updateNotesByTrial = async (req, res) => {
  const items = await notesRepo.updateByTrialId(
    req.params.trial_id,
    req.body || {}
  );
  return res.status(StatusCodes.OK).json({ notes: items });
};
const deleteNote = async (req, res) => {
  const ok = await notesRepo.delete(req.params.id);
  if (!ok) return respondNotFound(res, "Note");
  return res.status(StatusCodes.OK).json({ success: true });
};
const deleteNotesByTrial = async (req, res) => {
  const count = await notesRepo.deleteByTrialId(req.params.trial_id);
  return res.status(StatusCodes.OK).json({ deleted: count });
};

const performCascadeDeleteForTrial = async (trial_id, user_id) => {
  const trialToDelete = await trialRepo.findById(trial_id);
  if (!trialToDelete) {
    return { notFound: true };
  }

  console.log(
    `[TherapeuticController] Starting cascade delete for trial ${trial_id} by user ${user_id}`
  );

  const deletionResults = {
    outcomes: await outcomeRepo.deleteByTrialId(trial_id),
    criteria: await criteriaRepo.deleteByTrialId(trial_id),
    timing: await timingRepo.deleteByTrialId(trial_id),
    results: await resultsRepo.deleteByTrialId(trial_id),
    sites: await sitesRepo.deleteByTrialId(trial_id),
    other_sources: await otherRepo.deleteByTrialId(trial_id),
    logs: await logsRepo.deleteByTrialId(trial_id),
    notes: await notesRepo.deleteByTrialId(trial_id),
    overview: await trialRepo.deleteByTrialId(trial_id),
  };

  const totalDeleted = Object.values(deletionResults).reduce(
    (sum, count) => sum + count,
    0
  );

  console.log(
    `[TherapeuticController] Cascade delete complete for trial ${trial_id}`,
    deletionResults
  );

  await logTherapeuticActivity(
    "DELETE",
    "therapeutic_trial_overview",
    trial_id,
    {
      deleted_trial: {
        id: trial_id,
        trial_identifier: trialToDelete.trial_identifier,
        title: trialToDelete.title,
        therapeutic_area: trialToDelete.therapeutic_area,
      },
      deletion_summary: deletionResults,
      total_records_deleted: totalDeleted,
    },
    user_id
  );

  return {
    notFound: false,
    payload: {
      success: true,
      message: `Successfully deleted all therapeutic data for trial ${trial_id}`,
      trial_info: {
        id: trial_id,
        trial_identifier: trialToDelete.trial_identifier,
        title: trialToDelete.title,
      },
      deletion_summary: deletionResults,
      total_records_deleted: totalDeleted,
    },
    details: {
      deletionResults,
      trial: trialToDelete,
    },
  };
};

// NEW: Delete all therapeutic data for a specific trial
const deleteAllTherapeuticDataByTrial = async (req, res) => {
  const { trial_id, user_id } = req.params;

  if (!trial_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "trial_id parameter is required" });
  }

  if (!user_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "user_id parameter is required" });
  }

  try {
    const result = await performCascadeDeleteForTrial(trial_id, user_id);

    if (result.notFound) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Therapeutic trial not found" });
    }

    return res.status(StatusCodes.OK).json(result.payload);
  } catch (error) {
    console.error("Error deleting therapeutic trial data:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to delete therapeutic trial data",
      error: error.message,
    });
  }
};

// NEW: Delete ALL trials (dev only)
const deleteAllTherapeuticTrialsDevOnly = async (req, res) => {
  console.log("[TherapeuticController] deleteAllTherapeuticTrialsDevOnly invoked", {
    nodeEnv: process.env.NODE_ENV,
  });

  if (process.env.NODE_ENV !== "development") {
    return res.status(StatusCodes.FORBIDDEN).json({
      message: "Bulk delete is only allowed in development mode",
    });
  }

  const { user_id } = req.body || {};

  if (!user_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "user_id is required in request body" });
  }

  try {
    const allTrials = await trialRepo.findAll();
    console.log(
      `[TherapeuticController] Found ${allTrials.length} trials to delete`
    );

    const results = [];

    for (const trial of allTrials) {
      try {
        const deletionResult = await performCascadeDeleteForTrial(
          trial.id,
          user_id
        );

        if (!deletionResult.notFound) {
          results.push({
            trial_id: trial.id,
            deletion_summary: deletionResult.details.deletionResults,
          });
        }
      } catch (innerError) {
        console.error(
          `[TherapeuticController] Failed to delete trial ${trial.id}:`,
          innerError
        );
      }
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      deleted_count: results.length,
      details: results,
    });
  } catch (error) {
    console.error("Error deleting all therapeutic trials:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to delete all therapeutic trials",
      error: error.message,
    });
  }
};

module.exports = {
  createWithAllData, // NEW endpoint
  fetchAllTherapeuticData, // NEW endpoint
  fetchAllTherapeuticTrials, // NEW endpoint
  deleteAllTherapeuticDataByTrial, // NEW endpoint
  deleteAllTherapeuticTrialsDevOnly,
  createOverview,
  listOverview,
  getOverview,
  updateOverview,
  deleteOverview,
  createOutcome,
  listOutcomes,
  listOutcomesByTrial,
  getOutcome,
  updateOutcome,
  updateOutcomeByTrial,
  deleteOutcome,
  deleteOutcomeByTrial,
  createCriteria,
  listCriteria,
  listCriteriaByTrial,
  getCriteria,
  updateCriteria,
  updateCriteriaByTrial,
  deleteCriteria,
  deleteCriteriaByTrial,
  createTiming,
  listTiming,
  listTimingByTrial,
  getTiming,
  updateTiming,
  updateTimingByTrial,
  deleteTiming,
  deleteTimingByTrial,
  createResults,
  listResults,
  listResultsByTrial,
  getResults,
  updateResults,
  updateResultsByTrial,
  deleteResults,
  deleteResultsByTrial,
  createSites,
  listSites,
  listSitesByTrial,
  getSites,
  updateSites,
  updateSitesByTrial,
  deleteSites,
  deleteSitesByTrial,
  createOther,
  listOther,
  listOtherByTrial,
  getOther,
  updateOther,
  updateOtherByTrial,
  deleteOther,
  deleteOtherByTrial,
  createLog,
  listLogs,
  listLogsByTrial,
  getLog,
  updateLog,
  updateLogsByTrial,
  deleteLog,
  deleteLogsByTrial,
  createNote,
  listNotes,
  listNotesByTrial,
  getNote,
  updateNote,
  updateNotesByTrial,
  deleteNote,
  deleteNotesByTrial,
};
