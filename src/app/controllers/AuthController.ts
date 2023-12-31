import { signOut } from "firebase/auth";
import { UserDTO } from "../DTO/UserDTO";
import { right } from "../utils/either";
import { Request } from "express";
import { Auth as AdminAuth } from "firebase-admin/auth";
import { Auth } from "firebase/auth";
import { UserEither, cExists, cGetToken, cHasBearer, cVerifyToken, createUser, signIn, verifyToken } from "../utils/eitherUtils";
import { compose } from "../utils/functionalUtils";
import { ErrorMessages } from "../interfaces/ErrorMessages";
// import { refreshToken as fbRefreshToken } from "firebase-admin/app";

export class AuthController {

    private readonly TOKEN_KEYWORD = "Bearer ";
    private errorMessages: ErrorMessages = {
        "auth/missing-password"     : "Falta Contraseña",
        "auth/invalid-email"        : "Email Inválido",
        "auth/user-not-found"       : "Usuario no Existe",
        "auth/wrong-password"       : "Contraseña Incorrecta",
        "auth/email-already-in-use" : "Email ya está en uso",
        "auth/operation-not-allowed": "Operación no Permitida",
        "auth/weak-password"        : "Contraseña Débil"
    };
    
    public constructor(
        private auth: AdminAuth | Auth,
    ) {}

    public async getUser(request: Request): Promise<UserEither> {
        const authorization = right(request.headers.authorization!)
        const auth = <AdminAuth>this.auth
        const kw = right(this.TOKEN_KEYWORD)

        return await compose(
            cVerifyToken(auth, this.errorMessages),
            cGetToken(kw),
            cHasBearer(kw),
            cExists
        )(authorization)
    }

    public async verify(user: UserDTO): Promise<UserEither> {
        const auth = <AdminAuth>this.auth
        const token = right(user.accessToken!)
        
        const userDTO = await verifyToken(auth, this.errorMessages, token)
        return userDTO
    }

    // public async refresh(user: UserDTO): Promise<UserEither> {
    //     const auth = <Auth>this.auth;
        
    //     try {
    //         const { uid, email } = await (user.accessToken!)
    //         const userDTO = new UserDTO(uid, email);
    //         return right(userDTO);
    //     } catch (error) {
    //         return left(this.errorMessages[error.code] ?? error.message);
    //     }
    // }
    
    public async signInWithEmailAndPassword(user: UserDTO): Promise<UserEither> {
        const auth = <Auth>this.auth;

        return await signIn(auth, this.errorMessages, right(user))
    }
    
    public async createUserWithEmailAndPassword(user: UserDTO): Promise<UserEither> {
        const auth = <Auth>this.auth;
        
        return await createUser(auth, this.errorMessages, right(user))
    }

    public signOut(): void {
        const auth = <Auth>this.auth;
        signOut(auth);
    }
}