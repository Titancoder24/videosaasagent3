const { StatusCodes } = require("http-status-codes");
const { logUserActivity } = require("../utils/activityLogger");
const { pool } = require("../infrastructure/PgDB/connect");
const { SaveQueryActivityRepository } = require("../repositories/saveQueryActivityRepository");

// ==================== RAW SQL QUERY EXECUTION ====================
const executeCustomQuery = async (req, res) => {
  const { user_id, query, query_name, description } = req.body || {};

  if (!user_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "user_id is required for activity logging" });
  }

  if (!query) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "SQL query is required" });
  }

  try {
    // Security: Only allow SELECT queries
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery.startsWith("select")) {
      return res.status(StatusCodes.FORBIDDEN).json({
        message: "Only SELECT queries are allowed for security reasons",
        error:
          "Modification queries (INSERT, UPDATE, DELETE) are not permitted",
      });
    }

    // Security: Block potentially dangerous queries
    const dangerousKeywords = [
      "drop",
      "truncate",
      "alter",
      "create",
      "insert",
      "update",
      "delete",
      "grant",
      "revoke",
      "execute",
      "union",
      "information_schema",
    ];

    const hasDangerousKeywords = dangerousKeywords.some((keyword) =>
      trimmedQuery.includes(keyword)
    );

    if (hasDangerousKeywords) {
      return res.status(StatusCodes.FORBIDDEN).json({
        message: "Query contains forbidden keywords for security reasons",
        error: "Query blocked due to security policy",
      });
    }

    console.log(`Executing custom query by user ${user_id}:`, query);

    // Execute the query
    const result = await pool.query(query);

    // Log the query execution
    await logUserActivity({
      user_id,
      table_name: "custom_query",
      record_id: null,
      action_type: "EXECUTE",
      change_details: {
        query_name: query_name || "Custom Query",
        description: description || "User-defined query",
        query: query,
        rows_returned: result.rows.length,
        execution_time: new Date().toISOString(),
      },
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Query executed successfully",
      query_info: {
        name: query_name || "Custom Query",
        description: description || "User-defined query",
        rows_returned: result.rows.length,
        columns: result.fields?.map((field) => field.name) || [],
      },
      data: result.rows,
      total_count: result.rows.length,
    });
  } catch (error) {
    console.error("Error executing custom query:", error);

    // Log the failed query attempt
    await logUserActivity({
      user_id,
      table_name: "custom_query",
      record_id: null,
      action_type: "EXECUTE_FAILED",
      change_details: {
        query_name: query_name || "Custom Query",
        description: description || "User-defined query",
        query: query,
        error: error.message,
        execution_time: new Date().toISOString(),
      },
    });

    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Query execution failed",
      error: error.message,
      suggestion: "Please check your SQL syntax and table/column names",
    });
  }
};

// ==================== PRE-BUILT QUERY TEMPLATES ====================

// Template 1: Get drugs by multiple therapeutic areas
const getDrugsByMultipleTherapeuticAreas = async (req, res) => {
  const { user_id, therapeutic_areas, include_related_data } = req.body || {};

  if (!user_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "user_id is required" });
  }

  if (!therapeutic_areas || !Array.isArray(therapeutic_areas)) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "therapeutic_areas array is required" });
  }

  try {
    let query = `
      SELECT 
        do.*,
        COUNT(dds.id) as dev_status_count,
        COUNT(da.id) as activity_count,
        COUNT(dd.id) as development_count
      FROM drug_overview do
      LEFT JOIN drug_dev_status dds ON do.id = dds.drug_over_id
      LEFT JOIN drug_activity da ON do.id = da.drug_over_id
      LEFT JOIN drug_development dd ON do.id = dd.drug_over_id
      WHERE do.therapeutic_area = ANY($1)
      GROUP BY do.id
      ORDER BY do.created_at DESC
    `;

    const result = await pool.query(query, [therapeutic_areas]);

    // Log the query execution
    await logUserActivity({
      user_id,
      table_name: "drug_overview",
      record_id: null,
      action_type: "QUERY_TEMPLATE",
      change_details: {
        template_name: "getDrugsByMultipleTherapeuticAreas",
        therapeutic_areas,
        rows_returned: result.rows.length,
        include_related_data: !!include_related_data,
      },
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: `Found ${result.rows.length} drugs in specified therapeutic areas`,
      query_template: "getDrugsByMultipleTherapeuticAreas",
      therapeutic_areas,
      total_drugs: result.rows.length,
      drugs: result.rows,
    });
  } catch (error) {
    console.error("Error executing therapeutic areas query:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Query execution failed",
      error: error.message,
    });
  }
};

