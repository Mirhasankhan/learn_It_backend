
import { AdminRole } from "@prisma/client";
import prisma from "../shared/prisma";

const superAdminData = {
  name: "Muath Alwahibee",
  role: AdminRole.SuperAdmin,
  phoneNumber: "966555717867",
};

const seedSuperAdmin = async () => {
  try {
    // Check if a super admin already exists
    const isSuperAdminExists = await prisma.admin.findFirst({
      where: {
        role: AdminRole.SuperAdmin,
      },
    });

    // If not, create one
    if (!isSuperAdminExists) {
      await prisma.admin.create({
        data: superAdminData,
      });
      console.log("🦸 Super Admin created successfully.");
    } else {
      return;
    }
  } catch (error) {
    console.error("Error seeding Super Admin:", error);
  }
};

export default seedSuperAdmin;
