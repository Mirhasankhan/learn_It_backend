import prisma from "../shared/prisma";

export const handleRecentSearch = async (searchTerm: string, userId: string) => {
  const existingSearch = await prisma.recentSearch.findFirst({
    where: {
      userId,
      searchTerm: {
        equals: searchTerm,
        mode: "insensitive",
      },
    },
  });

  if (existingSearch) {
    return;
  }

  await prisma.recentSearch.create({
    data: {
      userId,
      searchTerm,
    },
  });
  
};