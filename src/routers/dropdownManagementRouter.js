const express = require('express');
const router = express.Router();

// Use shared database pool to prevent connection exhaustion
const { pool } = require('../infrastructure/PgDB/connect');

// Get all dropdown categories
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description, is_active, created_at, updated_at
      FROM dropdown_categories 
      WHERE is_active = true
      ORDER BY name
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching dropdown categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dropdown categories',
      error: error.message
    });
  }
});

// Get dropdown options by category
router.get('/options/:categoryName', async (req, res) => {
  try {
    const { categoryName } = req.params;
    
    const result = await pool.query(`
      SELECT o.id, o.value, o.label, o.description, o.sort_order, o.is_active, o.created_at, o.updated_at
      FROM dropdown_options o
      JOIN dropdown_categories c ON o.category_id = c.id
      WHERE c.name = $1 AND o.is_active = true AND c.is_active = true
      ORDER BY o.sort_order, o.label
    `, [categoryName]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching dropdown options:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dropdown options',
      error: error.message
    });
  }
});

// Get all dropdown options for management console
router.get('/options', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.id, 
        o.value, 
        o.label, 
        o.description, 
        o.sort_order, 
        o.is_active, 
        o.created_at, 
        o.updated_at,
        c.name as category_name,
        c.description as category_description
      FROM dropdown_options o
      JOIN dropdown_categories c ON o.category_id = c.id
      WHERE c.is_active = true AND o.is_active = true
      ORDER BY c.name, o.sort_order, o.label
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching all dropdown options:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dropdown options',
      error: error.message
    });
  }
});

// Create new dropdown category
router.post('/categories', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }
    
    const result = await pool.query(`
      INSERT INTO dropdown_categories (name, description)
      VALUES ($1, $2)
      RETURNING id, name, description, is_active, created_at, updated_at
    `, [name, description]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Category created successfully'
    });
  } catch (error) {
    console.error('Error creating dropdown category:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({
        success: false,
        message: 'Category name already exists'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to create category',
        error: error.message
      });
    }
  }
});

// Create new dropdown option
router.post('/options', async (req, res) => {
  try {
    const { categoryName, value, label, description, sortOrder } = req.body;
    
    if (!categoryName || !value || !label) {
      return res.status(400).json({
        success: false,
        message: 'Category name, value, and label are required'
      });
    }
    
    // First get the category ID
    const categoryResult = await pool.query(`
      SELECT id FROM dropdown_categories WHERE name = $1 AND is_active = true
    `, [categoryName]);
    
    if (categoryResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    const categoryId = categoryResult.rows[0].id;
    
    const result = await pool.query(`
      INSERT INTO dropdown_options (category_id, value, label, description, sort_order)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, value, label, description, sort_order, is_active, created_at, updated_at
    `, [categoryId, value, label, description, sortOrder || 0]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Option created successfully'
    });
  } catch (error) {
    console.error('Error creating dropdown option:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({
        success: false,
        message: 'Option value already exists for this category'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to create option',
        error: error.message
      });
    }
  }
});

// Update dropdown option
router.put('/options/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { value, label, description, sortOrder, isActive } = req.body;
    
    const result = await pool.query(`
      UPDATE dropdown_options 
      SET value = $1, label = $2, description = $3, sort_order = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING id, value, label, description, sort_order, is_active, created_at, updated_at
    `, [value, label, description, sortOrder, isActive, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Option not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Option updated successfully'
    });
  } catch (error) {
    console.error('Error updating dropdown option:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({
        success: false,
        message: 'Option value already exists for this category'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to update option',
        error: error.message
      });
    }
  }
});

// Delete dropdown option (soft delete)
router.delete('/options/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE dropdown_options 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, value, label, is_active
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Option not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Option deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting dropdown option:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete option',
      error: error.message
    });
  }
});

// Update dropdown category
router.put('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;
    
    const result = await pool.query(`
      UPDATE dropdown_categories 
      SET name = $1, description = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, name, description, is_active, created_at, updated_at
    `, [name, description, isActive, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Category updated successfully'
    });
  } catch (error) {
    console.error('Error updating dropdown category:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({
        success: false,
        message: 'Category name already exists'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to update category',
        error: error.message
      });
    }
  }
});

// Delete dropdown category (soft delete)
router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE dropdown_categories 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, is_active
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting dropdown category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message
    });
  }
});

module.exports = router;
