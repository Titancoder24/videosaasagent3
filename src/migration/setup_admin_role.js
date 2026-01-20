const {
  pool,
  connect_PgSQL_DB,
} = require("../infrastructure/PgDB/connect");
const { RoleRepository } = require("../repositories/roleRepository");
const { UserRoleRepository } = require("../repositories/userRoleRepository");
require("dotenv").config();

async function setupAdminRole() {
  try {
    console.log("🔄 Connecting to database...");
    await connect_PgSQL_DB();

    // Create base tables if they don't exist
    console.log("📋 Checking for required tables...");
    await pool.query(`
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
    `);
    console.log("✅ Required tables verified/created");

    const roleRepo = new RoleRepository();
    const userRoleRepo = new UserRoleRepository();

    // Step 1: Create or get "Admin" role (capital A to match frontend)
    console.log("📋 Checking for 'Admin' role...");
    let adminRole = await roleRepo.findByName("Admin");

    if (!adminRole) {
      // Check if lowercase "admin" exists and update it
      const lowercaseAdmin = await roleRepo.findByName("admin");
      if (lowercaseAdmin) {
        console.log("🔄 Found lowercase 'admin' role, updating to 'Admin'...");
        adminRole = await roleRepo.update(lowercaseAdmin.id, "Admin");
        console.log(`✅ Updated role to 'Admin' with ID: ${adminRole.id}`);
      } else {
        console.log("➕ Creating 'Admin' role...");
        adminRole = await roleRepo.create("Admin");
        console.log(`✅ Created 'Admin' role with ID: ${adminRole.id}`);
      }
    } else {
      console.log(`✅ 'Admin' role already exists with ID: ${adminRole.id}`);
    }

    // Step 2: Get admin user
    console.log("👤 Finding admin user...");
    const adminUserResult = await pool.query(
      "SELECT id, username, email FROM users WHERE email = $1 OR username = $2",
      ["admin@trialbyte.com", "admin"]
    );

    if (adminUserResult.rows.length === 0) {
      console.error("❌ Admin user not found. Please run 'npm run create-admin' first.");
      await pool.end();
      process.exit(1);
    }

    const adminUser = adminUserResult.rows[0];
    console.log(`✅ Found admin user: ${adminUser.username} (${adminUser.email})`);

    // Step 3: Check if role is already assigned
    console.log("🔍 Checking existing role assignments...");
    const existingRoles = await userRoleRepo.getUserRoles(adminUser.id);

    const hasAdminRole = existingRoles.some(
      (role) => role.role_id === adminRole.id
    );

    if (hasAdminRole) {
      console.log("✅ Admin user already has 'Admin' role assigned.");
    } else {
      // Step 4: Assign Admin role to admin user
      console.log("🔗 Assigning 'Admin' role to admin user...");
      const assignment = await userRoleRepo.assignRole(
        adminUser.id,
        adminRole.id
      );

      if (assignment) {
        console.log("✅ Successfully assigned 'Admin' role to admin user!");
        console.log(`   Assignment ID: ${assignment.id}`);
      } else {
        console.log("⚠️  Role assignment already exists (no action needed).");
      }
    }

    // Step 5: Display final status
    console.log("\n📊 Final Status:");
    const finalRoles = await userRoleRepo.getUserRoles(adminUser.id);
    console.log(`   User: ${adminUser.username} (${adminUser.email})`);
    console.log(`   Roles assigned:`);
    if (finalRoles.length > 0) {
      finalRoles.forEach((role) => {
        console.log(`     - ${role.role_name} (ID: ${role.role_id})`);
      });
    } else {
      console.log(`     - No roles assigned`);
    }

    // Close the connection
    await pool.end();
    console.log("\n🔌 Database connection closed.");
  } catch (error) {
    console.error("❌ Failed to setup admin role:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupAdminRole();
}

module.exports = { setupAdminRole };