// Template 2: Get therapeutic trials by date range and status
const getTherapeuticTrialsByDateRange = async (req, res) => {
  const { user_id, start_date, end_date, status, therapeutic_area } =
    req.body || {};

  if (!user_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "user_id is required" });
  }

  if (!start_date || !end_date) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "start_date and end_date are required" });
  }

  try {
    let whereConditions = ["tto.created_at BETWEEN $1 AND $2"];
    let values = [start_date, end_date];
    let paramCount = 2;

    if (status) {
      paramCount++;
      whereConditions.push(`tto.status = $${paramCount}`);
      values.push(status);
    }

    if (therapeutic_area) {
      paramCount++;
      whereConditions.push(`tto.therapeutic_area ILIKE $${paramCount}`);
      values.push(`%${therapeutic_area}%`);
    }

    const query = `
      SELECT 
        tto.*,
        COUNT(tom.id) as outcome_count,
        COUNT(tpc.id) as criteria_count,
        COUNT(tt.id) as timing_count,
        COUNT(tr.id) as results_count
      FROM therapeutic_trial_overview tto
      LEFT JOIN therapeutic_outcome_measured tom ON tto.id = tom.trial_id
      LEFT JOIN therapeutic_participation_criteria tpc ON tto.id = tpc.trial_id
      LEFT JOIN therapeutic_timing tt ON tto.id = tt.trial_id
      LEFT JOIN therapeutic_results tr ON tto.id = tr.trial_id
      WHERE ${whereConditions.join(" AND ")}
      GROUP BY tto.id
      ORDER BY tto.created_at DESC
    `;

    const result = await pool.query(query, values);

    // Log the query execution
    await logUserActivity({
      user_id,
      table_name: "therapeutic_trial_overview",
      record_id: null,
      action_type: "QUERY_TEMPLATE",
      change_details: {
        template_name: "getTherapeuticTrialsByDateRange",
        start_date,
        end_date,
        status,
        therapeutic_area,
        rows_returned: result.rows.length,
      },
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: `Found ${result.rows.length} trials in specified date range`,
      query_template: "getTherapeuticTrialsByDateRange",
      date_range: { start_date, end_date },
      filters: { status, therapeutic_area },
      total_trials: result.rows.length,
      trials: result.rows,
    });
  } catch (error) {
    console.error("Error executing date range query:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Query execution failed",
      error: error.message,
    });
  }
};

