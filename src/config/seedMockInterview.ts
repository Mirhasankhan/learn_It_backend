import prisma from "../shared/prisma";

const mockInterviewData = {
  price: 120,
  serviceName: "Mock Interview",
  about: "sdf sdfsf",
  duration: "30 minutes",
  serviceImage:
    "https://nyc3.digitaloceanspaces.com/smtech-space/uploads/courses/class/serviceImage/1761629842040-p5pns5jbjq9.png",
};

const seedMockInterview = async () => {
  try {
    // Check if a super admin already exists
    const isMockServiceExists = await prisma.service.findFirst({
      where: {
        serviceType: "MockInterview",
      },
    });

    // If not, create one
    if (!isMockServiceExists) {
      await prisma.service.create({
        data: {
          about: mockInterviewData.about,
          duration: mockInterviewData.duration,
          serviceImage: mockInterviewData.serviceImage,
          serviceName: mockInterviewData.serviceName,
          serviceType: "MockInterview",
          price: mockInterviewData.price
        },
      });
      console.log("Mock interview service created successfully.");
    } else {       
      return;
    }
  } catch (error) {
    console.error("Error seeding Super Admin:", error);
  }
};

export default seedMockInterview;
