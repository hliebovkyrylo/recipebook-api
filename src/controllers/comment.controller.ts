import { User }                        from "@prisma/client";
import { type Request, type Response } from "express";
import { ICommentSchema }              from "../schemas/comment.schema";
import { commentService }              from "../services/comment.service";
import { CommentDTO }                  from "../dtos/comment.dto";

class CommentController {
  public async create(request: Request, response: Response) {
    const user     = request.user as User;
    const recipeId = request.params.recipeId;
    const data     = request.body as Omit<ICommentSchema, "authorUsername" | "authorImage">;

    const comments = await commentService.getCommentsByText(data.commentText, recipeId);

    if (comments.length > 4) {
      return response.status(409).send({
        code: "same-text",
        message: "You have posted more than 5 comments with the same text, please change it!"
      });
    }

    const comment = await commentService.createComment(
      { 
        ...data, 
        authorImage   : user.image, 
        recipeId      : recipeId,
        authorUsername: user.username 
      }
    );

    const commentDTO = new CommentDTO(comment);

    response.send(commentDTO);
  }
};

export const commentController = new CommentController();