// Template 3: Get drugs with approval status and company info
const getDrugsWithCompanyInfo = async (req, res) => {
  const { user_id, is_approved, company_name, therapeutic_area } =
    req.body || {};

  if (!user_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "user_id is required" });
  }

  try {
    let whereConditions = ["1=1"];
    let values = [];
    let paramCount = 0;

    if (is_approved !== undefined) {
      paramCount++;
      whereConditions.push(`do.is_approved = $${paramCount}`);
      values.push(is_approved);
    }

    if (company_name) {
      paramCount++;
      whereConditions.push(`dds.company ILIKE $${paramCount}`);
      values.push(`%${company_name}%`);
    }

    if (therapeutic_area) {
      paramCount++;
      whereConditions.push(`do.therapeutic_area ILIKE $${paramCount}`);
      values.push(`%${therapeutic_area}%`);
    }

    const query = `
      SELECT DISTINCT
        do.*,
        dds.company,
        dds.status as development_status,
        COUNT(da.id) as activity_count,
        COUNT(dd.id) as development_count
      FROM drug_overview do
      LEFT JOIN drug_dev_status dds ON do.id = dds.drug_over_id
      LEFT JOIN drug_activity da ON do.id = da.drug_over_id
      LEFT JOIN drug_development dd ON do.id = dd.drug_over_id
      WHERE ${whereConditions.join(" AND ")}
      GROUP BY do.id, dds.company, dds.status
      ORDER BY do.created_at DESC
    `;

    const result = await pool.query(query, values);

    // Log the query execution
    await logUserActivity({
      user_id,
      table_name: "drug_overview",
      record_id: null,
      action_type: "QUERY_TEMPLATE",
      change_details: {
        template_name: "getDrugsWithCompanyInfo",
        is_approved,
        company_name,
        therapeutic_area,
        rows_returned: result.rows.length,
      },
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: `Found ${result.rows.length} drugs matching criteria`,
      query_template: "getDrugsWithCompanyInfo",
      filters: { is_approved, company_name, therapeutic_area },
      total_drugs: result.rows.length,
      drugs: result.rows,
    });
  } catch (error) {
    console.error("Error executing company info query:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Query execution failed",
      error: error.message,
    });
  }
};

// Template 4: Get therapeutic trials with participant criteria
const getTrialsWithParticipantCriteria = async (req, res) => {
  const { user_id, age_min, age_max, sex, disease_type } = req.body || {};

  if (!user_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "user_id is required" });
  }

  try {
    let whereConditions = ["1=1"];
    let values = [];
    let paramCount = 0;

    if (age_min !== undefined) {
      paramCount++;
      whereConditions.push(`tpc.age_min >= $${paramCount}`);
      values.push(age_min);
    }

    if (age_max !== undefined) {
      paramCount++;
      whereConditions.push(`tpc.age_max <= $${paramCount}`);
      values.push(age_max);
    }

    if (sex) {
      paramCount++;
      whereConditions.push(`tpc.sex = $${paramCount}`);
      values.push(sex);
    }

    if (disease_type) {
      paramCount++;
      whereConditions.push(`tto.disease_type ILIKE $${paramCount}`);
      values.push(`%${disease_type}%`);
    }

    const query = `
      SELECT 
        tto.*,
        tpc.age_min,
        tpc.age_max,
        tpc.sex,
        tpc.inclusion_criteria,
        tpc.exclusion_criteria,
        COUNT(tom.id) as outcome_count,
        COUNT(tr.id) as results_count
      FROM therapeutic_trial_overview tto
      INNER JOIN therapeutic_participation_criteria tpc ON tto.id = tpc.trial_id
      LEFT JOIN therapeutic_outcome_measured tom ON tto.id = tom.trial_id
      LEFT JOIN therapeutic_results tr ON tto.id = tr.trial_id
      WHERE ${whereConditions.join(" AND ")}
      GROUP BY tto.id, tpc.age_min, tpc.age_max, tpc.sex, tpc.inclusion_criteria, tpc.exclusion_criteria
      ORDER BY tto.created_at DESC
    `;

    const result = await pool.query(query, values);

    // Log the query execution
    await logUserActivity({
      user_id,
      table_name: "therapeutic_trial_overview",
      record_id: null,
      action_type: "QUERY_TEMPLATE",
      change_details: {
        template_name: "getTrialsWithParticipantCriteria",
        age_range: { age_min, age_max },
        sex,
        disease_type,
        rows_returned: result.rows.length,
      },
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: `Found ${result.rows.length} trials matching participant criteria`,
      query_template: "getTrialsWithParticipantCriteria",
      filters: { age_min, age_max, sex, disease_type },
      total_trials: result.rows.length,
      trials: result.rows,
    });
  } catch (error) {
    console.error("Error executing participant criteria query:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Query execution failed",
      error: error.message,
    });
  }
};

