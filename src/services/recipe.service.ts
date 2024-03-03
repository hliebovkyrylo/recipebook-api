import {
  ICreateRecipeSchema,
  ICreateVisitedRedcipe,
  IUpdateRecipeSchema
}                         from "../schemas/recipe.schema";
import { prisma }         from "..";
import { likeService } from "./like.service";
import { saveService } from "./save.service";
import { stepService } from "./step.service";
import { commentService } from "./comment.service";

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
    const [recipeLikes, recipeSaved, recipeSteps, recipeComments] = await Promise.all([
      likeService.getLikesByRecipeId(recipeId),
      saveService.getSavedByRecipeId(recipeId),
      stepService.getStepsByRecipeId(recipeId),
      commentService.getCommentsByRecipeId(recipeId),
    ]);
  
    if (recipeLikes) {
      await likeService.deleteLikes(recipeLikes.map(like => like.id));
    }
  
    if (recipeSaved) {
      await saveService.deleteAllSavedById(recipeSaved.map(save => save.id));
    }
  
    if (recipeSteps) {
      await stepService.deleteStepsByIds(recipeSteps.map(step => step.id));
    }
  
    if (recipeComments) {
      await commentService.deleteCommentsByIds(recipeComments.map(comment => comment.id));
    }
  
    return await prisma.recipe.delete({
      where: {
        id: recipeId,
      },
    });
  }  

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

  public async getRecommendedRecipesByKeyword(keyword: string) {
    return await prisma.recipe.findMany({
      where: {
        title: {
          contains: keyword,
        },
      },
      take: 16,
    });
  };

  public async getPopularRecipes() {
    const recipes = await prisma.recipe.findMany();

    return await Promise.all(recipes.map(async (recipe) => {
      const likesCount = await prisma.like.count({
        where: {
          recipeId: recipe.id,
        },
      });

      return { ...recipe, likesCount };
    }));
  };

  public async createVisitedRecipe(data: Omit<ICreateVisitedRedcipe, "id">) {
    return await prisma.visited.create({ data });
  };

  public async getVisitedRecipeByIds(recipeId: string, userId: string) {
    return await prisma.visited.findFirst({
      where: {
        userId: userId,
        recipeId: recipeId,
      },
    });
  }; 

  public async getVisitedRecipes(userId: string) {
    return await prisma.visited.findMany({
      where: {
        userId: userId,
      },
    });
  };

  public async getRecipesByIds(recipeIds: string[]) {
    return await prisma.recipe.findMany({
      where: {
        id: {
          in: recipeIds
        }
      },
    });
  };
};

export const recipeService = new RecipeService();