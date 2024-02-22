import { prisma }              from "..";
import { ICreateRecipeSchema, IUpdateRecipeSchema } from "../schemas/recipe.schema";

class RecipeService {
  public async createRecipe(data: Omit<ICreateRecipeSchema, "id">) {
    return await prisma.recipe.create({ data });
  };

  public async getRecipeById(recipeId: string) {
    return await prisma.recipe.findFirst({
      where: {
        id: recipeId,
      },
    });
  };

  public async updateRecipe(recipeId: string, data: IUpdateRecipeSchema) {
    return await prisma.recipe.update({
      where: {
        id: recipeId,
      },
      data: data,
    });
  };

  public async deleteRecipe(recipeId: string) {
    return await prisma.recipe.delete({
      where: {
        id: recipeId,
      },
    });
  };

  public async getLikedRecipesByUserId(userId: string) {
    const liked = await prisma.like.findMany({
      where: {
        userId: userId,
      },
      select: {
        recipeId: true,
      },
    });

    const recipeIds = liked.map(id => id.recipeId);

    return await prisma.recipe.findMany({
      where: {
        id: {
          in: recipeIds,
        },
      },
    });
  };
};

export const recipeService = new RecipeService();