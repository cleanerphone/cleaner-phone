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
  
  const existingUser1 = await storage.getUserByUsername("user1");
  if (!existingUser1) {
    await storage.createUser({
      username: "user1",
      password: "user123",
      displayName: "John Doe",
      companyId: "CLEANER-001",
      role: "user",
    });
    console.log("Created test user 1");
  }
  
  const existingUser2 = await storage.getUserByUsername("user2");
  if (!existingUser2) {
    await storage.createUser({
      username: "user2",
      password: "user123",
      displayName: "Jane Smith",
      companyId: "CLEANER-001",
      role: "user",
    });
    console.log("Created test user 2");
  }
  
  console.log("Seeding complete!");
}

seed().catch(console.error);
