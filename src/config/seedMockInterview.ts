import prisma from "../shared/prisma";

const mockInterviewData = {
  price: 120,
  serviceName: "Mock Interview",
  about: "sdf sdfsf",
  duration: "30 minutes",
  serviceImage:
    "https://plus.unsplash.com/premium_photo-1733342492614-21ae0fe15efc?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8b25saW5lJTIwaW50ZXJ2aWV3fGVufDB8fDB8fHww",
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
