import { storage } from "./storage";

async function seed() {
  console.log("Seeding database...");
  
  const existingAdmin = await storage.getUserByUsername("su_per_admin");
  if (!existingAdmin) {
    await storage.createUser({
      username: "su_per_admin",
      password: "@Su_per_@admin",
      displayName: "Super Admin",
      companyId: "CLEANER-001",
      role: "super_admin",
    });
    console.log("Created super admin user");
  } else {
    console.log("Super admin already exists");
  }
  
  console.log("Seeding complete!");
}

seed().catch(console.error);
