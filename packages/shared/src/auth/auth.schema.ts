import { password } from "bun"
import * as z from "zod"

export const SignupSchema = z.object({
    username:z.string().max(20),
    password:z.string().min(8).max(30),
    email:z.email()
})
export const SigninSchema = z.object({
    email:z.email(),
    password:z.string().min(8).max(30)
})