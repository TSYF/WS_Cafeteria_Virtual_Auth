import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { UserDTO } from "../DTO/UserDTO";
import { Either, isLeft, left, right } from "../utils/either";
import { Request } from "express";
import { Auth as AdminAuth } from "firebase-admin/auth";
import { Auth } from "firebase/auth";
import { UserEither, curriedExists, curriedGetToken, curriedHasBearer, curriedVerifyToken, verifyToken } from "../utils/eitherUtils";
import { compose, curry } from "../utils/functionalUtils";
// import { refreshToken as fbRefreshToken } from "firebase-admin/app";

export class AuthController {

    private readonly TOKEN_KEYWORD = "Bearer ";
    private errorMessages = {
        "auth/missing-password": "Falta Contraseña",
        "auth/invalid-email": "Email Inválido",
        "auth/user-not-found": "Usuario no Existe",
        "auth/wrong-password": "Contraseña Incorrecta",
        "auth/email-already-in-use": "Email ya está en uso",
        "auth/operation-not-allowed": "Operación no Permitida",
        "auth/weak-password": "Contraseña Débil"
    };
    
    public constructor(
        private auth: AdminAuth | Auth,
    ) {}

    public async getUser(request: Request): Promise<UserEither> {
        const authorization = right(request.headers.authorization!)
        const auth = <AdminAuth>this.auth
        const kw = right(this.TOKEN_KEYWORD)

        const userDTO = await compose(
            curriedVerifyToken(auth, this.errorMessages),
            curriedGetToken(kw),
            curriedHasBearer(kw),
            curriedExists
        )(authorization)

        return userDTO
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

        try {
            let { user: fbUser } = await signInWithEmailAndPassword(auth, user.email!, user.password!);
            const token = await fbUser.getIdToken();
            const returnedUser = new UserDTO(undefined, fbUser.email!, undefined, token, fbUser.refreshToken);
            
            return right(returnedUser);
        } catch (error) {
            return left(this.errorMessages[error.code] ?? error.message);
        }
    }

    public async createUserWithEmailAndPassword(user: UserDTO): Promise<UserEither> {
        const auth = <Auth>this.auth;
        try {
            const { user: signedUser } = await createUserWithEmailAndPassword(auth, user.email!, user.password!);

            const { uid, email, getIdToken, refreshToken } = signedUser;
            const accessToken = await getIdToken()!;

            const userDTO = new UserDTO(uid, email!, undefined, accessToken, refreshToken);
            return right(userDTO);
        } catch (error) {
            return left(this.errorMessages[error.code] ?? error.message);
        }
    }

    public signOut(): void {
        const auth = <Auth>this.auth;
        signOut(auth);
    }
}