// ==================== QUERY TEMPLATE LISTING ====================
const getAvailableQueryTemplates = async (req, res) => {
  const templates = [
    {
      name: "getDrugsByMultipleTherapeuticAreas",
      description:
        "Get drugs filtered by multiple therapeutic areas with related data counts",
      parameters: {
        therapeutic_areas: "Array of therapeutic area names",
        include_related_data: "Boolean to include full related data (optional)",
      },
      example: {
        therapeutic_areas: ["Oncology", "Cardiology"],
        include_related_data: true,
      },
    },
    {
      name: "getTherapeuticTrialsByDateRange",
      description:
        "Get therapeutic trials within a date range with optional filters",
      parameters: {
        start_date: "Start date (YYYY-MM-DD)",
        end_date: "End date (YYYY-MM-DD)",
        status: "Trial status (optional)",
        therapeutic_area: "Therapeutic area name (optional)",
      },
      example: {
        start_date: "2023-01-01",
        end_date: "2023-12-31",
        status: "Active",
        therapeutic_area: "Oncology",
      },
    },
    {
      name: "getDrugsWithCompanyInfo",
      description: "Get drugs with company information and development status",
      parameters: {
        is_approved: "Boolean for approval status (optional)",
        company_name: "Company name to search (optional)",
        therapeutic_area: "Therapeutic area name (optional)",
      },
      example: {
        is_approved: true,
        company_name: "Pfizer",
        therapeutic_area: "Oncology",
      },
    },
    {
      name: "getTrialsWithParticipantCriteria",
      description: "Get therapeutic trials with specific participant criteria",
      parameters: {
        age_min: "Minimum age (optional)",
        age_max: "Maximum age (optional)",
        sex: "Sex requirement (optional)",
        disease_type: "Disease type to search (optional)",
      },
      example: {
        age_min: 18,
        age_max: 65,
        sex: "Both",
        disease_type: "Cancer",
      },
    },
  ];

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Available query templates retrieved successfully",
    total_templates: templates.length,
    templates,
    usage_note:
      "Use these templates for common query patterns, or use executeCustomQuery for custom SQL",
  });
};

// ==================== SAVED QUERIES ====================

const saveQueryActivityRepository = new SaveQueryActivityRepository();

// Create a new saved query
const createSavedQuery = async (req, res) => {
  try {
    const { title, description, trial_id, user_id, query_type, query_data, filters } = req.body;

    if (!title) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Title is required"
      });
    }

    // For dashboard queries, user_id and trial_id can be null
    // For other query types, they are required
    if (!trial_id && query_type !== 'dashboard') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Trial ID is required for non-dashboard queries"
      });
    }

    if (!user_id && query_type !== 'dashboard') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "User ID is required for non-dashboard queries"
      });
    }

    const savedQuery = await saveQueryActivityRepository.create({
      title,
      description,
      trial_id,
      user_id,
      query_type,
      query_data,
      filters
    });

    // Log the activity
    await logUserActivity({
      user_id,
      table_name: "saved_queries",
      record_id: savedQuery.id,
      action_type: "CREATE",
      change_details: {
        title,
        trial_id,
        query_type: query_type || 'trial'
      }
    });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Query saved successfully",
      data: savedQuery
    });
  } catch (error) {
    console.error("Error creating saved query:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to save query",
      error: error.message
    });
  }
};

