const {
  pool,
  connect_PgSQL_DB,
} = require("../infrastructure/PgDB/connect");
const { UserRepository } = require("../repositories/userRepository");
const { RoleRepository } = require("../repositories/roleRepository");
const { UserRoleRepository } = require("../repositories/userRoleRepository");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const usersToCreate = [
  {
    username: "pravin",
    email: "pravin@trialbyte.com",
    password: "pravin@123",
    company: "TrialByte",
    designation: "Administrator",
  },
  {
    username: "saraswathi",
    email: "saraswathi@trialbyte.com",
    password: "saraswathi@123",
    company: "TrialByte",
    designation: "Administrator",
  },
  {
    username: "suthiksha",
    email: "suthiksha@trialbyte.com",
    password: "suthiksha@123",
    company: "TrialByte",
    designation: "Administrator",
  },
  {
    username: "padmapooja",
    email: "padmapooja@trialbyte.com",
    password: "padmapooja@123",
    company: "TrialByte",
    designation: "Administrator",
  },
];

async function createUsers() {
  try {
    console.log("🔄 Connecting to database...");
    await connect_PgSQL_DB();

    const userRepo = new UserRepository();
    const roleRepo = new RoleRepository();
    const userRoleRepo = new UserRoleRepository();

    // Get or create "Admin" role
    console.log("\n📋 Checking for 'Admin' role...");
    let adminRole = await roleRepo.findByName("Admin");

    if (!adminRole) {
      console.log("➕ Creating 'Admin' role...");
      adminRole = await roleRepo.create("Admin");
      console.log(`✅ Created 'Admin' role with ID: ${adminRole.id}`);
    } else {
      console.log(`✅ 'Admin' role already exists with ID: ${adminRole.id}`);
    }

    // Get "User" role for removal if needed
    const userRole = await roleRepo.findByName("User");

    console.log("\n👥 Creating users...\n");

    for (const userData of usersToCreate) {
      try {
        // Check if user already exists
        const existingUser = await userRepo.findByEmail(userData.email);
        
        if (existingUser) {
          console.log(`⏭️  User already exists: ${userData.username} (${userData.email})`);
          
          // Get existing roles
          const existingRoles = await userRoleRepo.getUserRoles(existingUser.id);
          const hasAdminRole = existingRoles.some(
            (role) => role.role_id === adminRole.id
          );
          const hasUserRole = userRole && existingRoles.some(
            (role) => role.role_id === userRole.id
          );
          
          // Remove User role if present
          if (hasUserRole && userRole) {
            console.log(`   🔄 Removing 'User' role...`);
            await userRoleRepo.removeRole(existingUser.id, userRole.id);
            console.log(`   ✅ 'User' role removed.`);
          }
          
          // Assign Admin role if not already assigned
          if (!hasAdminRole) {
            console.log(`   🔗 Assigning 'Admin' role...`);
            await userRoleRepo.assignRole(existingUser.id, adminRole.id);
            console.log(`   ✅ 'Admin' role assigned successfully!`);
          } else {
            console.log(`   ✅ 'Admin' role already assigned.`);
          }
          continue;
        }

        // Create new user
        console.log(`➕ Creating user: ${userData.username}...`);
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        const createdUser = await userRepo.create({
          username: userData.username,
          email: userData.email,
          password: hashedPassword,
          company: userData.company,
          designation: userData.designation,
        });

        console.log(`   ✅ User created successfully!`);
        console.log(`      Username: ${createdUser.username}`);
        console.log(`      Email: ${createdUser.email}`);
        console.log(`      ID: ${createdUser.id}`);

        // Assign Admin role
        console.log(`   🔗 Assigning 'Admin' role...`);
        const assignment = await userRoleRepo.assignRole(
          createdUser.id,
          adminRole.id
        );

        if (assignment) {
          console.log(`   ✅ 'Admin' role assigned successfully!`);
        }

        console.log(`   🔐 Login Credentials:`);
        console.log(`      Email: ${userData.email}`);
        console.log(`      Password: ${userData.password}`);
        console.log("");

      } catch (error) {
        console.error(`   ❌ Failed to create user ${userData.username}:`, error.message);
        continue;
      }
    }

    // Display summary
    console.log("\n📊 Summary:");
    for (const userData of usersToCreate) {
      const user = await userRepo.findByEmail(userData.email);
      if (user) {
        const roles = await userRoleRepo.getUserRoles(user.id);
        console.log(`   ${user.username}: ${user.email} - Roles: ${roles.map(r => r.role_name).join(", ") || "None"}`);
      }
    }

    // Close the connection
    await pool.end();
    console.log("\n🔌 Database connection closed.");
    console.log("\n✅ All users created successfully!");
  } catch (error) {
    console.error("❌ Failed to create users:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createUsers();
}

module.exports = { createUsers };

