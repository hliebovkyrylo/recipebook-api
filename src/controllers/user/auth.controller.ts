import { 
  type Request, 
  type Response 
}                            from "express";
import crypto                from "crypto";
import bcrypt                from "bcrypt";
import { 
  IChangePasswordSchema,
  ISignInSchema, 
  ISignUpSchema 
}                            from "../../schemas/auth.schema";
import { userService }       from "../../services/user/user.service";
import { authService }       from "../../services/user/auth.service";
import { createAccessToken } from "../../utils/token";
import { User }              from "@prisma/client";

class AuthController {
  public async signUp(request: Request, response: Response) {
    const data = request.body as ISignUpSchema;

    const userWithSuchEmail    = await userService.getUserByEmail(data.email);
    const userWithSuchUsername = await userService.getUserByUsername(data.username);

    if (userWithSuchEmail !== null) {
      response.status(409).send({
        code   : "email-already-exist",
        message: "Such email already exist!"
      });
    }

    if (userWithSuchUsername !== null) {
      response.status(409).send({
        code   : "username-already-exist",
        message: "Such username already exist!"
      });
    }

    const password    = await bcrypt.hash(data.password, 8);
    const user        = await authService.SignUp({ ...data, password });
    const accessToken = createAccessToken(user.id);

    response.send({ accessToken });
  };

  public async signIn(request: Request, response: Response) {
    const data = request.body as ISignInSchema;

    const user = await userService.getUserByEmail(data.email);

    if (user === null) {
      response.status(404).send({
        code   : "user-not-found",
        message: "This account was not found!"
      })
    }

    const isCorrectPassword = user && (await bcrypt.compare(data.password, user.password));

    if (!isCorrectPassword) {
      response.status(401).send({
        code   : "wrong-data",
        message: "The entered data is not valid"
      });
    }

    const accessToken = user && (createAccessToken(user.id));

    response.send({ accessToken });
  };

  public async sendConfirmationCode(request: Request, response: Response) {
    const user = request.user as User;

    const code       = crypto.randomInt(100000, 999999).toString();
    const hashedCode = await bcrypt.hash(code, 8);

    const isCodeAlreadyExist = await authService.GetVerificationCodeByUserId(user.id);

    if (isCodeAlreadyExist !== null) {
      await authService.DeleteVerficationCode(isCodeAlreadyExist.id);
    }

    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 10);

    await authService.CreateCode({ userId: user.id, code: hashedCode, expiryTime: expiryTime.getTime() });
    await authService.SendCode(user.email, code);

    response.send("Code sent!");
  };

  public async resendConfirmationCode(request: Request, response: Response) {
    const user = request.user as User;

    const oldCode = user && await authService.GetVerificationCodeByUserId(user.id);

    if (!oldCode) {
      return response.status(404).send({
        code   : "failed-to-get-code",
        message: "Failed to get code!",
      });
    }

    await authService.DeleteVerficationCode(oldCode.id);

    const code       = crypto.randomInt(100000, 999999).toString();
    const hashedCode = await bcrypt.hash(code, 8);

    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 10);

    await authService.CreateCode({ userId: user.id, code: hashedCode, expiryTime: expiryTime.getDate() });
    await authService.SendCode(user.email, code);

    response.send("Code sent!");
  };

  public async verifyEmail(request: Request, response: Response) {
    const user       = request.user as User;
    const verifyCode = request.body.code as string;

    const trueVerificationCode = user && await authService.GetVerificationCodeByUserId(user.id);

    if (!trueVerificationCode) {
      return response.status(404).send({
        code   : "code-not-found",
        message: "Code not found!"
      });
    }

    const isCorrectCode = await bcrypt.compare(verifyCode, trueVerificationCode.code);

    if (!isCorrectCode) {
      return response.status(401).send({
        code   : "wrong-entered-code",
        message: "Wrong entered code!",
      });
    } 

    if (user.isVerified) {
      await authService.DeleteVerficationCode(trueVerificationCode.id);
      return response.status(400).send({
        code   : "account-already-verified",
        message: "Your account is already verified!"
      });
    }

    await authService.UpdateEmailStatus(user.id);
    await authService.DeleteVerficationCode(trueVerificationCode.id);

    response.send("Your account is verified!");
  };

  public async changePassword(request: Request, response: Response) {
    const user = request.user as User;
    const data = request.body as IChangePasswordSchema;

    const isMatch = await bcrypt.compare(data.oldPassword, user.password);

    if (!isMatch) {
      return response.status(401).send({
        code   : "password-mismatch",
        message: "Password mismatch!",
      });
    }

    const hashedNewPassword = await bcrypt.hash(data.newPassword, 8);

    await userService.updatePassword(user.id, hashedNewPassword);

    response.send("Password changed!");
  };

  public async canResetPassword(request: Request, response: Response) {
    const user = request.user as User;
    const code = request.body.code as string;

    const trueCode = user && await authService.GetVerificationCodeByUserId(user.id);

    if (!trueCode) {
      return response.status(404).send({
        code   : "code-not-found",
        message: "Code not found!",
      });
    }

    const isMatch = await bcrypt.compare(code, trueCode.code);

    if (isMatch === false) {
      response.status(401).send({
        code   : "code-mismatch",
        message: "Code missmatch!",
      });
    }

    await userService.allowResetPassword(user.id);
    await authService.DeleteVerficationCode(trueCode.id);

    response.send("The code is correct!");
  };

  public async resetPassword(request: Request, response: Response) {
    const user     = request.user as User;
    const password = request.body.password;
  
    const hashedNewPassword = await bcrypt.hash(password, 8);

    if (user.canResetPassword === false) {
      return response.status(403).send({
        code   : "Forbidden",
        message: "No rights to reset password!",
      });
    }

    await userService.updatePassword(user.id, hashedNewPassword);
    await userService.prohibitResetPassword(user.id);

    response.send("Password successfully restored");
  };
};

export const authController = new AuthController();