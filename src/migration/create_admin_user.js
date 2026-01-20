const {
  pool,
  connect_PgSQL_DB,
} = require("../infrastructure/PgDB/connect");
const { UserRepository } = require("../repositories/userRepository");
const { RoleRepository } = require("../repositories/roleRepository");
const { UserRoleRepository } = require("../repositories/userRoleRepository");
const bcrypt = require("bcryptjs");
require("dotenv").config();

async function createAdminUser() {
  try {
    console.log("🔄 Connecting to database...");
    await connect_PgSQL_DB();

    const userRepo = new UserRepository();
    const roleRepo = new RoleRepository();
    const userRoleRepo = new UserRoleRepository();

    // Check if admin user already exists
    console.log("👤 Checking for existing admin user...");
    const existingUser = await userRepo.findByEmail("admin@trialbyte.com");
    
    if (existingUser) {
      console.log("✅ Admin user already exists:");
      console.log(`   Username: ${existingUser.username}`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   ID: ${existingUser.id}`);
      
      // Check if Admin role exists and assign it
      const adminRole = await roleRepo.findByName("Admin");
      if (adminRole) {
        const existingRoles = await userRoleRepo.getUserRoles(existingUser.id);
        const hasAdminRole = existingRoles.some(
          (role) => role.role_id === adminRole.id
        );
        
        if (!hasAdminRole) {
          console.log("🔗 Assigning 'Admin' role to existing user...");
          await userRoleRepo.assignRole(existingUser.id, adminRole.id);
          console.log("✅ Admin role assigned successfully!");
        } else {
          console.log("✅ Admin role already assigned.");
        }
      }
      
      await pool.end();
      return;
    }

    // Create admin user
    console.log("➕ Creating admin user...");
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    const adminUser = await userRepo.create({
      username: "admin",
      email: "admin@trialbyte.com",
      password: hashedPassword,
      company: "TrialByte",
      designation: "Administrator",
      plan: "admin"
    });

    console.log("✅ Admin user created successfully!");
    console.log(`   Username: ${adminUser.username}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Password: admin123`);

    // Get or create Admin role
    console.log("\n📋 Checking for 'Admin' role...");
    let adminRole = await roleRepo.findByName("Admin");

    if (!adminRole) {
      console.log("➕ Creating 'Admin' role...");
      adminRole = await roleRepo.create("Admin");
      console.log(`✅ Created 'Admin' role with ID: ${adminRole.id}`);
    } else {
      console.log(`✅ 'Admin' role already exists with ID: ${adminRole.id}`);
    }

    // Assign Admin role to admin user
    console.log("\n🔗 Assigning 'Admin' role to admin user...");
    const assignment = await userRoleRepo.assignRole(
      adminUser.id,
      adminRole.id
    );

    if (assignment) {
      console.log("✅ Successfully assigned 'Admin' role to admin user!");
      console.log(`   Assignment ID: ${assignment.id}`);
    }

    // Display final status
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

    console.log("\n🔐 Login Credentials:");
    console.log(`   Email: admin@trialbyte.com`);
    console.log(`   Password: admin123`);

    // Close the connection
    await pool.end();
    console.log("\n🔌 Database connection closed.");
  } catch (error) {
    console.error("❌ Failed to create admin user:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createAdminUser();
}

module.exports = { createAdminUser };