// Get all saved queries for a user
const getUserSavedQueries = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { include_trial_info, search, page, limit } = req.query;

    // Special case: get dashboard queries (null user_id)
    if (user_id === 'dashboard-queries') {
      let savedQueries;
      if (search) {
        savedQueries = await saveQueryActivityRepository.searchDashboardQueries(search);
      } else {
        savedQueries = await saveQueryActivityRepository.findDashboardQueries();
      }
      
      return res.status(StatusCodes.OK).json({
        success: true,
        data: savedQueries
      });
    }

    if (!user_id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "User ID is required"
      });
    }

    let savedQueries;

    if (search) {
      savedQueries = await saveQueryActivityRepository.searchByText(user_id, search);
    } else if (page && limit) {
      const offset = (parseInt(page) - 1) * parseInt(limit);
      savedQueries = await saveQueryActivityRepository.findPaginated(user_id, offset, parseInt(limit));
      const totalCount = await saveQueryActivityRepository.getTotalCount(user_id);
      
      return res.status(StatusCodes.OK).json({
        success: true,
        data: savedQueries,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit))
        }
      });
    } else if (include_trial_info === 'true') {
      savedQueries = await saveQueryActivityRepository.findWithTrialInfo(user_id);
    } else {
      savedQueries = await saveQueryActivityRepository.findByUserId(user_id);
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      data: savedQueries
    });
  } catch (error) {
    console.error("Error fetching saved queries:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to fetch saved queries",
      error: error.message
    });
  }
};

// Get a specific saved query by ID
const getSavedQueryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Query ID is required"
      });
    }

    const savedQuery = await saveQueryActivityRepository.findById(id);

    if (!savedQuery) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Saved query not found"
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      data: savedQuery
    });
  } catch (error) {
    console.error("Error fetching saved query:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to fetch saved query",
      error: error.message
    });
  }
};

// Update a saved query
const updateSavedQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, query_data, filters } = req.body;

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Query ID is required"
      });
    }

    const existingQuery = await saveQueryActivityRepository.findById(id);
    
    if (!existingQuery) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Saved query not found"
      });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (query_data !== undefined) updateData.query_data = query_data;
    if (filters !== undefined) updateData.filters = filters;

    const updatedQuery = await saveQueryActivityRepository.update(id, updateData);

    // Log the activity
    await logUserActivity({
      user_id: existingQuery.user_id,
      table_name: "saved_queries",
      record_id: id,
      action_type: "UPDATE",
      change_details: {
        updated_fields: Object.keys(updateData),
        old_title: existingQuery.title,
        new_title: title
      }
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Saved query updated successfully",
      data: updatedQuery
    });
  } catch (error) {
    console.error("Error updating saved query:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to update saved query",
      error: error.message
    });
  }
};

// Delete a saved query
const deleteSavedQuery = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Query ID is required"
      });
    }

    const existingQuery = await saveQueryActivityRepository.findById(id);
    
    if (!existingQuery) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Saved query not found"
      });
    }

    const deleted = await saveQueryActivityRepository.delete(id);

    if (!deleted) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Failed to delete saved query"
      });
    }

    // Log the activity
    await logUserActivity({
      user_id: existingQuery.user_id,
      table_name: "saved_queries",
      record_id: id,
      action_type: "DELETE",
      change_details: {
        deleted_title: existingQuery.title,
        trial_id: existingQuery.trial_id
      }
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Saved query deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting saved query:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to delete saved query",
      error: error.message
    });
  }
};

// Get saved queries for a specific trial
const getSavedQueriesByTrialId = async (req, res) => {
  try {
    const { trial_id } = req.params;

    if (!trial_id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Trial ID is required"
      });
    }

    const savedQueries = await saveQueryActivityRepository.findByTrialId(trial_id);

    return res.status(StatusCodes.OK).json({
      success: true,
      data: savedQueries
    });
  } catch (error) {
    console.error("Error fetching saved queries by trial ID:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to fetch saved queries for trial",
      error: error.message
    });
  }
};

module.exports = {
  // Raw SQL Query
  executeCustomQuery,

  // Pre-built Query Templates
  getDrugsByMultipleTherapeuticAreas,
  getTherapeuticTrialsByDateRange,
  getDrugsWithCompanyInfo,
  getTrialsWithParticipantCriteria,

  // Template Information
  getAvailableQueryTemplates,

  // Saved Queries
  createSavedQuery,
  getUserSavedQueries,
  getSavedQueryById,
  updateSavedQuery,
  deleteSavedQuery,
  getSavedQueriesByTrialId,
};
